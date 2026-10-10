import { Router } from 'express';
import { RARETES, TYPES } from '../config/jeu.js';
import { ErreurJeu } from '../erreurs.js';
import { versCarteVue } from '../jeu/cartes.js';

const PAR_PAGE_MAX = 100;
const PAGE_MAX = 10000;

const listeAutorisee = (valeur, autorisees) =>
  (typeof valeur === 'string' ? valeur.split(',') : []).filter((v) => autorisees.includes(v));

const echapperLike = (texte) => texte.replace(/[\\%_]/g, (c) => `\\${c}`);

function filtres(query) {
  const clauses = [];
  const params = [];
  const raretes = listeAutorisee(query.rarete, RARETES);
  if (raretes.length) { clauses.push('c.rarete IN (?)'); params.push(raretes); }
  const types = listeAutorisee(query.type, TYPES);
  if (types.length) { clauses.push('c.type IN (?)'); params.push(types); }
  if (typeof query.q === 'string' && query.q.trim()) {
    clauses.push('c.titre LIKE ?');
    params.push(`%${echapperLike(query.q.trim())}%`);
  }
  return { where: clauses.map((c) => ` AND ${c}`).join(''), params };
}

export function routeurAlbum(db) {
  const r = Router();

  r.get('/', async (req, res) => {
    const page = Math.min(PAGE_MAX, Math.max(1, Number.parseInt(req.query.page, 10) || 1));
    const parPage = Math.min(PAR_PAGE_MAX, Math.max(1, Number.parseInt(req.query.parPage, 10) || 60));
    const decalage = (page - 1) * parPage;
    const { where, params } = filtres(req.query);
    let total;
    let cartes;

    if (req.query.manquantes === '1') {
      const base = `FROM catalogue c WHERE c.actif = 1
        AND NOT EXISTS (SELECT 1 FROM cartes_joueur cj WHERE cj.joueur_id = ? AND cj.carte_id = c.id)${where}`;
      [[{ total }]] = await db.query(`SELECT COUNT(*) AS total ${base}`, [req.joueurId, ...params]);
      const [lignes] = await db.query(
        `SELECT c.* ${base} ORDER BY c.rarete DESC, c.titre, c.id LIMIT ? OFFSET ?`,
        [req.joueurId, ...params, parPage, decalage],
      );
      cartes = lignes.map((c) => ({ ...versCarteVue(c), quantite: 0, epinglee: false }));
    } else {
      const base = `FROM cartes_joueur cj
        JOIN catalogue c ON c.id = cj.carte_id
        LEFT JOIN epingles e ON e.joueur_id = cj.joueur_id AND e.carte_id = c.id
        WHERE cj.joueur_id = ?${where}`;
      [[{ total }]] = await db.query(`SELECT COUNT(DISTINCT c.id) AS total ${base}`, [req.joueurId, ...params]);
      const [lignes] = await db.query(
        `SELECT c.*, COUNT(*) AS quantite, MAX(e.carte_id IS NOT NULL) AS epinglee ${base}
         GROUP BY c.id ORDER BY epinglee DESC, c.rarete DESC, c.titre, c.id LIMIT ? OFFSET ?`,
        [req.joueurId, ...params, parPage, decalage],
      );
      cartes = lignes.map((c) => ({ ...versCarteVue(c), quantite: Number(c.quantite), epinglee: Boolean(c.epinglee) }));
    }

    const [[{ possedees }]] = await db.query(
      'SELECT COUNT(DISTINCT carte_id) AS possedees FROM cartes_joueur WHERE joueur_id = ?', [req.joueurId],
    );
    const [[{ tailleCatalogue }]] = await db.query('SELECT COUNT(*) AS tailleCatalogue FROM catalogue WHERE actif = 1');
    res.json({
      cartes, total: Number(total), page, parPage,
      possedees: Number(possedees), tailleCatalogue: Number(tailleCatalogue),
    });
  });

  r.patch('/:carteId/epingle', async (req, res) => {
    const carteId = Number(req.params.carteId);
    const epinglee = req.body?.epinglee;
    if (!Number.isInteger(carteId) || typeof epinglee !== 'boolean') {
      throw new ErreurJeu(400, 'REQUETE_INVALIDE', 'Requête invalide.');
    }
    const [[{ n }]] = await db.query(
      'SELECT COUNT(*) AS n FROM cartes_joueur WHERE joueur_id = ? AND carte_id = ?', [req.joueurId, carteId],
    );
    if (!Number(n)) throw new ErreurJeu(404, 'CARTE_NON_POSSEDEE', 'Tu ne possèdes pas cette carte.');
    if (epinglee) {
      await db.query('INSERT IGNORE INTO epingles (joueur_id, carte_id) VALUES (?, ?)', [req.joueurId, carteId]);
    } else {
      await db.query('DELETE FROM epingles WHERE joueur_id = ? AND carte_id = ?', [req.joueurId, carteId]);
    }
    res.json({ carteId, epinglee });
  });

  return r;
}
