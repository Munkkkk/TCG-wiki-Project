import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { preparerBaseTest, viderBase } from './aide/db.js';
import { construireCatalogue } from '../src/jobs/catalogue/construire.js';

let db;
beforeAll(async () => { db = await preparerBaseTest(); });
beforeEach(async () => { await viderBase(db); });
afterAll(async () => { await db.end(); });

const PARTS = { legendaire: 0.25, super_rare: 0.25, ultra_rare: 0.25, rare: 0.25, commune: 0 };
const ARTICLES = {
  'Napoléon Ier': { pageId: 1, longueur: 9000, wikidata: 'Q517' },
  Paris: { pageId: 2, longueur: 8000, wikidata: 'Q90' },
  Ornithorynque: { pageId: 3, longueur: 5000, wikidata: 'Q15343' },
  Mercure: { pageId: 4, longueur: 3000, homonymie: true },
  Bref: { pageId: 5, longueur: 100 },
  Cassoulet: { pageId: 6, longueur: 4000, wikidata: null },
};

function fauxClient({ echecNatures = false } = {}) {
  return {
    metadonnees: async (titres) => titres.map((titre) => ({
      titre, existe: true, ns: 0, redirection: false, homonymie: false, image: null, wikidata: null,
      ...ARTICLES[titre],
    })),
    extraits: async (ids) => new Map(ids.map((id) => [id, `Extrait ${id}`])),
    labels: async () => new Map([[1, 'qualite']]),
    liensExternes: async (ids) => new Map(ids.map((id) => [id, id * 10])),
    natures: async () => {
      if (echecNatures) throw new Error('Wikidata injoignable');
      return new Map([['Q517', ['Q5']], ['Q90', ['Q515']], ['Q15343', ['Q16521']]]);
    },
    categories: async () => new Map([[6, ['Catégorie:Truc']]]),
  };
}

const VUES = new Map([
  ['Napoléon Ier', 1000], ['Paris', 900], ['Ornithorynque', 500], ['Mercure', 800],
  ['Bref', 700], ['Cassoulet', 100], ['Liste des pays', 5000], ['1789', 4000],
]);
const options = (extra = {}) => ({ db, client: fauxClient(), vues: VUES, n: 4, longueurMin: 2000, parts: PARTS, log: () => {}, ...extra });

describe('construireCatalogue', () => {
  it('filtre, classe, calcule les stats et enregistre', async () => {
    const res = await construireCatalogue(options());
    expect(res).toEqual({ gardes: 4, desactives: 0 });
    const [lignes] = await db.query('SELECT page_id, titre, type, rarete, rang, attaque, defense, actif FROM catalogue ORDER BY rang');
    expect(lignes.map((l) => [l.titre, l.type, l.rarete, l.rang])).toEqual([
      ['Napoléon Ier', 'personnalite', 'legendaire', 1],
      ['Paris', 'lieu', 'super_rare', 2],
      ['Ornithorynque', 'nature', 'ultra_rare', 3],
      ['Cassoulet', 'culture', 'rare', 4],
    ]);
    expect(lignes[0].attaque).toBe(100);
    expect(lignes[3].attaque).toBe(1);
    expect(lignes[0].defense).toBeGreaterThan(lignes[1].defense);
  });

  it('respecte N', async () => {
    expect((await construireCatalogue(options({ n: 2 }))).gardes).toBe(2);
  });

  it('désactive les cartes sorties du top N lors du passage suivant', async () => {
    await construireCatalogue(options());
    const res = await construireCatalogue(options({ n: 2, maintenant: new Date(Date.now() + 1000) }));
    expect(res).toEqual({ gardes: 2, desactives: 2 });
    const [[{ actives }]] = await db.query('SELECT COUNT(*) AS actives FROM catalogue WHERE actif = 1');
    expect(Number(actives)).toBe(2);
  });

  it("garde l'ancien catalogue si une étape échoue", async () => {
    await construireCatalogue(options());
    await expect(construireCatalogue(options({ client: fauxClient({ echecNatures: true }) }))).rejects.toThrow(/Wikidata/);
    const [[{ actives }]] = await db.query('SELECT COUNT(*) AS actives FROM catalogue WHERE actif = 1');
    expect(Number(actives)).toBe(4);
  });

  it('refuse de vider le catalogue si aucun article n’est retenu', async () => {
    await expect(construireCatalogue(options({ vues: new Map([['1789', 10]]) }))).rejects.toThrow(/Aucun article/);
  });
});
