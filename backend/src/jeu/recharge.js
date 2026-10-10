import { JEU } from '../config/jeu.js';

export function calculerRecharge({ paquetsStockes, dernierCalcul }, maintenant, cfg = JEU) {
  const { intervalleRechargeMs, paquetsMax } = cfg;
  if (paquetsStockes >= paquetsMax) return { paquetsStockes: paquetsMax, dernierCalcul: maintenant };
  const ecoule = maintenant.getTime() - dernierCalcul.getTime();
  const gagnes = Math.max(0, Math.floor(ecoule / intervalleRechargeMs));
  if (paquetsStockes + gagnes >= paquetsMax) return { paquetsStockes: paquetsMax, dernierCalcul: maintenant };
  return {
    paquetsStockes: paquetsStockes + gagnes,
    dernierCalcul: new Date(dernierCalcul.getTime() + gagnes * intervalleRechargeMs),
  };
}

export function prochainPaquetDans({ paquetsStockes, dernierCalcul }, maintenant, cfg = JEU) {
  if (paquetsStockes >= cfg.paquetsMax) return null;
  return Math.max(0, dernierCalcul.getTime() + cfg.intervalleRechargeMs - maintenant.getTime());
}
