import { parseArgs } from 'node:util';
import { creerPool } from '../../database.js';
import { JEU } from '../../config/jeu.js';
import { creerClientWiki } from './wikimedia.js';
import { vuesDepuisTop } from './sources.js';
import { construireCatalogue } from './construire.js';

const { values } = parseArgs({
  options: {
    source: { type: 'string', default: 'top' },
    n: { type: 'string', default: String(JEU.catalogue.n) },
    mois: { type: 'string', default: '12' },
  },
});

const db = creerPool(process.env.DB_NAME);
const client = creerClientWiki({ userAgent: process.env.WIKI_USER_AGENT });
const maintenant = new Date();
try {
  let vues;
  if (values.source === 'top') {
    vues = await vuesDepuisTop(client, maintenant, Number(values.mois));
  } else if (values.source === 'dumps') {
    const { vuesDepuisDumps } = await import('./dumps.js');
    vues = await vuesDepuisDumps(db, maintenant, { nbMois: Number(values.mois) });
  } else {
    throw new Error(`Source inconnue : ${values.source} (top ou dumps)`);
  }
  console.log(`${vues.size} titres avec des vues.`);
  await construireCatalogue({
    db, client, vues, n: Number(values.n), longueurMin: JEU.catalogue.longueurMin, parts: JEU.catalogue.parts, maintenant,
  });
} catch (e) {
  console.error('Échec, catalogue inchangé :', e.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
