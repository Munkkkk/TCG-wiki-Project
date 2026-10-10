import { Router } from 'express';
import { ErreurJeu } from '../erreurs.js';
import { validerPseudo } from '../validation.js';
import { chargerJoueur, etatJoueur } from '../jeu/etat.js';

export function routeurMoi(db) {
  const r = Router();

  r.get('/', async (req, res) => {
    res.json(etatJoueur(await chargerJoueur(db, req.joueurId), new Date()));
  });

  r.patch('/', async (req, res) => {
    const { pseudo, venteAutoCommunes } = req.body ?? {};
    const changements = {};
    if (pseudo !== undefined) changements.pseudo = validerPseudo(pseudo);
    if (venteAutoCommunes !== undefined) {
      if (typeof venteAutoCommunes !== 'boolean') throw new ErreurJeu(400, 'REQUETE_INVALIDE', 'Requête invalide.');
      changements.vente_auto_communes = venteAutoCommunes ? 1 : 0;
    }
    if (Object.keys(changements).length) {
      try {
        await db.query('UPDATE joueurs SET ? WHERE id = ?', [changements, req.joueurId]);
      } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') throw new ErreurJeu(409, 'PSEUDO_PRIS', 'Ce pseudo est déjà pris.');
        throw e;
      }
    }
    res.json(etatJoueur(await chargerJoueur(db, req.joueurId), new Date()));
  });

  return r;
}
