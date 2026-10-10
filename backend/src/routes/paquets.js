import { Router } from 'express';
import { ouvrirPaquet } from '../services/paquets.js';

export function routeurPaquets(db, { rng } = {}) {
  const r = Router();
  r.post('/ouvrir', async (req, res) => {
    res.json(await ouvrirPaquet(db, req.joueurId, req.body?.source, { rng }));
  });
  return r;
}
