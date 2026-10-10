import { lots } from '../../utils/lots.js';
import { estTitreCandidat, estArticleValide } from './filtres.js';
import { percentiles, versStat, calculerDefense, raretePourRang } from './stats.js';
import { typeDepuisP31, determinerType } from './types.js';

const TRANCHE = 500;

export async function construireCatalogue({
  db, client, vues, n, longueurMin, parts, maintenant = new Date(), log = console.log,
}) {
  const candidats = [...vues.entries()]
    .map(([titre, v]) => ({ titre: titre.replace(/_/g, ' '), vues: v }))
    .filter((c) => estTitreCandidat(c.titre))
    .sort((a, b) => b.vues - a.vues);

  const gardes = [];
  const dejaVus = new Set();
  for (let i = 0; i < candidats.length && gardes.length < n; i += TRANCHE) {
    const tranche = candidats.slice(i, i + TRANCHE);
    const vuesParTitre = new Map(tranche.map((c) => [c.titre, c.vues]));
    for (const meta of await client.metadonnees(tranche.map((c) => c.titre))) {
      if (!estArticleValide(meta, longueurMin) || dejaVus.has(meta.pageId)) continue;
      dejaVus.add(meta.pageId);
      gardes.push({ ...meta, vues: vuesParTitre.get(meta.titre) ?? 0 });
    }
    log(`Métadonnées : ${Math.min(i + TRANCHE, candidats.length)}/${candidats.length} candidats, ${gardes.length} retenus`);
  }
  gardes.sort((a, b) => b.vues - a.vues);
  gardes.length = Math.min(gardes.length, n);
  if (!gardes.length) throw new Error('Aucun article retenu : catalogue inchangé.');

  const ids = gardes.map((g) => g.pageId);
  log('Extraits, labels et liens externes…');
  const extraits = await client.extraits(ids);
  const labels = await client.labels(ids);
  const liens = await client.liensExternes(ids);
  log('Natures Wikidata…');
  const natures = await client.natures(gardes.map((g) => g.wikidata).filter(Boolean));
  const sansType = gardes.filter((g) => !typeDepuisP31(natures.get(g.wikidata) ?? []));
  const categories = sansType.length ? await client.categories(sansType.map((g) => g.pageId)) : new Map();

  const pLongueur = percentiles(gardes.map((g) => g.longueur));
  const pLiens = percentiles(gardes.map((g) => liens.get(g.pageId) ?? 0));
  const rareteDe = raretePourRang(gardes.length, parts);
  const lignes = gardes.map((g, i) => [
    g.pageId, g.titre.slice(0, 255), extraits.get(g.pageId) ?? '', g.image,
    determinerType(natures.get(g.wikidata) ?? [], categories.get(g.pageId) ?? []),
    rareteDe(i), versStat(pLongueur[i]), calculerDefense(pLiens[i], labels.get(g.pageId) ?? null),
    i + 1, g.vues, 1, maintenant,
  ]);

  const desactives = await enregistrerCatalogue(db, lignes, maintenant);
  log(`Catalogue : ${lignes.length} cartes actives, ${desactives} désactivées.`);
  return { gardes: lignes.length, desactives };
}

export async function enregistrerCatalogue(db, lignes, maintenant) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const lot of lots(lignes, 500)) {
      await conn.query(
        `INSERT INTO catalogue (page_id, titre, extrait, image_url, type, rarete, attaque, defense, rang, vues_12_mois, actif, maj_le)
         VALUES ? AS nouv
         ON DUPLICATE KEY UPDATE titre = nouv.titre, extrait = nouv.extrait, image_url = nouv.image_url,
           type = nouv.type, rarete = nouv.rarete, attaque = nouv.attaque, defense = nouv.defense,
           rang = nouv.rang, vues_12_mois = nouv.vues_12_mois, actif = 1, maj_le = nouv.maj_le`,
        [lot],
      );
    }
    const [r] = await conn.query('UPDATE catalogue SET actif = 0 WHERE actif = 1 AND maj_le < ?', [maintenant]);
    await conn.commit();
    return r.affectedRows;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
