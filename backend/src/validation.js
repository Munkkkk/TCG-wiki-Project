import { ErreurJeu } from './erreurs.js';

export function validerEmail(email) {
  if (typeof email !== 'string') throw new ErreurJeu(400, 'EMAIL_INVALIDE', 'Adresse email invalide.');
  const propre = email.trim().toLowerCase();
  if (propre.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(propre)) {
    throw new ErreurJeu(400, 'EMAIL_INVALIDE', 'Adresse email invalide.');
  }
  return propre;
}

export function validerPseudo(pseudo) {
  if (typeof pseudo !== 'string' || !/^[A-Za-z0-9_-]{3,20}$/.test(pseudo.trim())) {
    throw new ErreurJeu(400, 'PSEUDO_INVALIDE', 'Le pseudo doit faire 3 à 20 caractères (lettres, chiffres, _ ou -).');
  }
  return pseudo.trim();
}

export function validerMotDePasse(motDePasse) {
  if (typeof motDePasse !== 'string' || motDePasse.length < 8) {
    throw new ErreurJeu(400, 'MOT_DE_PASSE_TROP_COURT', 'Le mot de passe doit faire au moins 8 caractères.');
  }
  return motDePasse;
}
