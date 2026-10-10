import { describe, it, expect } from 'vitest';
import { calculerRecharge, prochainPaquetDans } from '../src/jeu/recharge.js';

const CFG = { intervalleRechargeMs: 60 * 60 * 1000, paquetsMax: 10 };
const MIN = 60 * 1000;
const H = 60 * MIN;
const t0 = new Date('2026-10-10T10:00:00Z');
const apres = (ms) => new Date(t0.getTime() + ms);

describe('calculerRecharge', () => {
  it('ne gagne rien a 0 min', () => {
    expect(calculerRecharge({ paquetsStockes: 3, dernierCalcul: t0 }, t0, CFG))
      .toEqual({ paquetsStockes: 3, dernierCalcul: t0 });
  });

  it('ne gagne rien a 59 min', () => {
    expect(calculerRecharge({ paquetsStockes: 3, dernierCalcul: t0 }, apres(59 * MIN), CFG))
      .toEqual({ paquetsStockes: 3, dernierCalcul: t0 });
  });

  it('gagne 1 paquet a 60 min', () => {
    expect(calculerRecharge({ paquetsStockes: 3, dernierCalcul: t0 }, apres(H), CFG))
      .toEqual({ paquetsStockes: 4, dernierCalcul: apres(H) });
  });

  it('conserve le temps entame (2 h 30 +2, reste 30 min)', () => {
    expect(calculerRecharge({ paquetsStockes: 3, dernierCalcul: t0 }, apres(2.5 * H), CFG))
      .toEqual({ paquetsStockes: 5, dernierCalcul: apres(2 * H) });
  });

  it('plafonne a 10 et remet le compteur a maintenant', () => {
    const maintenant = apres(10 * H);
    expect(calculerRecharge({ paquetsStockes: 3, dernierCalcul: t0 }, maintenant, CFG))
      .toEqual({ paquetsStockes: 10, dernierCalcul: maintenant });
  });

  it('stock plein : dernierCalcul suit maintenant', () => {
    const maintenant = apres(5 * MIN);
    expect(calculerRecharge({ paquetsStockes: 10, dernierCalcul: t0 }, maintenant, CFG))
      .toEqual({ paquetsStockes: 10, dernierCalcul: maintenant });
  });

  it('horloge qui recule : rien ne bouge, jamais de stock negatif', () => {
    const passe = new Date(t0.getTime() - 3 * H);
    expect(calculerRecharge({ paquetsStockes: 3, dernierCalcul: t0 }, passe, CFG))
      .toEqual({ paquetsStockes: 3, dernierCalcul: t0 });
  });
});

describe('prochainPaquetDans', () => {
  it('null quand le stock est plein', () => {
    expect(prochainPaquetDans({ paquetsStockes: 10, dernierCalcul: t0 }, t0, CFG)).toBeNull();
  });

  it('temps restant jusqua au prochain paquet', () => {
    expect(prochainPaquetDans({ paquetsStockes: 3, dernierCalcul: t0 }, apres(20 * MIN), CFG)).toBe(40 * MIN);
  });

  it('passage 10 9 : le compte a rebours demarre a l\'ouverture', () => {
    const ouverture = apres(7 * H);
    const r = calculerRecharge({ paquetsStockes: 10, dernierCalcul: t0 }, ouverture, CFG);
    const apresOuverture = { ...r, paquetsStockes: r.paquetsStockes - 1 };
    expect(prochainPaquetDans(apresOuverture, ouverture, CFG)).toBe(H);
  });
});
