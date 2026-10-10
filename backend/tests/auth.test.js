import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { creerApp } from '../src/app.js';
import { preparerBaseTest, viderBase } from './aide/db.js';
import { SECRET_TEST } from './aide/fabriques.js';

let db;
let app;
beforeAll(async () => { db = await preparerBaseTest(); });
beforeEach(async () => { await viderBase(db); app = creerApp(db, { jwtSecret: SECRET_TEST }); });
afterAll(async () => { await db.end(); });

const inscrire = (agent, champs = {}) => agent.post('/api/auth/inscription')
  .send({ email: 'alice@test.fr', pseudo: 'alice', motDePasse: 'motdepasse', ...champs });

describe('inscription', () => {
  it('crée un compte avec 10 paquets et 0 pièce, et ouvre la session', async () => {
    const agent = request.agent(app);
    const rep = await inscrire(agent);
    expect(rep.status).toBe(201);
    expect(rep.body).toMatchObject({
      pseudo: 'alice', email: 'alice@test.fr', pieces: 0, paquetsStockes: 10, paquetsMax: 10,
      prochainPaquetDansMs: null, paquetsAvantPitie: 50, venteAutoCommunes: false,
    });
    expect(rep.headers['set-cookie'][0]).toMatch(/session=.*HttpOnly/i);
    expect((await agent.get('/api/moi')).status).toBe(200);
  });

  it("normalise l'email (casse et espaces)", async () => {
    await inscrire(request(app), { email: '  Alice@Test.FR ' });
    const rep = await request(app).post('/api/auth/connexion').send({ email: 'alice@test.fr', motDePasse: 'motdepasse' });
    expect(rep.status).toBe(200);
    const doublon = await inscrire(request(app), { email: 'ALICE@test.fr', pseudo: 'autre' });
    expect(doublon.status).toBe(409);
    expect(doublon.body.code).toBe('EMAIL_PRIS');
  });

  it('refuse un pseudo déjà pris, quelle que soit la casse', async () => {
    await inscrire(request(app));
    const rep = await inscrire(request(app), { email: 'b@test.fr', pseudo: 'ALICE' });
    expect(rep.status).toBe(409);
    expect(rep.body.code).toBe('PSEUDO_PRIS');
  });

  it.each([
    [{ motDePasse: 'court12' }, 'MOT_DE_PASSE_TROP_COURT'],
    [{ pseudo: 'a' }, 'PSEUDO_INVALIDE'],
    [{ pseudo: 'pas de espaces' }, 'PSEUDO_INVALIDE'],
    [{ email: 'pas-un-email' }, 'EMAIL_INVALIDE'],
    [{ email: undefined }, 'EMAIL_INVALIDE'],
  ])('valide les champs %o', async (champs, code) => {
    const rep = await inscrire(request(app), champs);
    expect(rep.status).toBe(400);
    expect(rep.body.code).toBe(code);
  });
});

describe('connexion', () => {
  it('refuse un mauvais mot de passe', async () => {
    await inscrire(request(app));
    const rep = await request(app).post('/api/auth/connexion').send({ email: 'alice@test.fr', motDePasse: 'mauvais!!' });
    expect(rep.status).toBe(401);
    expect(rep.body.code).toBe('IDENTIFIANTS_INVALIDES');
  });

  it('bloque au 6e essai en 15 minutes', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/connexion').send({ email: 'x@test.fr', motDePasse: 'mauvais!!' });
    }
    const rep = await request(app).post('/api/auth/connexion').send({ email: 'x@test.fr', motDePasse: 'mauvais!!' });
    expect(rep.status).toBe(429);
    expect(rep.body.code).toBe('TROP_DE_TENTATIVES');
  });

  it('déconnexion : la session ne fonctionne plus', async () => {
    const agent = request.agent(app);
    await inscrire(agent);
    expect((await agent.post('/api/auth/deconnexion')).status).toBe(204);
    const rep = await agent.get('/api/moi');
    expect(rep.status).toBe(401);
    expect(rep.body.code).toBe('NON_CONNECTE');
  });
});

describe('/api/moi', () => {
  it('refuse sans session', async () => {
    const rep = await request(app).get('/api/moi');
    expect(rep.status).toBe(401);
    expect(rep.body.code).toBe('NON_CONNECTE');
  });

  it('applique la recharge à la lecture', async () => {
    const agent = request.agent(app);
    const { body } = await inscrire(agent);
    const ilYa = new Date(Date.now() - 3 * 60 * 60 * 1000 - 1000);
    await db.query('UPDATE joueurs SET paquets_stockes = 2, dernier_calcul = ? WHERE id = ?', [ilYa, body.id]);
    const rep = await agent.get('/api/moi');
    expect(rep.body.paquetsStockes).toBe(5);
    expect(rep.body.prochainPaquetDansMs).toBeGreaterThan(0);
  });

  it('modifie le pseudo et la vente automatique', async () => {
    const agent = request.agent(app);
    await inscrire(agent);
    const rep = await agent.patch('/api/moi').send({ pseudo: 'alice_2', venteAutoCommunes: true });
    expect(rep.status).toBe(200);
    expect(rep.body).toMatchObject({ pseudo: 'alice_2', venteAutoCommunes: true });
  });

  it('refuse un pseudo invalide ou un booléen mal typé', async () => {
    const agent = request.agent(app);
    await inscrire(agent);
    expect((await agent.patch('/api/moi').send({ pseudo: 'x' })).body.code).toBe('PSEUDO_INVALIDE');
    expect((await agent.patch('/api/moi').send({ venteAutoCommunes: 'oui' })).status).toBe(400);
  });
});
