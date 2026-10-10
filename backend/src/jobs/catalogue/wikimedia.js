import { lots } from '../../utils/lots.js';

const API_WP = 'https://fr.wikipedia.org/w/api.php';
const API_WD = 'https://www.wikidata.org/w/api.php';
const API_TOP = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/top/fr.wikipedia/all-access';
const CUMULES = ['extlinks', 'categories'];

export function creerClientWiki({
  fetch: f = globalThis.fetch,
  userAgent,
  attente = (ms) => new Promise((r) => setTimeout(r, ms)),
} = {}) {
  if (!userAgent) throw new Error('userAgent requis (politique Wikimedia)');
  const entetes = { 'User-Agent': userAgent };

  async function appeler(base, params) {
    // Wikidata : maxlag reflète le lag du query service (WDQS), sans rapport avec une lecture wbgetentities.
    const lag = base === API_WD ? {} : { maxlag: '5' };
    const qs = new URLSearchParams({ format: 'json', formatversion: '2', ...lag, ...params });
    for (let essai = 1; essai <= 5; essai++) {
      const rep = await f(`${base}?${qs}`, { headers: entetes });
      if (rep.status === 429 || rep.status >= 500) { await attente(5000 * essai); continue; }
      const json = await rep.json();
      if (json.error?.code === 'maxlag') { await attente(5000); continue; }
      if (json.error) throw new Error(`API Wikimedia : ${json.error.code} ${json.error.info}`);
      return json;
    }
    throw new Error(`API Wikimedia indisponible : ${base}`);
  }

  /** action=query en suivant « continue » ; fusionne les pages et cumule extlinks/categories. */
  async function requeteComplete(params) {
    const pages = new Map();
    let suite = {};
    while (suite) {
      const json = await appeler(API_WP, { action: 'query', ...params, ...suite });
      for (const p of json.query?.pages ?? []) {
        const cle = p.pageid ?? p.title;
        const existante = pages.get(cle);
        if (!existante) { pages.set(cle, p); continue; }
        for (const champ of CUMULES) if (p[champ]) existante[champ] = [...(existante[champ] ?? []), ...p[champ]];
      }
      suite = json.continue ?? null;
    }
    return [...pages.values()];
  }

  async function parPage(pageIds, taille, params, lire) {
    const resultat = new Map();
    for (const lot of lots(pageIds, taille)) {
      for (const p of await requeteComplete({ ...params, pageids: lot.join('|') })) {
        const valeur = lire(p);
        if (valeur !== undefined) resultat.set(p.pageid, valeur);
      }
    }
    return resultat;
  }

  return {
    async metadonnees(titres) {
      const res = [];
      for (const lot of lots(titres, 50)) {
        const pages = await requeteComplete({
          prop: 'info|pageprops|pageimages', ppprop: 'disambiguation|wikibase_item',
          piprop: 'thumbnail', pithumbsize: '400', pilimit: '50', titles: lot.join('|'),
        });
        for (const p of pages) {
          res.push({
            titre: p.title, pageId: p.pageid ?? null, existe: !p.missing && !p.invalid, ns: p.ns ?? 0,
            redirection: Boolean(p.redirect), homonymie: p.pageprops?.disambiguation !== undefined,
            longueur: p.length ?? 0, wikidata: p.pageprops?.wikibase_item ?? null, image: p.thumbnail?.source ?? null,
          });
        }
      }
      return res;
    },
    extraits: (pageIds) => parPage(pageIds, 20,
      { prop: 'extracts', exintro: '1', explaintext: '1', exsentences: '2', exlimit: '20' },
      (p) => p.extract ?? undefined),
    labels: (pageIds) => parPage(pageIds, 50,
      { prop: 'categories', clcategories: 'Catégorie:Article de qualité|Catégorie:Bon article', cllimit: 'max' },
      (p) => {
        const titres = (p.categories ?? []).map((c) => c.title);
        if (titres.includes('Catégorie:Article de qualité')) return 'qualite';
        if (titres.includes('Catégorie:Bon article')) return 'bon';
        return undefined;
      }),
    liensExternes: (pageIds) => parPage(pageIds, 50,
      { prop: 'extlinks', ellimit: 'max' }, (p) => (p.extlinks ?? []).length),
    categories: (pageIds) => parPage(pageIds, 50,
      { prop: 'categories', cllimit: 'max', clshow: '!hidden' }, (p) => (p.categories ?? []).map((c) => c.title)),
    async natures(qids) {
      const res = new Map();
      for (const lot of lots(qids, 50)) {
        const json = await appeler(API_WD, { action: 'wbgetentities', props: 'claims', ids: lot.join('|') });
        for (const [qid, entite] of Object.entries(json.entities ?? {})) {
          res.set(qid, (entite.claims?.P31 ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean));
        }
      }
      return res;
    },
    async topMensuel(mois) {
      const [annee, mm] = mois.split('-');
      const rep = await f(`${API_TOP}/${annee}/${mm}/all-days`, { headers: entetes });
      if (rep.status === 404) return [];
      if (!rep.ok) throw new Error(`Classement ${mois} indisponible (${rep.status})`);
      const json = await rep.json();
      return (json.items?.[0]?.articles ?? []).map((a) => ({ titre: a.article.replace(/_/g, ' '), vues: a.views }));
    },
  };
}
