import { describe, it, expect } from 'vitest';
import { lots } from '../src/utils/lots.js';
import { estTitreCandidat, estArticleValide } from '../src/jobs/catalogue/filtres.js';
import { percentiles, versStat, calculerDefense, raretePourRang } from '../src/jobs/catalogue/stats.js';
import { typeDepuisP31, typeDepuisCategories, determinerType } from '../src/jobs/catalogue/types.js';
import { JEU } from '../src/config/jeu.js';

describe('lots', () => {
  it('découpe en paquets de taille fixe', () => {
    expect(lots([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe('estTitreCandidat', () => {
  it.each(['Napoléon Ier', 'Paris', 'Star Wars : Épisode IV', "L'Étranger", '1984 (roman)'])('garde « %s »', (t) => {
    expect(estTitreCandidat(t)).toBe(true);
  });
  it.each([
    'Spécial:Recherche', 'Wikipédia:Accueil principal', 'Fichier:Logo.png', 'Catégorie:Peintre',
    'Liste des pays du monde', "Liste d'œuvres de Mozart", '1789', '14 juillet', '1er janvier',
    'Juillet 2024', 'Décès en 2025', '2024 en France', '-', '',
  ])('exclut « %s »', (t) => {
    expect(estTitreCandidat(t)).toBe(false);
  });
});

describe('estArticleValide', () => {
  const base = { existe: true, ns: 0, redirection: false, homonymie: false, longueur: 5000 };
  it('accepte un article normal', () => expect(estArticleValide(base, 2000)).toBe(true));
  it.each([
    [{ existe: false }], [{ ns: 4 }], [{ redirection: true }], [{ homonymie: true }], [{ longueur: 1999 }],
  ])('refuse %o', (changement) => expect(estArticleValide({ ...base, ...changement }, 2000)).toBe(false));
});

describe('stats', () => {
  it('percentiles : part des valeurs strictement inférieures', () => {
    expect(percentiles([10, 30, 20, 20])).toEqual([0, 1, 1 / 3, 1 / 3]);
    expect(percentiles([42])).toEqual([1]);
  });
  it('versStat : 1 à 100', () => {
    expect(versStat(0)).toBe(1);
    expect(versStat(1)).toBe(100);
    expect(versStat(0.5)).toBe(51);
    expect(versStat(7)).toBe(100);
  });
  it('défense : 60 % liens + 40 % label', () => {
    expect(calculerDefense(1, 'qualite')).toBe(100);
    expect(calculerDefense(0, 'bon')).toBe(versStat(0.24));
    expect(calculerDefense(0.5, null)).toBe(versStat(0.3));
  });
  it('raretés par rang (n = 1000)', () => {
    const rarete = raretePourRang(1000, JEU.catalogue.parts);
    expect([0, 9, 10, 49, 50, 149, 150, 399, 400, 999].map(rarete)).toEqual([
      'legendaire', 'legendaire', 'super_rare', 'super_rare', 'ultra_rare', 'ultra_rare', 'rare', 'rare', 'commune', 'commune',
    ]);
  });
});

describe('types', () => {
  it('depuis Wikidata P31', () => {
    expect(typeDepuisP31(['Q5'])).toBe('personnalite');
    expect(typeDepuisP31(['Q484170'])).toBe('lieu');
    expect(typeDepuisP31(['Q178561'])).toBe('histoire');
    expect(typeDepuisP31(['Q11344'])).toBe('science');
    expect(typeDepuisP31(['Q11424'])).toBe('culture');
    expect(typeDepuisP31(['Q16521'])).toBe('nature');
    expect(typeDepuisP31(['Q999999999'])).toBeNull();
  });
  it('depuis les catégories', () => {
    expect(typeDepuisCategories(['Catégorie:Naissance en 1769'])).toBe('personnalite');
    expect(typeDepuisCategories(['Catégorie:Commune du Rhône'])).toBe('lieu');
    expect(typeDepuisCategories(['Catégorie:Mammifère (nom vernaculaire)'])).toBe('nature');
    expect(typeDepuisCategories(['Catégorie:Truc'])).toBeNull();
  });
  it('repli sur Culture', () => {
    expect(determinerType([], [])).toBe('culture');
    expect(determinerType(['Q5'], ['Catégorie:Commune du Rhône'])).toBe('personnalite');
  });
});
