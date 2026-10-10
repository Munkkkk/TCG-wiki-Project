import { Router } from 'express';
import { JEU, RARETES } from '../config/jeu.js';

/** Résumé de la collection du joueur + règles de tirage, pour la page Paquets. */
export function routeurCollection(db) {
  const r = Router();

  r.get('/', async (req, res) => {
    const [lignes] = await db.query(
      `SELECT c.rarete, COUNT(DISTINCT c.id) AS n
       FROM cartes_joueur cj JOIN catalogue c ON c.id = cj.carte_id
       WHERE cj.joueur_id = ?
       GROUP BY c.rarete`,
      [req.joueurId],
    );
    const parRarete = Object.fromEntries(RARETES.map((rarete) => [rarete, 0]));
    for (const l of lignes) parRarete[l.rarete] = Number(l.n);
    const [[{ tailleCatalogue }]] = await db.query('SELECT COUNT(*) AS tailleCatalogue FROM catalogue WHERE actif = 1');

    res.json({
      possedees: Object.values(parRarete).reduce((a, b) => a + b, 0),
      tailleCatalogue: Number(tailleCatalogue),
      parRarete,
      taux: JEU.taux,
      pitie: JEU.pitie,
    });
  });

  return r;
}
