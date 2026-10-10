import { Router } from 'express';
import { JEU } from '../config/jeu.js';
import { ErreurJeu } from '../erreurs.js';
import { compterExemplaires, nbVendables, retirerExemplaires } from '../services/exemplaires.js';

const MAX_LIGNES = 1000;

function validerVentes(ventes) {
  const valide = Array.isArray(ventes) && ventes.length > 0 && ventes.length <= MAX_LIGNES
    && ventes.every((v) => Number.isInteger(v?.carteId) && Number.isInteger(v?.quantite) && v.quantite >= 1);
  if (!valide) throw new ErreurJeu(400, 'REQUETE_INVALIDE', 'Requête invalide.');
  return ventes;
}

export function routeurDoublons(db) {
  const r = Router();

  r.get('/', async (req, res) => {
    const [lignes] = await db.query(
      `SELECT c.id, c.titre, c.rarete, c.type, c.image_url, COUNT(*) - 1 AS vendables
       FROM cartes_joueur cj
       JOIN catalogue c ON c.id = cj.carte_id
       LEFT JOIN epingles e ON e.joueur_id = cj.joueur_id AND e.carte_id = c.id
       WHERE cj.joueur_id = ? AND e.carte_id IS NULL
       GROUP BY c.id
       HAVING COUNT(*) > 1
       ORDER BY c.rarete, c.titre`,
      [req.joueurId],
    );
    res.json({
      doublons: lignes.map((l) => ({
        carteId: l.id, titre: l.titre, rarete: l.rarete, type: l.type, imageUrl: l.image_url,
        vendables: Number(l.vendables), prixUnitaire: JEU.prixRevente[l.rarete],
      })),
    });
  });

  r.post('/vendre', async (req, res) => {
    const ventes = validerVentes(req.body?.ventes);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('SELECT id FROM joueurs WHERE id = ? FOR UPDATE', [req.joueurId]);
      let cartesVendues = 0;
      let piecesGagnees = 0;
      for (const { carteId, quantite } of ventes) {
        const [[carte]] = await conn.query('SELECT rarete FROM catalogue WHERE id = ?', [carteId]);
        if (!carte) continue;
        const n = Math.min(quantite, nbVendables(await compterExemplaires(conn, req.joueurId, carteId)));
        const retires = await retirerExemplaires(conn, req.joueurId, carteId, n);
        cartesVendues += retires;
        piecesGagnees += retires * JEU.prixRevente[carte.rarete];
      }
      await conn.query('UPDATE joueurs SET pieces = pieces + ? WHERE id = ?', [piecesGagnees, req.joueurId]);
      const [[{ pieces }]] = await conn.query('SELECT pieces FROM joueurs WHERE id = ?', [req.joueurId]);
      await conn.commit();
      res.json({ cartesVendues, piecesGagnees, pieces });
    } catch (e) {
      await conn.rollback().catch(() => {});
      throw e;
    } finally {
      conn.release();
    }
  });

  return r;
}
