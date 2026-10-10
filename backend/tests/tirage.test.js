import { describe, it, expect } from 'vitest';
import { tirerRarete, tirerRaretesPaquet, majCompteurPitie, rngCrypto } from '../src/jeu/tirage.js';
import { JEU } from '../src/config/jeu.js';
import { rngFixe, rngGraine } from './aide/fabriques.js';

describe('tirerRarete', () => {
  it('respecte les bornes cumulées des taux', () => {
    expect(tirerRarete(JEU.taux, () => 0)).toBe('commune');
    expect(tirerRarete(JEU.taux, () => 0.5999)).toBe('commune');
    expect(tirerRarete(JEU.taux, () => 0.6)).toBe('rare');
    expect(tirerRarete(JEU.taux, () => 0.9999)).toBe('legendaire');
  });
});

describe('tirerRaretesPaquet', () => {
  it('donne 5 raretés, la 5e est au moins Rare', () => {
    expect(tirerRaretesPaquet(0, JEU, rngFixe([0])))
      .toEqual(['commune', 'commune', 'commune', 'commune', 'rare']);
  });

  it('ne donne jamais de Commune en 5e position', () => {
    const rng = rngGraine(42);
    for (let i = 0; i < 1000; i++) {
      expect(tirerRaretesPaquet(0, JEU, rng)[4]).not.toBe('commune');
    }
  });

  it('force une Légendaire au 50e paquet sans Légendaire', () => {
    expect(tirerRaretesPaquet(49, JEU, rngFixe([0]))[4]).toBe('legendaire');
    expect(tirerRaretesPaquet(48, JEU, rngFixe([0]))[4]).toBe('rare');
  });

  it('respecte approximativement les taux sur 10 000 paquets (4 premières cartes)', () => {
    const rng = rngGraine(7);
    const compte = { commune: 0, rare: 0, ultra_rare: 0, super_rare: 0, legendaire: 0 };
    for (let i = 0; i < 10000; i++) {
      for (const r of tirerRaretesPaquet(0, JEU, rng).slice(0, 4)) compte[r]++;
    }
    for (const [rarete, taux] of Object.entries(JEU.taux)) {
      expect(Math.abs((compte[rarete] / 40000) * 100 - taux)).toBeLessThan(1.5);
    }
  });
});

describe('majCompteurPitie', () => {
  it('incrémente sans Légendaire et remet à 0 sinon', () => {
    expect(majCompteurPitie(10, ['commune', 'rare'])).toBe(11);
    expect(majCompteurPitie(10, ['commune', 'legendaire'])).toBe(0);
  });
});

describe('rngCrypto', () => {
  it('renvoie un nombre dans [0, 1)', () => {
    for (let i = 0; i < 100; i++) {
      const x = rngCrypto();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});
