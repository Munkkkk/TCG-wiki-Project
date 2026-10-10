import { JEU, RARETES } from '../config/jeu.js';
import { ErreurJeu } from '../erreurs.js';
import { calculerRecharge } from '../jeu/recharge.js';
import { tirerRaretesPaquet, majCompteurPitie, rngCrypto } from '../jeu/tirage.js';
import { etatJoueur } from '../jeu/etat.js';
import { versCarteVue } from '../jeu/cartes.js';
import { compterExemplaires, nbVendables, retirerExemplaires } from './exemplaires.js';

async function compterParRarete(conn) {
  const [lignes] = await conn.query('SELECT rarete, COUNT(*) AS n FROM catalogue WHERE actif = 1 GROUP BY rarete');
  return Object.fromEntries(lignes.map((l) => [l.rarete, Number(l.n)]));
}

/** Rareté voulue si disponible, sinon la plus proche en dessous, sinon n'importe laquelle. */
function rareteDisponible(voulue, comptes) {
  for (let i = RARETES.indexOf(voulue); i >= 0; i--) if (comptes[RARETES[i]]) return RARETES[i];
  return RARETES.find((r) => comptes[r]);
}

async function venteAutoCommunes(conn, joueurId, cartes) {
  let vendues = 0;
  const tirees = new Map();
  for (const c of cartes) if (c.rarete === 'commune') tirees.set(c.id, (tirees.get(c.id) ?? 0) + 1);
  for (const [carteId, nbTirees] of tirees) {
    const n = Math.min(nbTirees, nbVendables(await compterExemplaires(conn, joueurId, carteId)));
    vendues += await retirerExemplaires(conn, joueurId, carteId, n);
  }
  return { cartes: vendues, pieces: vendues * JEU.prixRevente.commune };
}

export async function ouvrirPaquet(db, joueurId, source, { maintenant = new Date(), rng = rngCrypto } = {}) {
  if (source !== 'stock' && source !== 'achat') {
    throw new ErreurJeu(400, 'SOURCE_INVALIDE', 'Source de paquet invalide.');
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[j]] = await conn.query('SELECT * FROM joueurs WHERE id = ? FOR UPDATE', [joueurId]);
    if (!j) throw new ErreurJeu(401, 'NON_CONNECTE', 'Connecte-toi pour continuer.');

    let { paquetsStockes, dernierCalcul } = calculerRecharge(
      { paquetsStockes: j.paquets_stockes, dernierCalcul: j.dernier_calcul }, maintenant, JEU,
    );
    let pieces = j.pieces;
    if (source === 'stock') {
      if (paquetsStockes < 1) throw new ErreurJeu(409, 'STOCK_VIDE', 'Plus de paquet disponible pour le moment.');
      paquetsStockes -= 1;
    } else {
      if (pieces < JEU.prixPaquet) {
        throw new ErreurJeu(409, 'PIECES_INSUFFISANTES', `Il faut ${JEU.prixPaquet} pièces pour acheter un paquet.`);
      }
      pieces -= JEU.prixPaquet;
    }

    const comptes = await compterParRarete(conn);
    if (!Object.keys(comptes).length) {
      throw new ErreurJeu(409, 'CATALOGUE_VIDE', "Le catalogue de cartes n'est pas encore prêt.");
    }

    const cartes = [];
    for (const voulue of tirerRaretesPaquet(j.paquets_sans_legendaire, JEU, rng)) {
      const rarete = rareteDisponible(voulue, comptes);
      const [[c]] = await conn.query(
        'SELECT * FROM catalogue WHERE actif = 1 AND rarete = ? ORDER BY id LIMIT 1 OFFSET ?',
        [rarete, Math.floor(rng() * comptes[rarete])],
      );
      cartes.push(c);
    }

    const ids = [...new Set(cartes.map((c) => c.id))];
    const [possedees] = await conn.query(
      'SELECT DISTINCT carte_id FROM cartes_joueur WHERE joueur_id = ? AND carte_id IN (?)', [joueurId, ids],
    );
    const dejaVues = new Set(possedees.map((p) => p.carte_id));
    const cartesVues = cartes.map((c) => {
      const nouvelle = !dejaVues.has(c.id);
      dejaVues.add(c.id);
      return { ...versCarteVue(c), nouvelle };
    });

    await conn.query('INSERT INTO cartes_joueur (joueur_id, carte_id, obtenue_le) VALUES ?', [
      cartes.map((c) => [joueurId, c.id, maintenant]),
    ]);

    let venteAuto = null;
    if (j.vente_auto_communes) {
      venteAuto = await venteAutoCommunes(conn, joueurId, cartes);
      pieces += venteAuto.pieces;
    }

    await conn.query(
      `UPDATE joueurs SET paquets_stockes = ?, dernier_calcul = ?, pieces = ?, paquets_sans_legendaire = ?
       WHERE id = ?`,
      [paquetsStockes, dernierCalcul, pieces, majCompteurPitie(j.paquets_sans_legendaire, cartes.map((c) => c.rarete)), joueurId],
    );
    await conn.query(
      'INSERT INTO ouvertures (joueur_id, ouverte_le, source, cartes) VALUES (?, ?, ?, ?)',
      [joueurId, maintenant, source, JSON.stringify(cartes.map((c) => c.id))],
    );
    await conn.commit();

    const [[jMaj]] = await conn.query('SELECT * FROM joueurs WHERE id = ?', [joueurId]);
    return { cartes: cartesVues, etat: etatJoueur(jMaj, maintenant), venteAuto };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
