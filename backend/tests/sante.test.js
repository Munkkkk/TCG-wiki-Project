import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { creerApp } from '../src/app.js';
import { preparerBaseTest } from './aide/db.js';
import { SECRET_TEST } from './aide/fabriques.js';

let db;
beforeAll(async () => { db = await preparerBaseTest(); });
afterAll(async () => { await db.end(); });

describe('socle', () => {
  it('répond sur /api/sante', async () => {
    const rep = await request(creerApp(db, { jwtSecret: SECRET_TEST })).get('/api/sante');
    expect(rep.status).toBe(200);
    expect(rep.body).toEqual({ ok: true });
  });

  it('refuse un secret JWT faible en production', () => {
    const avant = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => creerApp(db, { jwtSecret: 'court' })).toThrow(/JWT_SECRET/);
      expect(() => creerApp(db, { jwtSecret: 'une-longue-chaine-aleatoire' })).toThrow(/JWT_SECRET/);
      expect(() => creerApp(db, { jwtSecret: 'x'.repeat(32) })).not.toThrow();
    } finally {
      if (avant === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = avant;
    }
  });

  it('crée toutes les tables', async () => {
    const [tables] = await db.query('SHOW TABLES');
    const noms = tables.map((t) => Object.values(t)[0]);
    expect(noms).toEqual(expect.arrayContaining(
      ['joueurs', 'catalogue', 'cartes_joueur', 'epingles', 'ouvertures', 'vues_mensuelles'],
    ));
  });

  it('renvoie une erreur JSON sur une route inconnue', async () => {
    const rep = await request(creerApp(db, { jwtSecret: SECRET_TEST })).get('/api/nexiste-pas');
    expect(rep.status).toBe(404);
    expect(rep.body).toEqual({ code: 'ROUTE_INCONNUE', message: 'Route inconnue.' });
  });
});
