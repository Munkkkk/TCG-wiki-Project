import { Doublon, Rarete } from '../../core/modeles';

export type Selection = ReadonlyMap<number, number>;

export function totalSelection(doublons: Doublon[], sel: Selection) {
  let cartes = 0;
  let pieces = 0;
  for (const d of doublons) {
    const q = Math.min(sel.get(d.carteId) ?? 0, d.vendables);
    cartes += q;
    pieces += q * d.prixUnitaire;
  }
  return { cartes, pieces };
}

export function toutSelectionner(doublons: Doublon[], rarete: Rarete | null) {
  return new Map(doublons.filter((d) => !rarete || d.rarete === rarete).map((d) => [d.carteId, d.vendables]));
}

export function basculer(sel: Selection, d: Doublon) {
  const res = new Map(sel);
  if (res.has(d.carteId)) res.delete(d.carteId);
  else res.set(d.carteId, d.vendables);
  return res;
}

export function definirQuantite(sel: Selection, d: Doublon, q: number) {
  const res = new Map(sel);
  const borne = Math.max(0, Math.min(d.vendables, Math.floor(q) || 0));
  if (borne === 0) res.delete(d.carteId);
  else res.set(d.carteId, borne);
  return res;
}
