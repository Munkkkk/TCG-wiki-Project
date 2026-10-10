import { randomInt } from 'node:crypto';
import { JEU, RARETES } from '../config/jeu.js';

const ECHELLE = 2 ** 47;
export const rngCrypto = () => randomInt(0, ECHELLE) / ECHELLE;

export function tirerRarete(taux, rng) {
  const total = RARETES.reduce((s, r) => s + (taux[r] ?? 0), 0);
  let x = rng() * total;
  for (const r of RARETES) {
    x -= taux[r] ?? 0;
    if (x < 0) return r;
  }
  return RARETES.findLast((r) => (taux[r] ?? 0) > 0);
}

export function tirerRaretesPaquet(paquetsSansLegendaire, cfg = JEU, rng) {
  const raretes = [];
  for (let i = 0; i < cfg.cartesParPaquet - 1; i++) raretes.push(tirerRarete(cfg.taux, rng));
  const pitie = paquetsSansLegendaire + 1 >= cfg.pitie && !raretes.includes('legendaire');
  const { commune, ...tauxGarantis } = cfg.taux;
  raretes.push(pitie ? 'legendaire' : tirerRarete(tauxGarantis, rng));
  return raretes;
}

export function majCompteurPitie(compteur, raretesObtenues) {
  return raretesObtenues.includes('legendaire') ? 0 : compteur + 1;
}
