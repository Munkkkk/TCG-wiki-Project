import { Readable, PassThrough, pipeline } from 'node:stream';
import { createInterface } from 'node:readline';
import bz2 from 'unbzip2-stream';
import { JEU } from '../../config/jeu.js';
import { lots } from '../../utils/lots.js';
import { moisPrecedents } from './sources.js';

export function urlDumpMensuel(mois) {
  const [annee, mm] = mois.split('-');
  return `https://dumps.wikimedia.org/other/pageview_complete/monthly/${annee}/${mois}/pageviews-${annee}${mm}-user.bz2`;
}

export function parserLigneDump(ligne) {
  if (!ligne.startsWith('fr.wikipedia ')) return null;
  const champs = ligne.split(' ');
  const vues = Number(champs[4]);
  if (champs.length < 5 || !Number.isFinite(vues)) return null;
  return { titre: champs[1].replace(/_/g, ' '), vues };
}

export async function importerMois(db, mois, lignes, seuil) {
  const totaux = new Map();
  for await (const ligne of lignes) {
    const entree = parserLigneDump(ligne);
    if (entree) totaux.set(entree.titre, (totaux.get(entree.titre) ?? 0) + entree.vues);
  }
  const retenus = [...totaux].filter(([titre, v]) => v >= seuil && titre.length <= 255);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM vues_mensuelles WHERE mois = ?', [mois]);
    for (const lot of lots(retenus, 5000)) {
      await conn.query('INSERT INTO vues_mensuelles (mois, titre, vues) VALUES ?', [lot.map(([t, v]) => [mois, t, v])]);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return retenus.length;
}

export async function lignesDepuisUrl(url, { userAgent = process.env.WIKI_USER_AGENT, fetchFn = fetch } = {}) {
  if (!userAgent) throw new Error('WIKI_USER_AGENT manquant (politique Wikimedia)');
  const rep = await fetchFn(url, { headers: { 'User-Agent': userAgent } });
  if (!rep.ok) throw new Error(`Dump indisponible (${rep.status}) : ${url}`);
  // pipeline propage les erreurs (réseau, bz2) : la sortie est détruite et la lecture des lignes rejette.
  const decompresse = new PassThrough();
  pipeline(Readable.fromWeb(rep.body), bz2(), decompresse, () => {});
  return createInterface({ input: decompresse, crlfDelay: Infinity });
}

/** Source de production. Le premier lancement télécharge 12 mois (plusieurs heures), les suivants un seul. */
export async function vuesDepuisDumps(db, maintenant, {
  nbMois = 12, seuil = JEU.catalogue.seuilVuesMensuelles, ouvrirLignes = lignesDepuisUrl, log = console.log,
} = {}) {
  const mois = moisPrecedents(maintenant, nbMois);
  const [presents] = await db.query('SELECT DISTINCT mois FROM vues_mensuelles WHERE mois IN (?)', [mois]);
  const dejaLa = new Set(presents.map((p) => p.mois));
  for (const m of mois.filter((x) => !dejaLa.has(x))) {
    log(`Import des vues ${m}…`);
    log(`${await importerMois(db, m, await ouvrirLignes(urlDumpMensuel(m)), seuil)} titres importés pour ${m}.`);
  }
  await db.query('DELETE FROM vues_mensuelles WHERE mois NOT IN (?)', [mois]);
  const [lignes] = await db.query(
    'SELECT titre, SUM(vues) AS vues FROM vues_mensuelles WHERE mois IN (?) GROUP BY titre', [mois],
  );
  return new Map(lignes.map((l) => [l.titre, Number(l.vues)]));
}
