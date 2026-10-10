import { describe, it, expect } from 'vitest';
import { creerClientWiki } from '../src/jobs/catalogue/wikimedia.js';
import { moisPrecedents, vuesDepuisTop } from '../src/jobs/catalogue/sources.js';

/** Faux fetch : chaque appel reçoit l'URL parsée et renvoie { status?, corps }. */
function fauxFetch(repondre) {
  const appels = [];
  const f = async (url, init) => {
    const u = new URL(url);
    appels.push({ u, init });
    const { status = 200, corps } = repondre(u, appels.length);
    return { status, ok: status < 400, json: async () => corps };
  };
  return { f, appels };
}
const sansAttente = async () => {};

describe('client Wikimedia', () => {
  it('exige un User-Agent', () => {
    expect(() => creerClientWiki({ fetch: async () => {} })).toThrow(/userAgent/);
  });

  it('lit les métadonnées et envoie le User-Agent', async () => {
    const { f, appels } = fauxFetch(() => ({
      corps: { query: { pages: [
        { pageid: 1, ns: 0, title: 'Paris', length: 300000, pageprops: { wikibase_item: 'Q90' }, thumbnail: { source: 'https://img/paris.jpg' } },
        { pageid: 2, ns: 0, title: 'Mercure', length: 1500, pageprops: { disambiguation: '' } },
        { ns: 0, title: 'Inexistant', missing: true },
      ] } },
    }));
    const client = creerClientWiki({ fetch: f, userAgent: 'Test/1.0', attente: sansAttente });
    const metas = await client.metadonnees(['Paris', 'Mercure', 'Inexistant']);
    expect(metas).toEqual([
      { titre: 'Paris', pageId: 1, existe: true, ns: 0, redirection: false, homonymie: false, longueur: 300000, wikidata: 'Q90', image: 'https://img/paris.jpg' },
      { titre: 'Mercure', pageId: 2, existe: true, ns: 0, redirection: false, homonymie: true, longueur: 1500, wikidata: null, image: null },
      { titre: 'Inexistant', pageId: null, existe: false, ns: 0, redirection: false, homonymie: false, longueur: 0, wikidata: null, image: null },
    ]);
    expect(appels[0].init.headers['User-Agent']).toBe('Test/1.0');
    expect(appels[0].u.searchParams.get('titles')).toBe('Paris|Mercure|Inexistant');
  });

  it('suit la pagination « continue » et cumule les liens externes', async () => {
    const { f } = fauxFetch((u) => (u.searchParams.get('elcontinue')
      ? { corps: { query: { pages: [{ pageid: 1, title: 'A', extlinks: [{ url: 'c' }] }] } } }
      : { corps: { continue: { elcontinue: '1|2', continue: '||' }, query: { pages: [{ pageid: 1, title: 'A', extlinks: [{ url: 'a' }, { url: 'b' }] }, { pageid: 2, title: 'B' }] } } }));
    const client = creerClientWiki({ fetch: f, userAgent: 'Test/1.0', attente: sansAttente });
    expect(await client.liensExternes([1, 2])).toEqual(new Map([[1, 3], [2, 0]]));
  });

  it('réessaie sur maxlag puis réussit', async () => {
    const { f, appels } = fauxFetch((u, n) => (n === 1
      ? { corps: { error: { code: 'maxlag', info: 'lag' } } }
      : { corps: { query: { pages: [{ pageid: 1, title: 'A', extract: 'Texte.' }] } } }));
    const client = creerClientWiki({ fetch: f, userAgent: 'Test/1.0', attente: sansAttente });
    expect(await client.extraits([1])).toEqual(new Map([[1, 'Texte.']]));
    expect(appels).toHaveLength(2);
  });

  it('lit les labels et les natures Wikidata', async () => {
    const { f } = fauxFetch((u) => (u.hostname === 'www.wikidata.org'
      ? { corps: { entities: { Q90: { claims: { P31: [{ mainsnak: { datavalue: { value: { id: 'Q515' } } } }] } } } } }
      : { corps: { query: { pages: [
        { pageid: 1, title: 'A', categories: [{ title: 'Catégorie:Article de qualité' }] },
        { pageid: 2, title: 'B', categories: [{ title: 'Catégorie:Bon article' }] },
        { pageid: 3, title: 'C' },
      ] } } }));
    const client = creerClientWiki({ fetch: f, userAgent: 'Test/1.0', attente: sansAttente });
    expect(await client.labels([1, 2, 3])).toEqual(new Map([[1, 'qualite'], [2, 'bon']]));
    expect(await client.natures(['Q90'])).toEqual(new Map([['Q90', ['Q515']]]));
  });

  it('topMensuel : lit le classement et renvoie [] si le mois est absent', async () => {
    const { f } = fauxFetch((u) => (u.pathname.includes('/2026/09/')
      ? { corps: { items: [{ articles: [{ article: 'Tour_Eiffel', views: 900 }] }] } }
      : { status: 404, corps: {} }));
    const client = creerClientWiki({ fetch: f, userAgent: 'Test/1.0', attente: sansAttente });
    expect(await client.topMensuel('2026-09')).toEqual([{ titre: 'Tour Eiffel', vues: 900 }]);
    expect(await client.topMensuel('2026-10')).toEqual([]);
  });
});

describe('sources de vues', () => {
  it('moisPrecedents : mois complets uniquement', () => {
    expect(moisPrecedents(new Date('2026-01-15T00:00:00Z'), 3)).toEqual(['2025-12', '2025-11', '2025-10']);
  });

  it('vuesDepuisTop : additionne les mois', async () => {
    const client = { topMensuel: async (mois) => (mois === '2026-09'
      ? [{ titre: 'Paris', vues: 10 }, { titre: 'Lyon', vues: 5 }]
      : [{ titre: 'Paris', vues: 1 }]) };
    expect(await vuesDepuisTop(client, new Date('2026-10-10T00:00:00Z'), 2))
      .toEqual(new Map([['Paris', 11], ['Lyon', 5]]));
  });
});
