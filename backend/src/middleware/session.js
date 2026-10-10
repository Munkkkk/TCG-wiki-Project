import jwt from 'jsonwebtoken';
import { ErreurJeu } from '../erreurs.js';

export function exigerConnexion(secret) {
  return (req, res, next) => {
    const jeton = req.cookies?.session;
    if (!jeton) throw new ErreurJeu(401, 'NON_CONNECTE', 'Connecte-toi pour continuer.');
    try {
      req.joueurId = Number(jwt.verify(jeton, secret).sub);
    } catch {
      throw new ErreurJeu(401, 'NON_CONNECTE', 'Ta session a expiré, reconnecte-toi.');
    }
    next();
  };
}
