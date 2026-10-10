import { Carte, Rarete } from '../../../core/modeles';
import { CarteTiree, apresDechirure, avancer, debut, passer, trierPourRevelation } from './deroule';

const carte = (id: number, rarete: Rarete): CarteTiree => ({
  id, pageId: id, titre: `C${id}`, extrait: '', imageUrl: null, type: 'culture', rarete,
  attaque: 50, defense: 50, nouvelle: false,
} satisfies Carte & { nouvelle: boolean });

const PAQUET = [carte(1, 'legendaire'), carte(2, 'commune'), carte(3, 'rare'), carte(4, 'commune'), carte(5, 'ultra_rare')];

describe('déroulé de l’ouverture', () => {
  it('trie de la moins rare à la plus rare, en gardant l’ordre entre égales', () => {
    expect(trierPourRevelation(PAQUET).map((c) => c.id)).toEqual([2, 4, 3, 5, 1]);
  });

  it('commence sur le paquet, puis passe à la pile après la déchirure', () => {
    const d = debut(PAQUET);
    expect(d).toMatchObject({ phase: 'paquet', index: 0, revelee: false });
    expect(apresDechirure(d).phase).toBe('pile');
  });

  it('chaque clic retourne la carte, puis passe à la suivante, puis au récapitulatif', () => {
    let d = apresDechirure(debut(PAQUET));
    d = avancer(d);
    expect(d).toMatchObject({ index: 0, revelee: true });
    d = avancer(d);
    expect(d).toMatchObject({ index: 1, revelee: false });
    for (let i = 0; i < 7; i++) d = avancer(d);
    expect(d).toMatchObject({ phase: 'pile', index: 4, revelee: true });
    expect(avancer(d).phase).toBe('recap');
  });

  it('ignore les clics hors de la pile', () => {
    const d = debut(PAQUET);
    expect(avancer(d)).toBe(d);
  });

  it('« Passer » va directement au récapitulatif', () => {
    expect(passer(apresDechirure(debut(PAQUET))).phase).toBe('recap');
  });
});
