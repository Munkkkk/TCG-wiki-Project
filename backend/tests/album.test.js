import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { creerApp } from '../src/app.js';
import { preparerBaseTest, viderBase } from './aide/db.js';
import { SECRET_TEST, creerJoueur, creerCartes, donnerCartes, cookiePour } from './aide/fabriques.js';

let db;
let app;
beforeAll(async () => { db = await preparerBaseTest(); });
beforeEach(async () => { await viderBase(db); app = creerApp(db, { jwtSecret: SECRET_TEST }); });
afterAll(async () => { await db.end(); });

const get = (url, id) => request(app).get(url).set('Cookie', cookiePour(id));

async function scenario() {
  const [napoleon, lyon, ornithorynque, pourcent, absente] = await creerCartes(db, [
    { rarete: 'legendaire', titre: 'Napoléon Ier', type: 'personnalite' },
    { rarete: 'rare', titre: 'Lyon', type: 'lieu' },
    { rarete: 'commune', titre: 'Ornithorynque', type: 'nature' },
    { rarete: 'commune', titre: '100 % pur jus', type: 'culture' },
    { rarete: 'rare', titre: 'Carte absente', type: 'science' },
  ]);
  const id = await creerJoueur(db);
  await donnerCartes(db, id, [napoleon, lyon, ornithorynque, ornithorynque, ornithorynque, pourcent]);
  return { id, napoleon, lyon, ornithorynque, pourcent, absente };
}

describe('GET /api/album', () => {
  it('regroupe par carte avec la quantité, la plus rare en premier', async () => {
    const { id } = await scenario();
    const rep = await get('/api/album', id);
    expect(rep.status).toBe(200);
    expect(rep.body.cartes.map((c) => [c.titre, c.quantite])).toEqual([
      ['Napoléon Ier', 1], ['Lyon', 1], ['100 % pur jus', 1], ['Ornithorynque', 3],
    ]);
    expect(rep.body).toMatchObject({ total: 4, possedees: 4, tailleCatalogue: 5, page: 1 });
  });

  it('filtre par rareté, type et recherche (accents ignorés)', async () => {
    const { id } = await scenario();
    expect((await get('/api/album?rarete=commune', id)).body.cartes).toHaveLength(2);
    expect((await get('/api/album?type=lieu,nature', id)).body.cartes.map((c) => c.titre)).toEqual(['Lyon', 'Ornithorynque']);
    expect((await get('/api/album?q=napoleon', id)).body.cartes.map((c) => c.titre)).toEqual(['Napoléon Ier']);
  });

  it('cherche % et _ littéralement', async () => {
    const { id } = await scenario();
    expect((await get('/api/album?q=%25', id)).body.cartes.map((c) => c.titre)).toEqual(['100 % pur jus']);
    expect((await get('/api/album?q=_', id)).body.cartes).toHaveLength(0);
  });

  it('ignore les valeurs de filtre inconnues', async () => {
    const { id } = await scenario();
    expect((await get('/api/album?rarete=inexistante', id)).body.total).toBe(4);
  });

  it('liste les cartes manquantes', async () => {
    const { id } = await scenario();
    const rep = await get('/api/album?manquantes=1', id);
    expect(rep.body.cartes.map((c) => [c.titre, c.quantite])).toEqual([['Carte absente', 0]]);
  });

  it('pagine', async () => {
    const { id } = await scenario();
    const rep = await get('/api/album?parPage=2&page=2', id);
    expect(rep.body.cartes.map((c) => c.titre)).toEqual(['100 % pur jus', 'Ornithorynque']);
    expect(rep.body.total).toBe(4);
  });
});

describe('page hors bornes', () => {
  it('renvoie 200 et une liste vide pour une page gigantesque', async () => {
    const { id } = await scenario();
    const rep = await get('/api/album?page=99999999999999999999', id);
    expect(rep.status).toBe(200);
    expect(rep.body.cartes).toEqual([]);
  });
});

describe('épingles', () => {
  it('épingle une carte possédée, qui passe en tête', async () => {
    const { id, ornithorynque } = await scenario();
    const rep = await request(app).patch(`/api/album/${ornithorynque}/epingle`).set('Cookie', cookiePour(id)).send({ epinglee: true });
    expect(rep.body).toEqual({ carteId: ornithorynque, epinglee: true });
    const album = await get('/api/album', id);
    expect(album.body.cartes[0]).toMatchObject({ titre: 'Ornithorynque', epinglee: true });
    await request(app).patch(`/api/album/${ornithorynque}/epingle`).set('Cookie', cookiePour(id)).send({ epinglee: false });
    expect((await get('/api/album', id)).body.cartes[0].titre).toBe('Napoléon Ier');
  });

  it('refuse une carte non possédée', async () => {
    const { id, absente } = await scenario();
    const rep = await request(app).patch(`/api/album/${absente}/epingle`).set('Cookie', cookiePour(id)).send({ epinglee: true });
    expect(rep.status).toBe(404);
    expect(rep.body.code).toBe('CARTE_NON_POSSEDEE');
  });
});

describe('GET /api/cartes/:id', () => {
  it('renvoie la fiche avec la quantité possédée', async () => {
    const { id, ornithorynque } = await scenario();
    const rep = await get(`/api/cartes/${ornithorynque}`, id);
    expect(rep.body).toMatchObject({ titre: 'Ornithorynque', quantite: 3, epinglee: false, actif: true });
  });

  it('404 sur une carte inconnue ou un id invalide', async () => {
    const { id } = await scenario();
    expect((await get('/api/cartes/99999', id)).body.code).toBe('CARTE_INTROUVABLE');
    expect((await get('/api/cartes/abc', id)).status).toBe(404);
  });
});
