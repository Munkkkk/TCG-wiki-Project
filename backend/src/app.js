import express from 'express';
import cookieParser from 'cookie-parser';
import { gestionnaireErreurs } from './erreurs.js';
import { exigerConnexion } from './middleware/session.js';
import { routeurAuth } from './routes/auth.js';
import { routeurMoi } from './routes/moi.js';
import { routeurPaquets } from './routes/paquets.js';
import { routeurAlbum } from './routes/album.js';
import { routeurCartes } from './routes/cartes.js';
import { routeurDoublons } from './routes/doublons.js';
import { routeurCollection } from './routes/collection.js';

export function creerApp(db, options = {}) {
  const secret = options.jwtSecret ?? process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET manquant');
  if (process.env.NODE_ENV === 'production' && (secret === 'une-longue-chaine-aleatoire' || secret.length < 32)) {
    throw new Error('JWT_SECRET trop faible en production (32 caractères minimum, pas la valeur d’exemple)');
  }

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/sante', async (req, res) => {
    await db.query('SELECT 1');
    res.json({ ok: true });
  });

  const exiger = exigerConnexion(secret);
  app.use('/api/auth', routeurAuth(db, { secret, limiteConnexion: options.limiteConnexion }));
  app.use('/api/moi', exiger, routeurMoi(db));
  app.use('/api/paquets', exiger, routeurPaquets(db, { rng: options.rng }));
  app.use('/api/album', exiger, routeurAlbum(db));
  app.use('/api/cartes', exiger, routeurCartes(db));
  app.use('/api/doublons', exiger, routeurDoublons(db));
  app.use('/api/collection', exiger, routeurCollection(db));
  // ROUTES (ajoutées par les tâches suivantes)

  app.use('/api', (req, res) => {
    res.status(404).json({ code: 'ROUTE_INCONNUE', message: 'Route inconnue.' });
  });
  app.use(gestionnaireErreurs);
  return app;
}
