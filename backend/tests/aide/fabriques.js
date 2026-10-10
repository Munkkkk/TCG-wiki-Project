import jwt from 'jsonwebtoken';

export const SECRET_TEST = 'secret-de-test';
let compteur = 0;

export async function creerJoueur(db, champs = {}) {
  compteur++;
  const valeurs = {
    email: `joueur${compteur}@test.fr`,
    mot_de_passe_hash: 'x',
    pseudo: `joueur${compteur}`,
    pieces: 0,
    paquets_stockes: 10,
    dernier_calcul: new Date(),
    paquets_sans_legendaire: 0,
    vente_auto_communes: 0,
    cree_le: new Date(),
    ...champs,
  };
  const [r] = await db.query('INSERT INTO joueurs SET ?', [valeurs]);
  return r.insertId;
}

export async function creerCartes(db, liste) {
  const ids = [];
  for (const c of liste) {
    compteur++;
    const [r] = await db.query('INSERT INTO catalogue SET ?', [{
      page_id: compteur,
      titre: c.titre ?? `Carte ${compteur}`,
      extrait: 'Extrait de test.',
      image_url: null,
      type: c.type ?? 'culture',
      rarete: c.rarete,
      attaque: 50,
      defense: 50,
      rang: compteur,
      vues_12_mois: 1000,
      actif: c.actif ?? 1,
      maj_le: new Date(),
    }]);
    ids.push(r.insertId);
  }
  return ids;
}

export async function donnerCartes(db, joueurId, carteIds, obtenueLe = new Date()) {
  if (!carteIds.length) return;
  await db.query('INSERT INTO cartes_joueur (joueur_id, carte_id, obtenue_le) VALUES ?', [
    carteIds.map((id) => [joueurId, id, obtenueLe]),
  ]);
}

export function cookiePour(joueurId) {
  return `session=${jwt.sign({ sub: String(joueurId) }, SECRET_TEST)}`;
}

/** Renvoie les valeurs données, en boucle. */
export function rngFixe(valeurs) {
  let i = 0;
  return () => valeurs[i++ % valeurs.length];
}

/** Générateur déterministe (mulberry32). */
export function rngGraine(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
