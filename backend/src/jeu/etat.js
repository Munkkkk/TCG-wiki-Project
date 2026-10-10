import { JEU } from '../config/jeu.js';
import { ErreurJeu } from '../erreurs.js';
import { calculerRecharge, prochainPaquetDans } from './recharge.js';

export function etatJoueur(j, maintenant) {
  const recharge = calculerRecharge(
    { paquetsStockes: j.paquets_stockes, dernierCalcul: j.dernier_calcul }, maintenant, JEU,
  );
  return {
    id: j.id,
    pseudo: j.pseudo,
    email: j.email,
    pieces: j.pieces,
    paquetsStockes: recharge.paquetsStockes,
    paquetsMax: JEU.paquetsMax,
    prochainPaquetDansMs: prochainPaquetDans(recharge, maintenant, JEU),
    paquetsAvantPitie: JEU.pitie - j.paquets_sans_legendaire,
    venteAutoCommunes: Boolean(j.vente_auto_communes),
  };
}

export async function chargerJoueur(db, id) {
  const [[j]] = await db.query('SELECT * FROM joueurs WHERE id = ?', [id]);
  if (!j) throw new ErreurJeu(401, 'NON_CONNECTE', 'Connecte-toi pour continuer.');
  return j;
}
