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

describe('GET /api/collection', () => {
  it('compte les cartes différentes possédées, au total et par rareté, avec les taux du jeu', async () => {
    const [leg, rare, com1, com2, inactive] = await creerCartes(db, [
      { rarete: 'legendaire' }, { rarete: 'rare' }, { rarete: 'commune' }, { rarete: 'commune' },
      { rarete: 'rare', actif: 0 },
    ]);
    await creerCartes(db, [{ rarete: 'super_rare' }]);
    const id = await creerJoueur(db);
    await donnerCartes(db, id, [leg, rare, com1, com1, com1, com2, inactive]);

    const rep = await request(app).get('/api/collection').set('Cookie', cookiePour(id));
    expect(rep.status).toBe(200);
    expect(rep.body).toEqual({
      possedees: 5,
      tailleCatalogue: 5,
      parRarete: { commune: 2, rare: 2, ultra_rare: 0, super_rare: 0, legendaire: 1 },
      taux: { commune: 60, rare: 25, ultra_rare: 10, super_rare: 4, legendaire: 1 },
      pitie: 50,
    });
  });

  it('refuse sans session', async () => {
    expect((await request(app).get('/api/collection')).status).toBe(401);
  });
});
