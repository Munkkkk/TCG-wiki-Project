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

const vendre = (id, ventes) => request(app).post('/api/doublons/vendre').set('Cookie', cookiePour(id)).send({ ventes });
const possedes = async (id, carteId) =>
  Number((await db.query('SELECT COUNT(*) n FROM cartes_joueur WHERE joueur_id = ? AND carte_id = ?', [id, carteId]))[0][0].n);

async function scenario() {
  const [commune, rare, unique, epinglee] = await creerCartes(db, [
    { rarete: 'commune', titre: 'Cassoulet' }, { rarete: 'rare', titre: 'Lyon' },
    { rarete: 'legendaire', titre: 'Napoléon Ier' }, { rarete: 'commune', titre: 'Loire' },
  ]);
  const id = await creerJoueur(db, { pieces: 10 });
  await donnerCartes(db, id, [commune, commune, commune, rare, rare, unique, epinglee, epinglee]);
  await db.query('INSERT INTO epingles (joueur_id, carte_id) VALUES (?, ?)', [id, epinglee]);
  return { id, commune, rare, unique, epinglee };
}

describe('GET /api/doublons', () => {
  it('liste les doublons vendables, sans les cartes uniques ni épinglées', async () => {
    const { id, commune, rare } = await scenario();
    const rep = await request(app).get('/api/doublons').set('Cookie', cookiePour(id));
    expect(rep.body.doublons).toEqual([
      expect.objectContaining({ carteId: commune, titre: 'Cassoulet', vendables: 2, prixUnitaire: 5 }),
      expect.objectContaining({ carteId: rare, titre: 'Lyon', vendables: 1, prixUnitaire: 15 }),
    ]);
  });
});

describe('POST /api/doublons/vendre', () => {
  it('vend, garde toujours un exemplaire et crédite les pièces', async () => {
    const { id, commune, rare } = await scenario();
    const rep = await vendre(id, [{ carteId: commune, quantite: 2 }, { carteId: rare, quantite: 1 }]);
    expect(rep.body).toEqual({ cartesVendues: 3, piecesGagnees: 25, pieces: 35 });
    expect(await possedes(id, commune)).toBe(1);
    expect(await possedes(id, rare)).toBe(1);
  });

  it('plafonne une quantité trop grande', async () => {
    const { id, commune } = await scenario();
    const rep = await vendre(id, [{ carteId: commune, quantite: 1000000 }]);
    expect(rep.body.cartesVendues).toBe(2);
    expect(await possedes(id, commune)).toBe(1);
  });

  it('ne vend ni le dernier exemplaire, ni une carte épinglée, ni une carte inconnue', async () => {
    const { id, unique, epinglee } = await scenario();
    const rep = await vendre(id, [
      { carteId: unique, quantite: 1 }, { carteId: epinglee, quantite: 1 }, { carteId: 999999, quantite: 1 },
    ]);
    expect(rep.body).toEqual({ cartesVendues: 0, piecesGagnees: 0, pieces: 10 });
    expect(await possedes(id, epinglee)).toBe(2);
  });

  it('retire les exemplaires les plus récents', async () => {
    const [carte] = await creerCartes(db, [{ rarete: 'commune' }]);
    const id = await creerJoueur(db);
    await donnerCartes(db, id, [carte], new Date('2026-01-01T00:00:00Z'));
    await donnerCartes(db, id, [carte], new Date('2026-06-01T00:00:00Z'));
    await vendre(id, [{ carteId: carte, quantite: 1 }]);
    const [[reste]] = await db.query('SELECT obtenue_le FROM cartes_joueur WHERE joueur_id = ?', [id]);
    expect(reste.obtenue_le.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it.each([
    [undefined],
    ['pas-un-tableau'],
    [[]],
    [[{ carteId: 1, quantite: -1 }]],
    [[{ carteId: 1, quantite: 1.5 }]],
    [[{ carteId: 'x', quantite: 1 }]],
  ])('refuse une requête invalide (%o) sans créer de pièces', async (ventes) => {
    const { id } = await scenario();
    const rep = await vendre(id, ventes);
    expect(rep.status).toBe(400);
    expect(rep.body.code).toBe('REQUETE_INVALIDE');
    const [[j]] = await db.query('SELECT pieces FROM joueurs WHERE id = ?', [id]);
    expect(j.pieces).toBe(10);
  });
});
