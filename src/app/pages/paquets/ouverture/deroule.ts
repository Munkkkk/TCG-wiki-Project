import { Rarete, ResultatOuverture } from '../../../core/modeles';

export type CarteTiree = ResultatOuverture['cartes'][number];
export type Phase = 'paquet' | 'pile' | 'recap';

export interface Deroule {
  cartes: CarteTiree[];
  index: number;
  revelee: boolean;
  phase: Phase;
}

const RANG: Record<Rarete, number> = { commune: 0, rare: 1, ultra_rare: 2, super_rare: 3, legendaire: 4 };

/** Comme un vrai booster : la plus rare se révèle en dernier. */
export function trierPourRevelation(cartes: CarteTiree[]): CarteTiree[] {
  return cartes.map((c, i) => ({ c, i }))
    .sort((a, b) => RANG[a.c.rarete] - RANG[b.c.rarete] || a.i - b.i)
    .map(({ c }) => c);
}

export function debut(cartes: CarteTiree[]): Deroule {
  return { cartes: trierPourRevelation(cartes), index: 0, revelee: false, phase: 'paquet' };
}

export function apresDechirure(d: Deroule): Deroule {
  return d.phase === 'paquet' ? { ...d, phase: 'pile' } : d;
}

/** Un clic : retourne la carte du dessus, puis passe à la suivante, puis au récapitulatif. */
export function avancer(d: Deroule): Deroule {
  if (d.phase !== 'pile') return d;
  if (!d.revelee) return { ...d, revelee: true };
  if (d.index < d.cartes.length - 1) return { ...d, index: d.index + 1, revelee: false };
  return { ...d, phase: 'recap' };
}

export function passer(d: Deroule): Deroule {
  return { ...d, phase: 'recap' };
}
