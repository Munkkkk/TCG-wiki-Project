import express from 'express';
import cookieParser from 'cookie-parser';
import { gestionnaireErreurs } from './erreurs.js';
import { exigerConnexion } from './middleware/session.js';
import { routeurAuth } from './routes/auth.js';
import { routeurMoi } from './routes/moi.js';

export function creerApp(db, options = {}) {
  const secret = options.jwtSecret ?? process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET manquant');

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
  // ROUTES (ajoutées par les tâches suivantes)

  app.use('/api', (req, res) => {
    res.status(404).json({ code: 'ROUTE_INCONNUE', message: 'Route inconnue.' });
  });
  app.use(gestionnaireErreurs);
  return app;
}
