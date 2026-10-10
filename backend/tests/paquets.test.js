import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { creerApp } from '../src/app.js';
import { preparerBaseTest, viderBase } from './aide/db.js';
import { SECRET_TEST, creerJoueur, creerCartes, donnerCartes, cookiePour, rngFixe } from './aide/fabriques.js';

let db;
beforeAll(async () => { db = await preparerBaseTest(); });
beforeEach(async () => { await viderBase(db); });
afterAll(async () => { await db.end(); });

const appAvec = (rng) => creerApp(db, { jwtSecret: SECRET_TEST, rng });
const ouvrir = (app, id, source = 'stock') =>
  request(app).post('/api/paquets/ouvrir').set('Cookie', cookiePour(id)).send({ source });
const catalogueComplet = () => creerCartes(db, [
  { rarete: 'commune' }, { rarete: 'commune' }, { rarete: 'rare' },
  { rarete: 'ultra_rare' }, { rarete: 'super_rare' }, { rarete: 'legendaire' },
]);
const compter = async (sql, params) => Number((await db.query(sql, params))[0][0].n);

describe('POST /api/paquets/ouvrir', () => {
  it('ouvre un paquet du stock : 5 cartes, stock 9, compte à rebours lancé', async () => {
    await catalogueComplet();
    const id = await creerJoueur(db);
    const rep = await ouvrir(appAvec(), id);
    expect(rep.status).toBe(200);
    expect(rep.body.cartes).toHaveLength(5);
    expect(rep.body.cartes[0]).toEqual(expect.objectContaining({ titre: expect.any(String), nouvelle: expect.any(Boolean) }));
    expect(rep.body.etat.paquetsStockes).toBe(9);
    expect(rep.body.etat.prochainPaquetDansMs).toBeGreaterThan(59 * 60 * 1000);
    expect(await compter('SELECT COUNT(*) n FROM cartes_joueur WHERE joueur_id = ?', [id])).toBe(5);
    expect(await compter('SELECT COUNT(*) n FROM ouvertures WHERE joueur_id = ?', [id])).toBe(1);
  });

  it('refuse quand le stock est vide, sans rien modifier', async () => {
    await catalogueComplet();
    const id = await creerJoueur(db, { paquets_stockes: 0 });
    const rep = await ouvrir(appAvec(), id);
    expect(rep.status).toBe(409);
    expect(rep.body.code).toBe('STOCK_VIDE');
    expect(await compter('SELECT COUNT(*) n FROM cartes_joueur WHERE joueur_id = ?', [id])).toBe(0);
  });

  it('achat : débite 100 pièces sans toucher au stock', async () => {
    await catalogueComplet();
    const id = await creerJoueur(db, { pieces: 150 });
    const rep = await ouvrir(appAvec(), id, 'achat');
    expect(rep.status).toBe(200);
    expect(rep.body.etat).toMatchObject({ pieces: 50, paquetsStockes: 10 });
    const refus = await ouvrir(appAvec(), id, 'achat');
    expect(refus.status).toBe(409);
    expect(refus.body.code).toBe('PIECES_INSUFFISANTES');
  });

  it('refuse une source inconnue', async () => {
    const id = await creerJoueur(db);
    const rep = await ouvrir(appAvec(), id, 'gratuit');
    expect(rep.status).toBe(400);
    expect(rep.body.code).toBe('SOURCE_INVALIDE');
  });

  it('refuse si le catalogue est vide', async () => {
    const id = await creerJoueur(db);
    const rep = await ouvrir(appAvec(), id);
    expect(rep.status).toBe(409);
    expect(rep.body.code).toBe('CATALOGUE_VIDE');
  });

  it('se rabat sur une rareté disponible si une rareté est vide', async () => {
    await creerCartes(db, [{ rarete: 'commune' }]);
    const id = await creerJoueur(db);
    const rep = await ouvrir(appAvec(rngFixe([0.9999])), id);
    expect(rep.status).toBe(200);
    expect(rep.body.cartes.map((c) => c.rarete)).toEqual(Array(5).fill('commune'));
  });

  it('pitié : Légendaire forcée au 50e paquet, compteur remis à 0', async () => {
    await catalogueComplet();
    const id = await creerJoueur(db, { paquets_sans_legendaire: 49 });
    const rep = await ouvrir(appAvec(rngFixe([0])), id);
    expect(rep.body.cartes[4].rarete).toBe('legendaire');
    expect(rep.body.etat.paquetsAvantPitie).toBe(50);
  });

  it('deux ouvertures simultanées avec 1 seul paquet : une seule réussit', async () => {
    await catalogueComplet();
    const id = await creerJoueur(db, { paquets_stockes: 1 });
    const app = appAvec();
    const reps = await Promise.all([ouvrir(app, id), ouvrir(app, id)]);
    expect(reps.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await compter('SELECT COUNT(*) n FROM cartes_joueur WHERE joueur_id = ?', [id])).toBe(5);
  });

  it('marque comme nouvelles uniquement les cartes jamais possédées', async () => {
    const [a] = await creerCartes(db, [{ rarete: 'commune' }, { rarete: 'rare' }]);
    const id = await creerJoueur(db);
    await donnerCartes(db, id, [a]);
    const rep = await ouvrir(appAvec(rngFixe([0])), id);
    expect(rep.body.cartes.map((c) => c.nouvelle)).toEqual([false, false, false, false, true]);
  });

  it('vente automatique : revend les Communes en double', async () => {
    const [a] = await creerCartes(db, [{ rarete: 'commune' }, { rarete: 'rare' }]);
    const id = await creerJoueur(db, { vente_auto_communes: 1 });
    await donnerCartes(db, id, [a]);
    const rep = await ouvrir(appAvec(rngFixe([0])), id);
    expect(rep.body.venteAuto).toEqual({ cartes: 4, pieces: 20 });
    expect(rep.body.etat.pieces).toBe(20);
    expect(await compter('SELECT COUNT(*) n FROM cartes_joueur WHERE joueur_id = ? AND carte_id = ?', [id, a])).toBe(1);
  });

  it('vente automatique : ne touche pas aux cartes épinglées', async () => {
    const [a] = await creerCartes(db, [{ rarete: 'commune' }, { rarete: 'rare' }]);
    const id = await creerJoueur(db, { vente_auto_communes: 1 });
    await donnerCartes(db, id, [a]);
    await db.query('INSERT INTO epingles (joueur_id, carte_id) VALUES (?, ?)', [id, a]);
    const rep = await ouvrir(appAvec(rngFixe([0])), id);
    expect(rep.body.venteAuto).toEqual({ cartes: 0, pieces: 0 });
    expect(await compter('SELECT COUNT(*) n FROM cartes_joueur WHERE joueur_id = ? AND carte_id = ?', [id, a])).toBe(5);
  });
});
