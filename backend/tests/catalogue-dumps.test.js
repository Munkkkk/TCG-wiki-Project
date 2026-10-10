import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { preparerBaseTest, viderBase } from './aide/db.js';
import { urlDumpMensuel, parserLigneDump, importerMois, vuesDepuisDumps, lignesDepuisUrl } from '../src/jobs/catalogue/dumps.js';

let db;
beforeAll(async () => { db = await preparerBaseTest(); });
beforeEach(async () => { await viderBase(db); });
afterAll(async () => { await db.end(); });

async function* flux(lignes) { for (const l of lignes) yield l; }

describe('dumps de vues', () => {
  it("construit l'URL mensuelle", () => {
    expect(urlDumpMensuel('2026-09'))
      .toBe('https://dumps.wikimedia.org/other/pageview_complete/monthly/2026/2026-09/pageviews-202609-user.bz2');
  });

  it('ne garde que fr.wikipedia', () => {
    expect(parserLigneDump('fr.wikipedia Tour_Eiffel 1359783 desktop 4000 A1B2')).toEqual({ titre: 'Tour Eiffel', vues: 4000 });
    expect(parserLigneDump('en.wikipedia Eiffel_Tower 9 desktop 4000 A1')).toBeNull();
    expect(parserLigneDump('fr.wiktionary chat 1 desktop 40 A1')).toBeNull();
    expect(parserLigneDump('fr.wikipedia Cassé null desktop pasunnombre')).toBeNull();
  });

  it('additionne les modes d’accès et applique le seuil', async () => {
    const nb = await importerMois(db, '2026-09', flux([
      'fr.wikipedia Tour_Eiffel 1 desktop 200 A', 'fr.wikipedia Tour_Eiffel 1 mobile-web 150 A',
      'fr.wikipedia Élan 2 desktop 299 A', 'fr.wikipedia Elan 3 desktop 400 A',
    ]), 300);
    expect(nb).toBe(2);
    const [lignes] = await db.query('SELECT titre, vues FROM vues_mensuelles ORDER BY titre');
    expect(lignes).toEqual([{ titre: 'Elan', vues: 400 }, { titre: 'Tour Eiffel', vues: 350 }]);
  });

  it('refuse de télécharger sans User-Agent', async () => {
    const fetchFn = async () => { throw new Error('ne doit pas être appelé'); };
    await expect(lignesDepuisUrl('http://x', { userAgent: '', fetchFn })).rejects.toThrow('WIKI_USER_AGENT manquant');
  });

  it('rejette sur flux corrompu et conserve les données du mois', async () => {
    await db.query("INSERT INTO vues_mensuelles VALUES ('2026-09', 'Paris', 1000)");
    const fetchFn = async () => ({
      ok: true,
      body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('pas du bz2 du tout')); c.close(); } }),
    });
    const lignes = await lignesDepuisUrl('http://x', { userAgent: 'test', fetchFn });
    await expect(importerMois(db, '2026-09', lignes, 1)).rejects.toThrow();
    const [rows] = await db.query('SELECT titre, vues FROM vues_mensuelles');
    expect(rows).toEqual([{ titre: 'Paris', vues: 1000 }]);
  });

  it('rejette sur coupure réseau en cours de flux', async () => {
    const fetchFn = async () => ({
      ok: true,
      body: new ReadableStream({ pull(c) { c.error(new Error('réseau coupé')); } }),
    });
    const lignes = await lignesDepuisUrl('http://x', { userAgent: 'test', fetchFn });
    await expect(importerMois(db, '2026-09', lignes, 1)).rejects.toThrow();
  });

  it('télécharge seulement les mois manquants, purge les anciens et additionne', async () => {
    await db.query("INSERT INTO vues_mensuelles VALUES ('2026-09', 'Paris', 1000), ('2025-01', 'Vieux', 999)");
    const ouverts = [];
    const vues = await vuesDepuisDumps(db, new Date('2026-10-10T00:00:00Z'), {
      nbMois: 2, seuil: 1, log: () => {},
      ouvrirLignes: async (url) => { ouverts.push(url); return flux(['fr.wikipedia Paris 1 desktop 500 A', 'fr.wikipedia Lyon 2 desktop 50 A']); },
    });
    expect(ouverts).toEqual([urlDumpMensuel('2026-08')]);
    expect(vues).toEqual(new Map([['Paris', 1500], ['Lyon', 50]]));
    const [[{ n }]] = await db.query("SELECT COUNT(*) AS n FROM vues_mensuelles WHERE mois = '2025-01'");
    expect(Number(n)).toBe(0);
  });
});
