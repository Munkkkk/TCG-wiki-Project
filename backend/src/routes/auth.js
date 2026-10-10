import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { JEU } from '../config/jeu.js';
import { ErreurJeu } from '../erreurs.js';
import { validerEmail, validerMotDePasse, validerPseudo } from '../validation.js';
import { chargerJoueur, etatJoueur } from '../jeu/etat.js';

const COUT_BCRYPT = process.env.VITEST ? 4 : 10;
const DUREE_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function poserSession(res, joueurId, secret) {
  const jeton = jwt.sign({ sub: String(joueurId) }, secret, { expiresIn: '30d' });
  res.cookie('session', jeton, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: DUREE_SESSION_MS,
    path: '/',
  });
}

export function routeurAuth(db, { secret, limiteConnexion = { fenetreMs: 15 * 60 * 1000, max: 5 } }) {
  const r = Router();
  const limiteur = rateLimit({
    windowMs: limiteConnexion.fenetreMs,
    limit: limiteConnexion.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({
      code: 'TROP_DE_TENTATIVES', message: 'Trop de tentatives, réessaie dans 15 minutes.',
    }),
  });

  r.post('/inscription', async (req, res) => {
    const email = validerEmail(req.body?.email);
    const pseudo = validerPseudo(req.body?.pseudo);
    const motDePasse = validerMotDePasse(req.body?.motDePasse);
    const hash = await bcrypt.hash(motDePasse, COUT_BCRYPT);
    const maintenant = new Date();
    let id;
    try {
      const [resultat] = await db.query(
        `INSERT INTO joueurs (email, mot_de_passe_hash, pseudo, pieces, paquets_stockes, dernier_calcul, cree_le)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [email, hash, pseudo, JEU.piecesDepart, JEU.paquetsDepart, maintenant, maintenant],
      );
      id = resultat.insertId;
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        if (e.message.includes('.email')) throw new ErreurJeu(409, 'EMAIL_PRIS', 'Cette adresse email a déjà un compte.');
        throw new ErreurJeu(409, 'PSEUDO_PRIS', 'Ce pseudo est déjà pris.');
      }
      throw e;
    }
    poserSession(res, id, secret);
    res.status(201).json(etatJoueur(await chargerJoueur(db, id), maintenant));
  });

  r.post('/connexion', limiteur, async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const motDePasse = typeof req.body?.motDePasse === 'string' ? req.body.motDePasse : '';
    const [[j]] = await db.query('SELECT * FROM joueurs WHERE email = ?', [email]);
    if (!j || !(await bcrypt.compare(motDePasse, j.mot_de_passe_hash))) {
      throw new ErreurJeu(401, 'IDENTIFIANTS_INVALIDES', 'Email ou mot de passe incorrect.');
    }
    poserSession(res, j.id, secret);
    res.json(etatJoueur(j, new Date()));
  });

  r.post('/deconnexion', (req, res) => {
    res.clearCookie('session', { path: '/' });
    res.status(204).end();
  });

  return r;
}
