import { Router } from 'express';
import { ErreurJeu } from '../erreurs.js';
import { versCarteVue } from '../jeu/cartes.js';
import { compterExemplaires } from '../services/exemplaires.js';

export function routeurCartes(db) {
  const r = Router();
  r.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const introuvable = new ErreurJeu(404, 'CARTE_INTROUVABLE', 'Carte introuvable.');
    if (!Number.isInteger(id)) throw introuvable;
    const [[c]] = await db.query('SELECT * FROM catalogue WHERE id = ?', [id]);
    if (!c) throw introuvable;
    const { possedes, epinglee } = await compterExemplaires(db, req.joueurId, id);
    res.json({ ...versCarteVue(c), quantite: possedes, epinglee, actif: Boolean(c.actif) });
  });
  return r;
}
