import { Doublon } from '../../core/modeles';
import { basculer, definirQuantite, totalSelection, toutSelectionner } from './selection';

const d = (carteId: number, rarete: Doublon['rarete'], vendables: number, prixUnitaire: number): Doublon => ({
  carteId, titre: `C${carteId}`, rarete, type: 'culture', imageUrl: null, vendables, prixUnitaire,
});
const LISTE = [d(1, 'commune', 2, 5), d(2, 'commune', 1, 5), d(3, 'rare', 1, 15)];

describe('sélection des doublons', () => {
  it('tout sélectionner prend tous les exemplaires vendables', () => {
    const sel = toutSelectionner(LISTE, null);
    expect([...sel]).toEqual([[1, 2], [2, 1], [3, 1]]);
    expect(totalSelection(LISTE, sel)).toEqual({ cartes: 4, pieces: 30 });
  });

  it('filtre par rareté', () => {
    expect([...toutSelectionner(LISTE, 'rare')]).toEqual([[3, 1]]);
  });

  it('basculer ajoute ou retire une carte', () => {
    const sel = basculer(new Map(), LISTE[0]);
    expect(sel.get(1)).toBe(2);
    expect(basculer(sel, LISTE[0]).has(1)).toBe(false);
  });

  it('définir une quantité la borne entre 0 et vendables', () => {
    expect(definirQuantite(new Map(), LISTE[0], 1).get(1)).toBe(1);
    expect(definirQuantite(new Map(), LISTE[0], 99).get(1)).toBe(2);
    expect(definirQuantite(new Map([[1, 2]]), LISTE[0], 0).has(1)).toBe(false);
  });

  it('le total plafonne une sélection trop grande', () => {
    expect(totalSelection(LISTE, new Map([[1, 50]]))).toEqual({ cartes: 2, pieces: 10 });
  });
});
