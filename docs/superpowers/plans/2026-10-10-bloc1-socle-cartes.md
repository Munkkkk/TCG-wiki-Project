# Bloc 1 — Socle + cartes : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** un joueur crée un compte, ouvre des paquets de cartes Wikipédia qui se rechargent, consulte son album et revend ses doublons, sur ordinateur comme sur mobile.

**Architecture :** API Express 5 (ESM) + MySQL dans `backend/`. Toute la logique de jeu y vit, dans des transactions. Les règles pures (recharge, tirage, stats du catalogue) sont isolées dans des modules sans base de données, faciles à tester. Un job Node construit le catalogue depuis Wikipédia et Wikidata. Le front Angular 22 (rendu client, SSR conservé pour le service des fichiers) appelle l'API via un proxy en dev, avec une session en cookie `httpOnly`.

**Tech Stack :** Node 24, Express 5, mysql2, bcryptjs, jsonwebtoken, cookie-parser, express-rate-limit, unbzip2-stream, Vitest + supertest (backend) ; Angular 22 (signals, standalone, control flow), Vitest via `ng test` (front).

**Spec :** `docs/superpowers/specs/2026-10-10-bloc1-socle-cartes-design.md`

## Global Constraints

- Toutes les valeurs de jeu sont dans `backend/src/config/jeu.js` : recharge 60 min, stock max 10, compte neuf 10 paquets / 0 pièce, 5 cartes par paquet, taux 60/25/10/4/1, 5e carte Rare ou mieux, pitié au 50e paquet, revente 5/15/40/100/300, paquet acheté 100 pièces.
- Raretés (codes) : `commune`, `rare`, `ultra_rare`, `super_rare`, `legendaire`. Types (codes) : `personnalite`, `lieu`, `histoire`, `science`, `culture`, `nature`.
- Catalogue : top N = 50 000 par défaut ; parts de rareté 1 % / 4 % / 10 % / 25 % / 60 % ; articles de moins de 2 000 octets exclus.
- Toute écriture sur les cartes, les paquets ou les pièces passe par Express, dans une transaction MySQL avec `SELECT … FOR UPDATE` sur la ligne `joueurs`.
- Erreurs API : `{ code, message }`, avec un message en français. Le JSON de l'API est en camelCase.
- Session : JWT dans le cookie `session`, `httpOnly`, `sameSite=lax`, `secure` en production, 30 jours.
- Connexion limitée à 5 essais / 15 min par IP.
- UI : thème sombre uniquement. Fond `#111113`, texte `#ededed`, gris `#8b8b90`, bordures `#26262b`. Couleurs de rareté : `#a8a29e` / `#3b82f6` / `#a855f7` / `#ec4899` / `#d97706`. Pas d'emojis dans l'interface. Icônes au trait.
- Navigation : menu en haut à partir de 768 px, barre en bas en dessous.
- Mention CC BY-SA 4.0 en pied de page, et lien vers l'article source sur chaque fiche.
- Écart avec la spec : la base de test est une base MySQL locale `wikimasters_test`, et non un conteneur Docker (Docker n'est pas installé).
- Écart avec la spec : le corps de `POST /api/doublons/vendre` est `{ ventes: [{ carteId, quantite }] }` (objet + camelCase), et non un tableau brut en snake_case.
- Écart avec la spec : la colonne « Dernières cartes » montre les cartes ouvertes pendant la visite en cours (pas d'historique serveur au bloc 1).
- Commits : messages en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Catalogue partiel** : une rareté sans aucune carte (petit catalogue en dev). Le tirage doit se rabattre sur une rareté disponible, sans erreur 500. → test dans la tâche 5.
2. **Horloge qui recule** : `dernier_calcul` situé dans le futur. Le stock ne doit jamais diminuer ni devenir négatif. → test dans la tâche 2.
3. **Requêtes de vente hostiles** : quantité négative, décimale ou énorme, carte inconnue ou non possédée. Aucune pièce ne doit être créée, et la réponse doit être un 400 ou une vente plafonnée. → tests dans la tâche 7.
4. **Recherche avec caractères spéciaux** : `%`, `_`, apostrophes dans la recherche d'album. Ils sont cherchés littéralement et ne servent jamais de jokers SQL. → test dans la tâche 6.
5. **Casse de l'email** : `Alice@Test.FR` et `alice@test.fr` désignent le même compte. → test dans la tâche 4.

---

## Structure des fichiers

```
backend/
  package.json                    (modifié : ESM, scripts, dépendances)
  vitest.config.js                (créé)
  .env.example                    (créé)
  src/
    server.js                     (réécrit : démarre l'app)
    app.js                        (créé : creerApp(db, options))
    database.js                   (réécrit : creerPool(nomBase))
    erreurs.js                    (ErreurJeu + gestionnaire)
    validation.js                 (email, pseudo, mot de passe)
    config/jeu.js                 (toutes les constantes de jeu)
    db/migrer.js, db/cli-migrer.js
    jeu/recharge.js               (pur)
    jeu/tirage.js                 (pur + rngCrypto)
    jeu/etat.js                   (état joueur renvoyé au front)
    jeu/cartes.js                 (versCarteVue)
    services/exemplaires.js       (compter / retirer des exemplaires)
    services/paquets.js           (ouvrirPaquet)
    routes/auth.js, moi.js, paquets.js, album.js, cartes.js, doublons.js
    middleware/session.js         (exigerConnexion)
    utils/lots.js
    jobs/catalogue/
      filtres.js, stats.js, types.js    (purs)
      wikimedia.js                      (client HTTP)
      sources.js                        (vues : API top + dumps)
      construire.js                     (orchestrateur + enregistrement)
      cli.js
  tests/
    aide/db.js, aide/fabriques.js
    *.test.js
src/ (Angular)
  styles.css                      (jetons du thème)
  app/app.ts, app.html, app.css, app.config.ts, app.routes.ts, app.routes.server.ts
  app/core/modeles.ts, libelles.ts, temps.ts(+spec), api.ts, session.ts, gardes.ts, intercepteur.ts
  app/layout/navigation/, app/layout/pied-de-page/
  app/ui/carte/(+spec)
  app/pages/auth/, paquets/, paquets/ouverture/, album/, doublons/(+selection.ts +spec), carte/, profil/
proxy.conf.json
```

À supprimer : `backend/src/routes/cards.js`, `src/app/components/*`, `src/app/pages/home`, `src/app/pages/card-detail`, `src/app/services/*`, `src/app/app.spec.ts`. La table MySQL `cards` existante n'est pas touchée.

---

### Task 1 : Socle backend (ESM, app testable, schéma, outillage de test)

**Files :**
- Modify : `backend/package.json`, `backend/.env` (ajout de variables, fichier non versionné)
- Create : `backend/vitest.config.js`, `backend/.env.example`, `backend/src/app.js`, `backend/src/erreurs.js`, `backend/src/db/migrer.js`, `backend/src/db/cli-migrer.js`, `backend/tests/aide/db.js`, `backend/tests/aide/fabriques.js`, `backend/tests/sante.test.js`
- Rewrite : `backend/src/database.js`, `backend/src/server.js`
- Delete : `backend/src/routes/cards.js`

**Interfaces :**
- Produces : `creerPool(nomBase: string): Pool` ; `creerApp(db, options?: { jwtSecret?: string, rng?: () => number, limiteConnexion?: { fenetreMs: number, max: number } }): express.App` ; `class ErreurJeu(status, code, message)` ; `gestionnaireErreurs` ; `migrer(db)` ; helpers de test `preparerBaseTest()`, `viderBase(db)`, `creerJoueur(db, champs?) → id`, `creerCartes(db, [{ rarete, titre?, type?, actif? }]) → ids[]`, `donnerCartes(db, joueurId, carteIds, obtenueLe?)`, `cookiePour(joueurId) → string`, `rngFixe(valeurs)`, `rngGraine(graine)`.

- [ ] **Step 1 : passer le backend en ESM et installer les dépendances**

Dans `backend/package.json`, remplacer `"type": "commonjs"`, `"main"` et `"scripts"` par :

```json
  "type": "module",
  "private": true,
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "vitest run",
    "migrer": "node src/db/cli-migrer.js",
    "catalogue": "node src/jobs/catalogue/cli.js"
  },
```

Puis :

```bash
cd backend
npm uninstall cors
npm install bcryptjs cookie-parser express-rate-limit jsonwebtoken
npm install -D vitest supertest
```

- [ ] **Step 2 : configuration**

`backend/vitest.config.js` :

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false, // une seule base de test partagée
    testTimeout: 20000,
  },
});
```

`backend/.env.example` :

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=wikimasters
DB_NAME_TEST=wikimasters_test
DB_PORT=3306
JWT_SECRET=une-longue-chaine-aleatoire
WIKI_USER_AGENT=WikiCards/0.1 (contact: ton-email@exemple.fr)
```

Ajouter à `backend/.env` (non versionné) un vrai secret :

```bash
echo "DB_NAME_TEST=wikimasters_test" >> .env
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")" >> .env
```

- [ ] **Step 3 : écrire le test qui échoue**

`backend/tests/aide/db.js` :

```js
import mysql from 'mysql2/promise';
import { creerPool } from '../../src/database.js';
import { migrer } from '../../src/db/migrer.js';

export const NOM_BASE_TEST = process.env.DB_NAME_TEST || 'wikimasters_test';

const TABLES = ['ouvertures', 'epingles', 'cartes_joueur', 'catalogue', 'joueurs', 'vues_mensuelles'];

export async function preparerBaseTest() {
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT || 3306),
  });
  await admin.query(
    `CREATE DATABASE IF NOT EXISTS \`${NOM_BASE_TEST}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  );
  await admin.end();
  const db = creerPool(NOM_BASE_TEST);
  await migrer(db);
  await viderBase(db);
  return db;
}

export async function viderBase(db) {
  const conn = await db.getConnection();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of TABLES) await conn.query(`TRUNCATE TABLE ${table}`);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    conn.release();
  }
}
```

`backend/tests/aide/fabriques.js` :

```js
import jwt from 'jsonwebtoken';

export const SECRET_TEST = 'secret-de-test';
let compteur = 0;

export async function creerJoueur(db, champs = {}) {
  compteur++;
  const valeurs = {
    email: `joueur${compteur}@test.fr`,
    mot_de_passe_hash: 'x',
    pseudo: `joueur${compteur}`,
    pieces: 0,
    paquets_stockes: 10,
    dernier_calcul: new Date(),
    paquets_sans_legendaire: 0,
    vente_auto_communes: 0,
    cree_le: new Date(),
    ...champs,
  };
  const [r] = await db.query('INSERT INTO joueurs SET ?', [valeurs]);
  return r.insertId;
}

export async function creerCartes(db, liste) {
  const ids = [];
  for (const c of liste) {
    compteur++;
    const [r] = await db.query('INSERT INTO catalogue SET ?', [{
      page_id: compteur,
      titre: c.titre ?? `Carte ${compteur}`,
      extrait: 'Extrait de test.',
      image_url: null,
      type: c.type ?? 'culture',
      rarete: c.rarete,
      attaque: 50,
      defense: 50,
      rang: compteur,
      vues_12_mois: 1000,
      actif: c.actif ?? 1,
      maj_le: new Date(),
    }]);
    ids.push(r.insertId);
  }
  return ids;
}

export async function donnerCartes(db, joueurId, carteIds, obtenueLe = new Date()) {
  if (!carteIds.length) return;
  await db.query('INSERT INTO cartes_joueur (joueur_id, carte_id, obtenue_le) VALUES ?', [
    carteIds.map((id) => [joueurId, id, obtenueLe]),
  ]);
}

export function cookiePour(joueurId) {
  return `session=${jwt.sign({ sub: String(joueurId) }, SECRET_TEST)}`;
}

/** Renvoie les valeurs données, en boucle. */
export function rngFixe(valeurs) {
  let i = 0;
  return () => valeurs[i++ % valeurs.length];
}

/** Générateur déterministe (mulberry32). */
export function rngGraine(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

`backend/tests/sante.test.js` :

```js
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
```

- [ ] **Step 4 : lancer le test et vérifier qu'il échoue**

Run : `cd backend && npx vitest run tests/sante.test.js`
Expected : FAIL, avec « Failed to load url ../../src/database.js » ou une erreur d'export `creerPool` introuvable.

- [ ] **Step 5 : implémenter**

`backend/src/database.js` :

```js
import 'dotenv/config';
import mysql from 'mysql2/promise';

export function creerPool(database) {
  return mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT || 3306),
    database,
    timezone: 'Z', // toutes les dates en UTC
    connectionLimit: 10,
  });
}
```

`backend/src/erreurs.js` :

```js
export class ErreurJeu extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function gestionnaireErreurs(err, req, res, next) {
  if (err instanceof ErreurJeu) {
    return res.status(err.status).json({ code: err.code, message: err.message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 'REQUETE_INVALIDE', message: 'Requête invalide.' });
  }
  console.error(err);
  res.status(500).json({ code: 'ERREUR_SERVEUR', message: 'Erreur interne, réessaie plus tard.' });
}
```

`backend/src/db/migrer.js` :

```js
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS joueurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    mot_de_passe_hash VARCHAR(100) NOT NULL,
    pseudo VARCHAR(20) NOT NULL UNIQUE,
    pieces INT NOT NULL DEFAULT 0,
    paquets_stockes INT NOT NULL DEFAULT 10,
    dernier_calcul DATETIME(3) NOT NULL,
    paquets_sans_legendaire INT NOT NULL DEFAULT 0,
    vente_auto_communes TINYINT(1) NOT NULL DEFAULT 0,
    cree_le DATETIME(3) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
  `CREATE TABLE IF NOT EXISTS catalogue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_id INT NOT NULL UNIQUE,
    titre VARCHAR(255) NOT NULL,
    extrait TEXT,
    image_url VARCHAR(1000),
    type ENUM('personnalite','lieu','histoire','science','culture','nature') NOT NULL,
    rarete ENUM('commune','rare','ultra_rare','super_rare','legendaire') NOT NULL,
    attaque TINYINT UNSIGNED NOT NULL,
    defense TINYINT UNSIGNED NOT NULL,
    rang INT NOT NULL,
    vues_12_mois BIGINT NOT NULL,
    actif TINYINT(1) NOT NULL DEFAULT 1,
    maj_le DATETIME(3) NOT NULL,
    INDEX idx_actif_rarete (actif, rarete)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
  `CREATE TABLE IF NOT EXISTS cartes_joueur (
    id INT AUTO_INCREMENT PRIMARY KEY,
    joueur_id INT NOT NULL,
    carte_id INT NOT NULL,
    obtenue_le DATETIME(3) NOT NULL,
    INDEX idx_joueur_carte (joueur_id, carte_id),
    FOREIGN KEY (joueur_id) REFERENCES joueurs(id) ON DELETE CASCADE,
    FOREIGN KEY (carte_id) REFERENCES catalogue(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS epingles (
    joueur_id INT NOT NULL,
    carte_id INT NOT NULL,
    PRIMARY KEY (joueur_id, carte_id),
    FOREIGN KEY (joueur_id) REFERENCES joueurs(id) ON DELETE CASCADE,
    FOREIGN KEY (carte_id) REFERENCES catalogue(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS ouvertures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    joueur_id INT NOT NULL,
    ouverte_le DATETIME(3) NOT NULL,
    source ENUM('stock','achat') NOT NULL,
    cartes JSON NOT NULL,
    FOREIGN KEY (joueur_id) REFERENCES joueurs(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS vues_mensuelles (
    mois CHAR(7) NOT NULL,
    titre VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    vues INT NOT NULL,
    PRIMARY KEY (mois, titre)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

export async function migrer(db) {
  for (const requete of SCHEMA) await db.query(requete);
}
```

`backend/src/db/cli-migrer.js` :

```js
import { creerPool } from '../database.js';
import { migrer } from './migrer.js';

const db = creerPool(process.env.DB_NAME);
await migrer(db);
await db.end();
console.log('Migration terminée.');
```

`backend/src/app.js` :

```js
import express from 'express';
import cookieParser from 'cookie-parser';
import { gestionnaireErreurs } from './erreurs.js';

export function creerApp(db, options = {}) {
  const secret = options.jwtSecret ?? process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET manquant');

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/sante', async (req, res) => {
    await db.query('SELECT 1');
    res.json({ ok: true });
  });

  // ROUTES (ajoutées par les tâches suivantes)

  app.use('/api', (req, res) => {
    res.status(404).json({ code: 'ROUTE_INCONNUE', message: 'Route inconnue.' });
  });
  app.use(gestionnaireErreurs);
  return app;
}
```

`backend/src/server.js` :

```js
import { creerPool } from './database.js';
import { creerApp } from './app.js';

const PORT = Number(process.env.PORT || 3000);
creerApp(creerPool(process.env.DB_NAME)).listen(PORT, () => {
  console.log(`API WikiCards sur http://localhost:${PORT}`);
});
```

Supprimer `backend/src/routes/cards.js`.

- [ ] **Step 6 : lancer les tests et vérifier qu'ils passent**

Run : `cd backend && npx vitest run tests/sante.test.js`
Expected : PASS (3 tests)

Run : `npm run migrer`
Expected : « Migration terminée. » (crée les tables dans `wikimasters`)

- [ ] **Step 7 : commit**

```bash
git add backend/package.json backend/package-lock.json backend/vitest.config.js backend/.env.example backend/src backend/tests
git commit -m "Backend : socle ESM, schéma MySQL et outillage de test

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2 : Configuration de jeu et recharge des paquets

**Files :**
- Create : `backend/src/config/jeu.js`, `backend/src/jeu/recharge.js`, `backend/tests/recharge.test.js`

**Interfaces :**
- Produces : `JEU` (constantes), `RARETES` (ordre croissant), `TYPES` ; `calculerRecharge({ paquetsStockes, dernierCalcul: Date }, maintenant: Date, cfg = JEU) → { paquetsStockes, dernierCalcul: Date }` ; `prochainPaquetDans({ paquetsStockes, dernierCalcul }, maintenant, cfg = JEU) → number | null` (ms).

- [ ] **Step 1 : écrire les tests qui échouent**

`backend/tests/recharge.test.js` :

```js
import { describe, it, expect } from 'vitest';
import { calculerRecharge, prochainPaquetDans } from '../src/jeu/recharge.js';

const CFG = { intervalleRechargeMs: 60 * 60 * 1000, paquetsMax: 10 };
const MIN = 60 * 1000;
const H = 60 * MIN;
const t0 = new Date('2026-10-10T10:00:00Z');
const apres = (ms) => new Date(t0.getTime() + ms);

describe('calculerRecharge', () => {
  it('ne gagne rien à 0 min', () => {
    expect(calculerRecharge({ paquetsStockes: 3, dernierCalcul: t0 }, t0, CFG))
      .toEqual({ paquetsStockes: 3, dernierCalcul: t0 });
  });

  it('ne gagne rien à 59 min', () => {
    expect(calculerRecharge({ paquetsStockes: 3, dernierCalcul: t0 }, apres(59 * MIN), CFG))
      .toEqual({ paquetsStockes: 3, dernierCalcul: t0 });
  });

  it('gagne 1 paquet à 60 min', () => {
    expect(calculerRecharge({ paquetsStockes: 3, dernierCalcul: t0 }, apres(H), CFG))
      .toEqual({ paquetsStockes: 4, dernierCalcul: apres(H) });
  });

  it('conserve le temps entamé (2 h 30 → +2, reste 30 min)', () => {
    expect(calculerRecharge({ paquetsStockes: 3, dernierCalcul: t0 }, apres(2.5 * H), CFG))
      .toEqual({ paquetsStockes: 5, dernierCalcul: apres(2 * H) });
  });

  it('plafonne à 10 et remet le compteur à maintenant', () => {
    const maintenant = apres(10 * H);
    expect(calculerRecharge({ paquetsStockes: 3, dernierCalcul: t0 }, maintenant, CFG))
      .toEqual({ paquetsStockes: 10, dernierCalcul: maintenant });
  });

  it('stock plein : dernierCalcul suit maintenant', () => {
    const maintenant = apres(5 * MIN);
    expect(calculerRecharge({ paquetsStockes: 10, dernierCalcul: t0 }, maintenant, CFG))
      .toEqual({ paquetsStockes: 10, dernierCalcul: maintenant });
  });

  it("horloge qui recule : rien ne bouge, jamais de stock négatif", () => {
    const passe = new Date(t0.getTime() - 3 * H);
    expect(calculerRecharge({ paquetsStockes: 3, dernierCalcul: t0 }, passe, CFG))
      .toEqual({ paquetsStockes: 3, dernierCalcul: t0 });
  });
});

describe('prochainPaquetDans', () => {
  it('null quand le stock est plein', () => {
    expect(prochainPaquetDans({ paquetsStockes: 10, dernierCalcul: t0 }, t0, CFG)).toBeNull();
  });

  it('temps restant jusqu’au prochain paquet', () => {
    expect(prochainPaquetDans({ paquetsStockes: 3, dernierCalcul: t0 }, apres(20 * MIN), CFG)).toBe(40 * MIN);
  });

  it('passage 10 → 9 : le compte à rebours démarre à l’ouverture', () => {
    const ouverture = apres(7 * H);
    const r = calculerRecharge({ paquetsStockes: 10, dernierCalcul: t0 }, ouverture, CFG);
    const apresOuverture = { ...r, paquetsStockes: r.paquetsStockes - 1 };
    expect(prochainPaquetDans(apresOuverture, ouverture, CFG)).toBe(H);
  });
});
```

- [ ] **Step 2 : lancer les tests et vérifier qu'ils échouent**

Run : `cd backend && npx vitest run tests/recharge.test.js`
Expected : FAIL, module `../src/jeu/recharge.js` introuvable.

- [ ] **Step 3 : implémenter**

`backend/src/config/jeu.js` :

```js
/** Raretés, de la plus courante à la plus rare. */
export const RARETES = ['commune', 'rare', 'ultra_rare', 'super_rare', 'legendaire'];
export const TYPES = ['personnalite', 'lieu', 'histoire', 'science', 'culture', 'nature'];

export const JEU = {
  intervalleRechargeMs: 60 * 60 * 1000,
  paquetsMax: 10,
  paquetsDepart: 10,
  piecesDepart: 0,
  cartesParPaquet: 5,
  taux: { commune: 60, rare: 25, ultra_rare: 10, super_rare: 4, legendaire: 1 },
  pitie: 50,
  prixRevente: { commune: 5, rare: 15, ultra_rare: 40, super_rare: 100, legendaire: 300 },
  prixPaquet: 100,
  catalogue: {
    n: 50000,
    longueurMin: 2000,
    parts: { legendaire: 0.01, super_rare: 0.04, ultra_rare: 0.10, rare: 0.25, commune: 0.60 },
    seuilVuesMensuelles: 300,
  },
};
```

`backend/src/jeu/recharge.js` :

```js
import { JEU } from '../config/jeu.js';

export function calculerRecharge({ paquetsStockes, dernierCalcul }, maintenant, cfg = JEU) {
  const { intervalleRechargeMs, paquetsMax } = cfg;
  if (paquetsStockes >= paquetsMax) return { paquetsStockes: paquetsMax, dernierCalcul: maintenant };
  const ecoule = maintenant.getTime() - dernierCalcul.getTime();
  const gagnes = Math.max(0, Math.floor(ecoule / intervalleRechargeMs));
  if (paquetsStockes + gagnes >= paquetsMax) return { paquetsStockes: paquetsMax, dernierCalcul: maintenant };
  return {
    paquetsStockes: paquetsStockes + gagnes,
    dernierCalcul: new Date(dernierCalcul.getTime() + gagnes * intervalleRechargeMs),
  };
}

export function prochainPaquetDans({ paquetsStockes, dernierCalcul }, maintenant, cfg = JEU) {
  if (paquetsStockes >= cfg.paquetsMax) return null;
  return Math.max(0, dernierCalcul.getTime() + cfg.intervalleRechargeMs - maintenant.getTime());
}
```

- [ ] **Step 4 : lancer les tests et vérifier qu'ils passent**

Run : `cd backend && npx vitest run tests/recharge.test.js`
Expected : PASS (10 tests)

- [ ] **Step 5 : commit**

```bash
git add backend/src/config backend/src/jeu/recharge.js backend/tests/recharge.test.js
git commit -m "Backend : configuration de jeu et recharge des paquets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3 : Tirage des raretés (garantie et pitié)

**Files :**
- Create : `backend/src/jeu/tirage.js`, `backend/tests/tirage.test.js`

**Interfaces :**
- Consumes : `JEU`, `RARETES` (tâche 2), `rngFixe`, `rngGraine` (tâche 1)
- Produces : `tirerRarete(taux: Record<rarete, number>, rng) → rarete` ; `tirerRaretesPaquet(paquetsSansLegendaire: number, cfg = JEU, rng) → rarete[]` (longueur `cfg.cartesParPaquet`) ; `majCompteurPitie(compteur, raretesObtenues) → number` ; `rngCrypto: () => number` dans [0, 1).

- [ ] **Step 1 : écrire les tests qui échouent**

`backend/tests/tirage.test.js` :

```js
import { describe, it, expect } from 'vitest';
import { tirerRarete, tirerRaretesPaquet, majCompteurPitie, rngCrypto } from '../src/jeu/tirage.js';
import { JEU } from '../src/config/jeu.js';
import { rngFixe, rngGraine } from './aide/fabriques.js';

describe('tirerRarete', () => {
  it('respecte les bornes cumulées des taux', () => {
    expect(tirerRarete(JEU.taux, () => 0)).toBe('commune');
    expect(tirerRarete(JEU.taux, () => 0.5999)).toBe('commune');
    expect(tirerRarete(JEU.taux, () => 0.6)).toBe('rare');
    expect(tirerRarete(JEU.taux, () => 0.9999)).toBe('legendaire');
  });
});

describe('tirerRaretesPaquet', () => {
  it('donne 5 raretés, la 5e est au moins Rare', () => {
    expect(tirerRaretesPaquet(0, JEU, rngFixe([0])))
      .toEqual(['commune', 'commune', 'commune', 'commune', 'rare']);
  });

  it('ne donne jamais de Commune en 5e position', () => {
    const rng = rngGraine(42);
    for (let i = 0; i < 1000; i++) {
      expect(tirerRaretesPaquet(0, JEU, rng)[4]).not.toBe('commune');
    }
  });

  it('force une Légendaire au 50e paquet sans Légendaire', () => {
    expect(tirerRaretesPaquet(49, JEU, rngFixe([0]))[4]).toBe('legendaire');
    expect(tirerRaretesPaquet(48, JEU, rngFixe([0]))[4]).toBe('rare');
  });

  it('respecte approximativement les taux sur 10 000 paquets (4 premières cartes)', () => {
    const rng = rngGraine(7);
    const compte = { commune: 0, rare: 0, ultra_rare: 0, super_rare: 0, legendaire: 0 };
    for (let i = 0; i < 10000; i++) {
      for (const r of tirerRaretesPaquet(0, JEU, rng).slice(0, 4)) compte[r]++;
    }
    for (const [rarete, taux] of Object.entries(JEU.taux)) {
      expect(Math.abs((compte[rarete] / 40000) * 100 - taux)).toBeLessThan(1.5);
    }
  });
});

describe('majCompteurPitie', () => {
  it('incrémente sans Légendaire et remet à 0 sinon', () => {
    expect(majCompteurPitie(10, ['commune', 'rare'])).toBe(11);
    expect(majCompteurPitie(10, ['commune', 'legendaire'])).toBe(0);
  });
});

describe('rngCrypto', () => {
  it('renvoie un nombre dans [0, 1)', () => {
    for (let i = 0; i < 100; i++) {
      const x = rngCrypto();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});
```

- [ ] **Step 2 : lancer les tests et vérifier qu'ils échouent**

Run : `cd backend && npx vitest run tests/tirage.test.js`
Expected : FAIL, module introuvable.

- [ ] **Step 3 : implémenter**

`backend/src/jeu/tirage.js` :

```js
import { randomInt } from 'node:crypto';
import { JEU, RARETES } from '../config/jeu.js';

const ECHELLE = 2 ** 47;
export const rngCrypto = () => randomInt(0, ECHELLE) / ECHELLE;

export function tirerRarete(taux, rng) {
  const total = RARETES.reduce((s, r) => s + (taux[r] ?? 0), 0);
  let x = rng() * total;
  for (const r of RARETES) {
    x -= taux[r] ?? 0;
    if (x < 0) return r;
  }
  return RARETES.findLast((r) => (taux[r] ?? 0) > 0);
}

export function tirerRaretesPaquet(paquetsSansLegendaire, cfg = JEU, rng) {
  const raretes = [];
  for (let i = 0; i < cfg.cartesParPaquet - 1; i++) raretes.push(tirerRarete(cfg.taux, rng));
  const pitie = paquetsSansLegendaire + 1 >= cfg.pitie && !raretes.includes('legendaire');
  const { commune, ...tauxGarantis } = cfg.taux;
  raretes.push(pitie ? 'legendaire' : tirerRarete(tauxGarantis, rng));
  return raretes;
}

export function majCompteurPitie(compteur, raretesObtenues) {
  return raretesObtenues.includes('legendaire') ? 0 : compteur + 1;
}
```

- [ ] **Step 4 : lancer les tests et vérifier qu'ils passent**

Run : `cd backend && npx vitest run tests/tirage.test.js`
Expected : PASS (7 tests)

- [ ] **Step 5 : commit**

```bash
git add backend/src/jeu/tirage.js backend/tests/tirage.test.js
git commit -m "Backend : tirage des raretés avec garantie et pitié

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4 : Comptes (inscription, connexion, session, profil)

**Files :**
- Create : `backend/src/validation.js`, `backend/src/jeu/etat.js`, `backend/src/middleware/session.js`, `backend/src/routes/auth.js`, `backend/src/routes/moi.js`, `backend/tests/auth.test.js`
- Modify : `backend/src/app.js` (montage des routes)

**Interfaces :**
- Consumes : `ErreurJeu`, `JEU`, `calculerRecharge`, `prochainPaquetDans`
- Produces : `etatJoueur(ligneJoueur, maintenant) → Moi` où `Moi = { id, pseudo, email, pieces, paquetsStockes, paquetsMax, prochainPaquetDansMs: number|null, paquetsAvantPitie, venteAutoCommunes: boolean }` ; `chargerJoueur(dbOuConn, id) → ligne` (lève 401 `NON_CONNECTE` si absent) ; `exigerConnexion(secret)` qui pose `req.joueurId: number` ; routes `POST /api/auth/inscription {email, pseudo, motDePasse} → 201 Moi`, `POST /api/auth/connexion {email, motDePasse} → 200 Moi`, `POST /api/auth/deconnexion → 204`, `GET /api/moi → Moi`, `PATCH /api/moi {pseudo?, venteAutoCommunes?} → Moi`.

- [ ] **Step 1 : écrire les tests qui échouent**

`backend/tests/auth.test.js` :

```js
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
```

- [ ] **Step 2 : lancer les tests et vérifier qu'ils échouent**

Run : `cd backend && npx vitest run tests/auth.test.js`
Expected : FAIL (404 `ROUTE_INCONNUE` sur `/api/auth/inscription`)

- [ ] **Step 3 : implémenter**

`backend/src/validation.js` :

```js
import { ErreurJeu } from './erreurs.js';

export function validerEmail(email) {
  if (typeof email !== 'string') throw new ErreurJeu(400, 'EMAIL_INVALIDE', 'Adresse email invalide.');
  const propre = email.trim().toLowerCase();
  if (propre.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(propre)) {
    throw new ErreurJeu(400, 'EMAIL_INVALIDE', 'Adresse email invalide.');
  }
  return propre;
}

export function validerPseudo(pseudo) {
  if (typeof pseudo !== 'string' || !/^[A-Za-z0-9_-]{3,20}$/.test(pseudo.trim())) {
    throw new ErreurJeu(400, 'PSEUDO_INVALIDE', 'Le pseudo doit faire 3 à 20 caractères (lettres, chiffres, _ ou -).');
  }
  return pseudo.trim();
}

export function validerMotDePasse(motDePasse) {
  if (typeof motDePasse !== 'string' || motDePasse.length < 8) {
    throw new ErreurJeu(400, 'MOT_DE_PASSE_TROP_COURT', 'Le mot de passe doit faire au moins 8 caractères.');
  }
  return motDePasse;
}
```

`backend/src/jeu/etat.js` :

```js
import { JEU } from '../config/jeu.js';
import { ErreurJeu } from '../erreurs.js';
import { calculerRecharge, prochainPaquetDans } from './recharge.js';

export function etatJoueur(j, maintenant) {
  const recharge = calculerRecharge(
    { paquetsStockes: j.paquets_stockes, dernierCalcul: j.dernier_calcul }, maintenant, JEU,
  );
  return {
    id: j.id,
    pseudo: j.pseudo,
    email: j.email,
    pieces: j.pieces,
    paquetsStockes: recharge.paquetsStockes,
    paquetsMax: JEU.paquetsMax,
    prochainPaquetDansMs: prochainPaquetDans(recharge, maintenant, JEU),
    paquetsAvantPitie: JEU.pitie - j.paquets_sans_legendaire,
    venteAutoCommunes: Boolean(j.vente_auto_communes),
  };
}

export async function chargerJoueur(db, id) {
  const [[j]] = await db.query('SELECT * FROM joueurs WHERE id = ?', [id]);
  if (!j) throw new ErreurJeu(401, 'NON_CONNECTE', 'Connecte-toi pour continuer.');
  return j;
}
```

`backend/src/middleware/session.js` :

```js
import jwt from 'jsonwebtoken';
import { ErreurJeu } from '../erreurs.js';

export function exigerConnexion(secret) {
  return (req, res, next) => {
    const jeton = req.cookies?.session;
    if (!jeton) throw new ErreurJeu(401, 'NON_CONNECTE', 'Connecte-toi pour continuer.');
    try {
      req.joueurId = Number(jwt.verify(jeton, secret).sub);
    } catch {
      throw new ErreurJeu(401, 'NON_CONNECTE', 'Ta session a expiré, reconnecte-toi.');
    }
    next();
  };
}
```

`backend/src/routes/auth.js` :

```js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { JEU } from '../config/jeu.js';
import { ErreurJeu } from '../erreurs.js';
import { validerEmail, validerMotDePasse, validerPseudo } from '../validation.js';
import { chargerJoueur, etatJoueur } from '../jeu/etat.js';

const COUT_BCRYPT = process.env.VITEST ? 4 : 10;
const DUREE_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function poserSession(res, joueurId, secret) {
  const jeton = jwt.sign({ sub: String(joueurId) }, secret, { expiresIn: '30d' });
  res.cookie('session', jeton, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: DUREE_SESSION_MS,
    path: '/',
  });
}

export function routeurAuth(db, { secret, limiteConnexion = { fenetreMs: 15 * 60 * 1000, max: 5 } }) {
  const r = Router();
  const limiteur = rateLimit({
    windowMs: limiteConnexion.fenetreMs,
    limit: limiteConnexion.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({
      code: 'TROP_DE_TENTATIVES', message: 'Trop de tentatives, réessaie dans 15 minutes.',
    }),
  });

  r.post('/inscription', async (req, res) => {
    const email = validerEmail(req.body?.email);
    const pseudo = validerPseudo(req.body?.pseudo);
    const motDePasse = validerMotDePasse(req.body?.motDePasse);
    const hash = await bcrypt.hash(motDePasse, COUT_BCRYPT);
    const maintenant = new Date();
    let id;
    try {
      const [resultat] = await db.query(
        `INSERT INTO joueurs (email, mot_de_passe_hash, pseudo, pieces, paquets_stockes, dernier_calcul, cree_le)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [email, hash, pseudo, JEU.piecesDepart, JEU.paquetsDepart, maintenant, maintenant],
      );
      id = resultat.insertId;
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        if (e.message.includes('.email')) throw new ErreurJeu(409, 'EMAIL_PRIS', 'Cette adresse email a déjà un compte.');
        throw new ErreurJeu(409, 'PSEUDO_PRIS', 'Ce pseudo est déjà pris.');
      }
      throw e;
    }
    poserSession(res, id, secret);
    res.status(201).json(etatJoueur(await chargerJoueur(db, id), maintenant));
  });

  r.post('/connexion', limiteur, async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const motDePasse = typeof req.body?.motDePasse === 'string' ? req.body.motDePasse : '';
    const [[j]] = await db.query('SELECT * FROM joueurs WHERE email = ?', [email]);
    if (!j || !(await bcrypt.compare(motDePasse, j.mot_de_passe_hash))) {
      throw new ErreurJeu(401, 'IDENTIFIANTS_INVALIDES', 'Email ou mot de passe incorrect.');
    }
    poserSession(res, j.id, secret);
    res.json(etatJoueur(j, new Date()));
  });

  r.post('/deconnexion', (req, res) => {
    res.clearCookie('session', { path: '/' });
    res.status(204).end();
  });

  return r;
}
```

`backend/src/routes/moi.js` :

```js
import { Router } from 'express';
import { ErreurJeu } from '../erreurs.js';
import { validerPseudo } from '../validation.js';
import { chargerJoueur, etatJoueur } from '../jeu/etat.js';

export function routeurMoi(db) {
  const r = Router();

  r.get('/', async (req, res) => {
    res.json(etatJoueur(await chargerJoueur(db, req.joueurId), new Date()));
  });

  r.patch('/', async (req, res) => {
    const { pseudo, venteAutoCommunes } = req.body ?? {};
    const changements = {};
    if (pseudo !== undefined) changements.pseudo = validerPseudo(pseudo);
    if (venteAutoCommunes !== undefined) {
      if (typeof venteAutoCommunes !== 'boolean') throw new ErreurJeu(400, 'REQUETE_INVALIDE', 'Requête invalide.');
      changements.vente_auto_communes = venteAutoCommunes ? 1 : 0;
    }
    if (Object.keys(changements).length) {
      try {
        await db.query('UPDATE joueurs SET ? WHERE id = ?', [changements, req.joueurId]);
      } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') throw new ErreurJeu(409, 'PSEUDO_PRIS', 'Ce pseudo est déjà pris.');
        throw e;
      }
    }
    res.json(etatJoueur(await chargerJoueur(db, req.joueurId), new Date()));
  });

  return r;
}
```

Dans `backend/src/app.js`, ajouter les imports et remplacer la ligne `// ROUTES (ajoutées par les tâches suivantes)` par :

```js
import { exigerConnexion } from './middleware/session.js';
import { routeurAuth } from './routes/auth.js';
import { routeurMoi } from './routes/moi.js';
```

```js
  const exiger = exigerConnexion(secret);
  app.use('/api/auth', routeurAuth(db, { secret, limiteConnexion: options.limiteConnexion }));
  app.use('/api/moi', exiger, routeurMoi(db));
  // ROUTES (ajoutées par les tâches suivantes)
```

- [ ] **Step 4 : lancer les tests et vérifier qu'ils passent**

Run : `cd backend && npx vitest run tests/auth.test.js`
Expected : PASS (15 tests)

- [ ] **Step 5 : commit**

```bash
git add backend/src backend/tests/auth.test.js
git commit -m "Backend : comptes, session JWT et profil

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5 : Ouverture des paquets

**Files :**
- Create : `backend/src/jeu/cartes.js`, `backend/src/services/exemplaires.js`, `backend/src/services/paquets.js`, `backend/src/routes/paquets.js`, `backend/tests/paquets.test.js`
- Modify : `backend/src/app.js`

**Interfaces :**
- Consumes : `calculerRecharge`, `tirerRaretesPaquet`, `majCompteurPitie`, `rngCrypto`, `etatJoueur`, `JEU`, `RARETES`, `ErreurJeu`
- Produces :
  - `versCarteVue(ligneCatalogue) → Carte = { id, pageId, titre, extrait, imageUrl, type, rarete, attaque, defense }`
  - `compterExemplaires(dbOuConn, joueurId, carteId) → { possedes: number, epinglee: boolean }`
  - `nbVendables({ possedes, epinglee }) → number` (= 0 si épinglée, sinon max(0, possedes − 1))
  - `retirerExemplaires(conn, joueurId, carteId, n) → number` (supprime les n plus récents)
  - `ouvrirPaquet(db, joueurId, source: 'stock'|'achat', { maintenant?, rng? }) → { cartes: (Carte & { nouvelle: boolean })[], etat: Moi, venteAuto: { cartes, pieces } | null }`
  - Route `POST /api/paquets/ouvrir { source }`

- [ ] **Step 1 : écrire les tests qui échouent**

`backend/tests/paquets.test.js` :

```js
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
```

- [ ] **Step 2 : lancer les tests et vérifier qu'ils échouent**

Run : `cd backend && npx vitest run tests/paquets.test.js`
Expected : FAIL (404 `ROUTE_INCONNUE`)

- [ ] **Step 3 : implémenter**

`backend/src/jeu/cartes.js` :

```js
export function versCarteVue(c) {
  return {
    id: c.id,
    pageId: c.page_id,
    titre: c.titre,
    extrait: c.extrait ?? '',
    imageUrl: c.image_url,
    type: c.type,
    rarete: c.rarete,
    attaque: c.attaque,
    defense: c.defense,
  };
}
```

`backend/src/services/exemplaires.js` :

```js
export async function compterExemplaires(db, joueurId, carteId) {
  const [[ligne]] = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM cartes_joueur WHERE joueur_id = ? AND carte_id = ?) AS possedes,
       EXISTS(SELECT 1 FROM epingles WHERE joueur_id = ? AND carte_id = ?) AS epinglee`,
    [joueurId, carteId, joueurId, carteId],
  );
  return { possedes: Number(ligne.possedes), epinglee: Boolean(ligne.epinglee) };
}

export function nbVendables({ possedes, epinglee }) {
  return epinglee ? 0 : Math.max(0, possedes - 1);
}

/** Supprime les n exemplaires les plus récents. */
export async function retirerExemplaires(conn, joueurId, carteId, n) {
  if (n <= 0) return 0;
  const [r] = await conn.query(
    'DELETE FROM cartes_joueur WHERE joueur_id = ? AND carte_id = ? ORDER BY obtenue_le DESC, id DESC LIMIT ?',
    [joueurId, carteId, n],
  );
  return r.affectedRows;
}
```

`backend/src/services/paquets.js` :

```js
import { JEU, RARETES } from '../config/jeu.js';
import { ErreurJeu } from '../erreurs.js';
import { calculerRecharge } from '../jeu/recharge.js';
import { tirerRaretesPaquet, majCompteurPitie, rngCrypto } from '../jeu/tirage.js';
import { etatJoueur } from '../jeu/etat.js';
import { versCarteVue } from '../jeu/cartes.js';
import { compterExemplaires, nbVendables, retirerExemplaires } from './exemplaires.js';

async function compterParRarete(conn) {
  const [lignes] = await conn.query('SELECT rarete, COUNT(*) AS n FROM catalogue WHERE actif = 1 GROUP BY rarete');
  return Object.fromEntries(lignes.map((l) => [l.rarete, Number(l.n)]));
}

/** Rareté voulue si disponible, sinon la plus proche en dessous, sinon n'importe laquelle. */
function rareteDisponible(voulue, comptes) {
  for (let i = RARETES.indexOf(voulue); i >= 0; i--) if (comptes[RARETES[i]]) return RARETES[i];
  return RARETES.find((r) => comptes[r]);
}

async function venteAutoCommunes(conn, joueurId, cartes) {
  let vendues = 0;
  const tirees = new Map();
  for (const c of cartes) if (c.rarete === 'commune') tirees.set(c.id, (tirees.get(c.id) ?? 0) + 1);
  for (const [carteId, nbTirees] of tirees) {
    const n = Math.min(nbTirees, nbVendables(await compterExemplaires(conn, joueurId, carteId)));
    vendues += await retirerExemplaires(conn, joueurId, carteId, n);
  }
  return { cartes: vendues, pieces: vendues * JEU.prixRevente.commune };
}

export async function ouvrirPaquet(db, joueurId, source, { maintenant = new Date(), rng = rngCrypto } = {}) {
  if (source !== 'stock' && source !== 'achat') {
    throw new ErreurJeu(400, 'SOURCE_INVALIDE', 'Source de paquet invalide.');
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[j]] = await conn.query('SELECT * FROM joueurs WHERE id = ? FOR UPDATE', [joueurId]);
    if (!j) throw new ErreurJeu(401, 'NON_CONNECTE', 'Connecte-toi pour continuer.');

    let { paquetsStockes, dernierCalcul } = calculerRecharge(
      { paquetsStockes: j.paquets_stockes, dernierCalcul: j.dernier_calcul }, maintenant, JEU,
    );
    let pieces = j.pieces;
    if (source === 'stock') {
      if (paquetsStockes < 1) throw new ErreurJeu(409, 'STOCK_VIDE', 'Plus de paquet disponible pour le moment.');
      paquetsStockes -= 1;
    } else {
      if (pieces < JEU.prixPaquet) {
        throw new ErreurJeu(409, 'PIECES_INSUFFISANTES', `Il faut ${JEU.prixPaquet} pièces pour acheter un paquet.`);
      }
      pieces -= JEU.prixPaquet;
    }

    const comptes = await compterParRarete(conn);
    if (!Object.keys(comptes).length) {
      throw new ErreurJeu(409, 'CATALOGUE_VIDE', "Le catalogue de cartes n'est pas encore prêt.");
    }

    const cartes = [];
    for (const voulue of tirerRaretesPaquet(j.paquets_sans_legendaire, JEU, rng)) {
      const rarete = rareteDisponible(voulue, comptes);
      const [[c]] = await conn.query(
        'SELECT * FROM catalogue WHERE actif = 1 AND rarete = ? ORDER BY id LIMIT 1 OFFSET ?',
        [rarete, Math.floor(rng() * comptes[rarete])],
      );
      cartes.push(c);
    }

    const ids = [...new Set(cartes.map((c) => c.id))];
    const [possedees] = await conn.query(
      'SELECT DISTINCT carte_id FROM cartes_joueur WHERE joueur_id = ? AND carte_id IN (?)', [joueurId, ids],
    );
    const dejaVues = new Set(possedees.map((p) => p.carte_id));
    const cartesVues = cartes.map((c) => {
      const nouvelle = !dejaVues.has(c.id);
      dejaVues.add(c.id);
      return { ...versCarteVue(c), nouvelle };
    });

    await conn.query('INSERT INTO cartes_joueur (joueur_id, carte_id, obtenue_le) VALUES ?', [
      cartes.map((c) => [joueurId, c.id, maintenant]),
    ]);

    let venteAuto = null;
    if (j.vente_auto_communes) {
      venteAuto = await venteAutoCommunes(conn, joueurId, cartes);
      pieces += venteAuto.pieces;
    }

    await conn.query(
      `UPDATE joueurs SET paquets_stockes = ?, dernier_calcul = ?, pieces = ?, paquets_sans_legendaire = ?
       WHERE id = ?`,
      [paquetsStockes, dernierCalcul, pieces, majCompteurPitie(j.paquets_sans_legendaire, cartes.map((c) => c.rarete)), joueurId],
    );
    await conn.query(
      'INSERT INTO ouvertures (joueur_id, ouverte_le, source, cartes) VALUES (?, ?, ?, ?)',
      [joueurId, maintenant, source, JSON.stringify(cartes.map((c) => c.id))],
    );
    await conn.commit();

    const [[jMaj]] = await conn.query('SELECT * FROM joueurs WHERE id = ?', [joueurId]);
    return { cartes: cartesVues, etat: etatJoueur(jMaj, maintenant), venteAuto };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
```

`backend/src/routes/paquets.js` :

```js
import { Router } from 'express';
import { ouvrirPaquet } from '../services/paquets.js';

export function routeurPaquets(db, { rng } = {}) {
  const r = Router();
  r.post('/ouvrir', async (req, res) => {
    res.json(await ouvrirPaquet(db, req.joueurId, req.body?.source, { rng }));
  });
  return r;
}
```

Dans `backend/src/app.js` : ajouter `import { routeurPaquets } from './routes/paquets.js';` et, juste au-dessus de `// ROUTES (ajoutées par les tâches suivantes)` :

```js
  app.use('/api/paquets', exiger, routeurPaquets(db, { rng: options.rng }));
```

- [ ] **Step 4 : lancer les tests et vérifier qu'ils passent**

Run : `cd backend && npx vitest run tests/paquets.test.js`
Expected : PASS (11 tests)

- [ ] **Step 5 : lancer toute la suite**

Run : `cd backend && npm test`
Expected : PASS (toutes les tâches 1 à 5)

- [ ] **Step 6 : commit**

```bash
git add backend/src backend/tests/paquets.test.js
git commit -m "Backend : ouverture des paquets (stock, achat, pitié, vente auto)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6 : Album, épingles et fiche carte

**Files :**
- Create : `backend/src/routes/album.js`, `backend/src/routes/cartes.js`, `backend/tests/album.test.js`
- Modify : `backend/src/app.js`

**Interfaces :**
- Consumes : `versCarteVue`, `compterExemplaires`, `RARETES`, `TYPES`, `ErreurJeu`
- Produces :
  - `GET /api/album?rarete=a,b&type=x,y&q=texte&manquantes=1&page=1&parPage=60` → `{ cartes: CarteAlbum[], total, page, parPage, possedees, tailleCatalogue }`, où `CarteAlbum = Carte & { quantite, epinglee }`
  - `PATCH /api/album/:carteId/epingle { epinglee: boolean }` → `{ carteId, epinglee }`
  - `GET /api/cartes/:id` → `Carte & { quantite, epinglee, actif }`

- [ ] **Step 1 : écrire les tests qui échouent**

`backend/tests/album.test.js` :

```js
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
```

- [ ] **Step 2 : lancer les tests et vérifier qu'ils échouent**

Run : `cd backend && npx vitest run tests/album.test.js`
Expected : FAIL (404 `ROUTE_INCONNUE`)

- [ ] **Step 3 : implémenter**

`backend/src/routes/album.js` :

```js
import { Router } from 'express';
import { RARETES, TYPES } from '../config/jeu.js';
import { ErreurJeu } from '../erreurs.js';
import { versCarteVue } from '../jeu/cartes.js';

const PAR_PAGE_MAX = 100;

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
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
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
        `SELECT c.* ${base} ORDER BY c.rarete DESC, c.titre LIMIT ? OFFSET ?`,
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
         GROUP BY c.id ORDER BY epinglee DESC, c.rarete DESC, c.titre LIMIT ? OFFSET ?`,
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
```

`backend/src/routes/cartes.js` :

```js
import { Router } from 'express';
import { ErreurJeu } from '../erreurs.js';
import { versCarteVue } from '../jeu/cartes.js';
import { compterExemplaires } from '../services/exemplaires.js';

export function routeurCartes(db) {
  const r = Router();
  r.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const introuvable = new ErreurJeu(404, 'CARTE_INTROUVABLE', 'Carte introuvable.');
    if (!Number.isInteger(id)) throw introuvable;
    const [[c]] = await db.query('SELECT * FROM catalogue WHERE id = ?', [id]);
    if (!c) throw introuvable;
    const { possedes, epinglee } = await compterExemplaires(db, req.joueurId, id);
    res.json({ ...versCarteVue(c), quantite: possedes, epinglee, actif: Boolean(c.actif) });
  });
  return r;
}
```

Dans `backend/src/app.js` : importer `routeurAlbum` et `routeurCartes`, puis ajouter au-dessus de `// ROUTES` :

```js
  app.use('/api/album', exiger, routeurAlbum(db));
  app.use('/api/cartes', exiger, routeurCartes(db));
```

- [ ] **Step 4 : lancer les tests et vérifier qu'ils passent**

Run : `cd backend && npx vitest run tests/album.test.js`
Expected : PASS (11 tests)

- [ ] **Step 5 : commit**

```bash
git add backend/src backend/tests/album.test.js
git commit -m "Backend : album, épingles et fiche carte

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7 : Doublons et vente rapide

**Files :**
- Create : `backend/src/routes/doublons.js`, `backend/tests/doublons.test.js`
- Modify : `backend/src/app.js`

**Interfaces :**
- Consumes : `compterExemplaires`, `nbVendables`, `retirerExemplaires`, `JEU`, `ErreurJeu`
- Produces :
  - `GET /api/doublons` → `{ doublons: Doublon[] }`, où `Doublon = { carteId, titre, rarete, type, imageUrl, vendables, prixUnitaire }`
  - `POST /api/doublons/vendre { ventes: [{ carteId, quantite }] }` → `{ cartesVendues, piecesGagnees, pieces }`

- [ ] **Step 1 : écrire les tests qui échouent**

`backend/tests/doublons.test.js` :

```js
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
```

- [ ] **Step 2 : lancer les tests et vérifier qu'ils échouent**

Run : `cd backend && npx vitest run tests/doublons.test.js`
Expected : FAIL (404 `ROUTE_INCONNUE`)

- [ ] **Step 3 : implémenter**

`backend/src/routes/doublons.js` :

```js
import { Router } from 'express';
import { JEU } from '../config/jeu.js';
import { ErreurJeu } from '../erreurs.js';
import { compterExemplaires, nbVendables, retirerExemplaires } from '../services/exemplaires.js';

const MAX_LIGNES = 1000;

function validerVentes(ventes) {
  const valide = Array.isArray(ventes) && ventes.length > 0 && ventes.length <= MAX_LIGNES
    && ventes.every((v) => Number.isInteger(v?.carteId) && Number.isInteger(v?.quantite) && v.quantite >= 1);
  if (!valide) throw new ErreurJeu(400, 'REQUETE_INVALIDE', 'Requête invalide.');
  return ventes;
}

export function routeurDoublons(db) {
  const r = Router();

  r.get('/', async (req, res) => {
    const [lignes] = await db.query(
      `SELECT c.id, c.titre, c.rarete, c.type, c.image_url, COUNT(*) - 1 AS vendables
       FROM cartes_joueur cj
       JOIN catalogue c ON c.id = cj.carte_id
       LEFT JOIN epingles e ON e.joueur_id = cj.joueur_id AND e.carte_id = c.id
       WHERE cj.joueur_id = ? AND e.carte_id IS NULL
       GROUP BY c.id
       HAVING COUNT(*) > 1
       ORDER BY c.rarete, c.titre`,
      [req.joueurId],
    );
    res.json({
      doublons: lignes.map((l) => ({
        carteId: l.id, titre: l.titre, rarete: l.rarete, type: l.type, imageUrl: l.image_url,
        vendables: Number(l.vendables), prixUnitaire: JEU.prixRevente[l.rarete],
      })),
    });
  });

  r.post('/vendre', async (req, res) => {
    const ventes = validerVentes(req.body?.ventes);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('SELECT id FROM joueurs WHERE id = ? FOR UPDATE', [req.joueurId]);
      let cartesVendues = 0;
      let piecesGagnees = 0;
      for (const { carteId, quantite } of ventes) {
        const [[carte]] = await conn.query('SELECT rarete FROM catalogue WHERE id = ?', [carteId]);
        if (!carte) continue;
        const n = Math.min(quantite, nbVendables(await compterExemplaires(conn, req.joueurId, carteId)));
        const retires = await retirerExemplaires(conn, req.joueurId, carteId, n);
        cartesVendues += retires;
        piecesGagnees += retires * JEU.prixRevente[carte.rarete];
      }
      await conn.query('UPDATE joueurs SET pieces = pieces + ? WHERE id = ?', [piecesGagnees, req.joueurId]);
      const [[{ pieces }]] = await conn.query('SELECT pieces FROM joueurs WHERE id = ?', [req.joueurId]);
      await conn.commit();
      res.json({ cartesVendues, piecesGagnees, pieces });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  });

  return r;
}
```

Dans `backend/src/app.js` : importer `routeurDoublons` et ajouter au-dessus de `// ROUTES` :

```js
  app.use('/api/doublons', exiger, routeurDoublons(db));
```

- [ ] **Step 4 : lancer les tests et vérifier qu'ils passent**

Run : `cd backend && npx vitest run tests/doublons.test.js`
Expected : PASS (11 tests)

- [ ] **Step 5 : commit**

```bash
git add backend/src backend/tests/doublons.test.js
git commit -m "Backend : liste et vente rapide des doublons

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8 : Catalogue, règles pures (filtres, stats, raretés, types)

**Files :**
- Create : `backend/src/utils/lots.js`, `backend/src/jobs/catalogue/filtres.js`, `backend/src/jobs/catalogue/stats.js`, `backend/src/jobs/catalogue/types.js`, `backend/tests/catalogue-regles.test.js`

**Interfaces :**
- Produces :
  - `lots(tableau, taille) → tableau[][]`
  - `estTitreCandidat(titre) → boolean`
  - `estArticleValide(meta: { existe, ns, redirection, homonymie, longueur }, longueurMin) → boolean`
  - `percentiles(valeurs: number[]) → number[]` (0..1, même ordre)
  - `versStat(p) → 1..100`
  - `calculerDefense(pLiens, label: 'qualite'|'bon'|null) → 1..100`
  - `raretePourRang(n, parts) → (index0) => rarete`
  - `typeDepuisP31(qids: string[]) → type | null`
  - `typeDepuisCategories(categories: string[]) → type | null`
  - `determinerType(qids, categories) → type` (repli : `culture`)

- [ ] **Step 1 : écrire les tests qui échouent**

`backend/tests/catalogue-regles.test.js` :

```js
import { describe, it, expect } from 'vitest';
import { lots } from '../src/utils/lots.js';
import { estTitreCandidat, estArticleValide } from '../src/jobs/catalogue/filtres.js';
import { percentiles, versStat, calculerDefense, raretePourRang } from '../src/jobs/catalogue/stats.js';
import { typeDepuisP31, typeDepuisCategories, determinerType } from '../src/jobs/catalogue/types.js';
import { JEU } from '../src/config/jeu.js';

describe('lots', () => {
  it('découpe en paquets de taille fixe', () => {
    expect(lots([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe('estTitreCandidat', () => {
  it.each(['Napoléon Ier', 'Paris', 'Star Wars : Épisode IV', "L'Étranger", '1984 (roman)'])('garde « %s »', (t) => {
    expect(estTitreCandidat(t)).toBe(true);
  });
  it.each([
    'Spécial:Recherche', 'Wikipédia:Accueil principal', 'Fichier:Logo.png', 'Catégorie:Peintre',
    'Liste des pays du monde', "Liste d'œuvres de Mozart", '1789', '14 juillet', '1er janvier',
    'Juillet 2024', 'Décès en 2025', '2024 en France', '-', '',
  ])('exclut « %s »', (t) => {
    expect(estTitreCandidat(t)).toBe(false);
  });
});

describe('estArticleValide', () => {
  const base = { existe: true, ns: 0, redirection: false, homonymie: false, longueur: 5000 };
  it('accepte un article normal', () => expect(estArticleValide(base, 2000)).toBe(true));
  it.each([
    [{ existe: false }], [{ ns: 4 }], [{ redirection: true }], [{ homonymie: true }], [{ longueur: 1999 }],
  ])('refuse %o', (changement) => expect(estArticleValide({ ...base, ...changement }, 2000)).toBe(false));
});

describe('stats', () => {
  it('percentiles : part des valeurs strictement inférieures', () => {
    expect(percentiles([10, 30, 20, 20])).toEqual([0, 1, 1 / 3, 1 / 3]);
    expect(percentiles([42])).toEqual([1]);
  });
  it('versStat : 1 à 100', () => {
    expect(versStat(0)).toBe(1);
    expect(versStat(1)).toBe(100);
    expect(versStat(0.5)).toBe(51);
    expect(versStat(7)).toBe(100);
  });
  it('défense : 60 % liens + 40 % label', () => {
    expect(calculerDefense(1, 'qualite')).toBe(100);
    expect(calculerDefense(0, 'bon')).toBe(versStat(0.24));
    expect(calculerDefense(0.5, null)).toBe(versStat(0.3));
  });
  it('raretés par rang (n = 1000)', () => {
    const rarete = raretePourRang(1000, JEU.catalogue.parts);
    expect([0, 9, 10, 49, 50, 149, 150, 399, 400, 999].map(rarete)).toEqual([
      'legendaire', 'legendaire', 'super_rare', 'super_rare', 'ultra_rare', 'ultra_rare', 'rare', 'rare', 'commune', 'commune',
    ]);
  });
});

describe('types', () => {
  it('depuis Wikidata P31', () => {
    expect(typeDepuisP31(['Q5'])).toBe('personnalite');
    expect(typeDepuisP31(['Q484170'])).toBe('lieu');
    expect(typeDepuisP31(['Q178561'])).toBe('histoire');
    expect(typeDepuisP31(['Q11344'])).toBe('science');
    expect(typeDepuisP31(['Q11424'])).toBe('culture');
    expect(typeDepuisP31(['Q16521'])).toBe('nature');
    expect(typeDepuisP31(['Q999999999'])).toBeNull();
  });
  it('depuis les catégories', () => {
    expect(typeDepuisCategories(['Catégorie:Naissance en 1769'])).toBe('personnalite');
    expect(typeDepuisCategories(['Catégorie:Commune du Rhône'])).toBe('lieu');
    expect(typeDepuisCategories(['Catégorie:Mammifère (nom vernaculaire)'])).toBe('nature');
    expect(typeDepuisCategories(['Catégorie:Truc'])).toBeNull();
  });
  it('repli sur Culture', () => {
    expect(determinerType([], [])).toBe('culture');
    expect(determinerType(['Q5'], ['Catégorie:Commune du Rhône'])).toBe('personnalite');
  });
});
```

- [ ] **Step 2 : lancer les tests et vérifier qu'ils échouent**

Run : `cd backend && npx vitest run tests/catalogue-regles.test.js`
Expected : FAIL, modules introuvables.

- [ ] **Step 3 : implémenter**

`backend/src/utils/lots.js` :

```js
export function lots(tableau, taille) {
  const resultat = [];
  for (let i = 0; i < tableau.length; i += taille) resultat.push(tableau.slice(i, i + taille));
  return resultat;
}
```

`backend/src/jobs/catalogue/filtres.js` :

```js
const ESPACES_EXCLUS = new Set([
  'Spécial', 'Special', 'Fichier', 'File', 'Catégorie', 'Category', 'Wikipédia', 'Wikipedia',
  'Portail', 'Modèle', 'Template', 'Aide', 'Help', 'Projet', 'Utilisateur', 'User', 'Discussion',
  'Talk', 'Média', 'Module', 'MediaWiki', 'Référence', 'Sujet',
]);
const MOIS = 'janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre';
const MOTIFS_EXCLUS = [
  /^Liste (de|des|du|d')/i,
  /^\d{1,4}$/,
  new RegExp(`^(1er|\\d{1,2}) (${MOIS})$`, 'i'),
  new RegExp(`^(${MOIS}) \\d{1,4}$`, 'i'),
  /^(Naissance|Décès) en /i,
  /^\d{1,4} en /i,
];

export function estTitreCandidat(titre) {
  if (!titre || titre === '-') return false;
  const prefixe = titre.split(':')[0];
  if (titre.includes(':') && ESPACES_EXCLUS.has(prefixe)) return false;
  return !MOTIFS_EXCLUS.some((motif) => motif.test(titre));
}

export function estArticleValide(meta, longueurMin) {
  return meta.existe && meta.ns === 0 && !meta.redirection && !meta.homonymie && meta.longueur >= longueurMin;
}
```

`backend/src/jobs/catalogue/stats.js` :

```js
function nbInferieurs(trie, valeur) {
  let bas = 0;
  let haut = trie.length;
  while (bas < haut) {
    const milieu = (bas + haut) >> 1;
    if (trie[milieu] < valeur) bas = milieu + 1;
    else haut = milieu;
  }
  return bas;
}

export function percentiles(valeurs) {
  if (valeurs.length <= 1) return valeurs.map(() => 1);
  const trie = [...valeurs].sort((a, b) => a - b);
  return valeurs.map((v) => nbInferieurs(trie, v) / (valeurs.length - 1));
}

export const versStat = (p) => 1 + Math.round(99 * Math.min(1, Math.max(0, p)));

const SCORE_LABEL = { qualite: 1, bon: 0.6 };
export const calculerDefense = (pLiens, label) => versStat(0.6 * pLiens + 0.4 * (SCORE_LABEL[label] ?? 0));

const ORDRE = ['legendaire', 'super_rare', 'ultra_rare', 'rare', 'commune'];

export function raretePourRang(n, parts) {
  let cumul = 0;
  const seuils = ORDRE.map((rarete) => {
    cumul += parts[rarete];
    return [rarete, Math.round(n * cumul)];
  });
  return (index) => seuils.find(([, seuil]) => index < seuil)?.[0] ?? 'commune';
}
```

`backend/src/jobs/catalogue/types.js` :

```js
/** Nature de l'élément (Wikidata P31) → type. Table extensible. */
const P31 = {
  personnalite: ['Q5'],
  lieu: ['Q515', 'Q6256', 'Q3624078', 'Q484170', 'Q8502', 'Q4022', 'Q23397', 'Q23442', 'Q5107',
    'Q1549591', 'Q41176', 'Q839954', 'Q747074', 'Q1093829', 'Q35657', 'Q486972'],
  histoire: ['Q178561', 'Q198', 'Q1190554', 'Q13418847', 'Q3024240', 'Q11514315', 'Q48349'],
  science: ['Q11344', 'Q11173', 'Q12136', 'Q9143', 'Q11862829', 'Q7187', 'Q8054'],
  culture: ['Q11424', 'Q7725634', 'Q482994', 'Q7366', 'Q5398426', 'Q7889', 'Q215380', 'Q3305213', 'Q476028'],
  nature: ['Q16521'],
};
const TYPE_PAR_QID = new Map(Object.entries(P31).flatMap(([type, qids]) => qids.map((q) => [q, type])));

const REGLES_CATEGORIES = [
  [/^Catégorie:(Naissance|Décès) /, 'personnalite'],
  [/(Commune|Ville|Village|Pays|Île|Montagne|Fleuve|Rivière|Lac|Région|Département|Monument|Château)/i, 'lieu'],
  [/(Bataille|Guerre|Révolution|Empire|Royaume|Dynastie|Traité|Histoire)/i, 'histoire'],
  [/(Espèce|Animal|Plante|Mammifère|Oiseau|Poisson|Insecte|Taxon|Champignon)/i, 'nature'],
  [/(Physique|Chimie|Mathématiques|Médecine|Maladie|Biologie|Informatique|Astronomie|Technologie)/i, 'science'],
];

export function typeDepuisP31(qids) {
  for (const q of qids) if (TYPE_PAR_QID.has(q)) return TYPE_PAR_QID.get(q);
  return null;
}

export function typeDepuisCategories(categories) {
  for (const [motif, type] of REGLES_CATEGORIES) if (categories.some((c) => motif.test(c))) return type;
  return null;
}

export function determinerType(qids, categories) {
  return typeDepuisP31(qids) ?? typeDepuisCategories(categories) ?? 'culture';
}
```

- [ ] **Step 4 : lancer les tests et vérifier qu'ils passent**

Run : `cd backend && npx vitest run tests/catalogue-regles.test.js`
Expected : PASS

- [ ] **Step 5 : commit**

```bash
git add backend/src/utils backend/src/jobs backend/tests/catalogue-regles.test.js
git commit -m "Catalogue : filtres, stats, raretés et types

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9 : Catalogue, client Wikimedia, construction et CLI (source rapide « top »)

**Files :**
- Create : `backend/src/jobs/catalogue/wikimedia.js`, `backend/src/jobs/catalogue/sources.js`, `backend/src/jobs/catalogue/construire.js`, `backend/src/jobs/catalogue/cli.js`, `backend/tests/catalogue-wikimedia.test.js`, `backend/tests/catalogue-construire.test.js`

**Interfaces :**
- Consumes : `lots`, `estTitreCandidat`, `estArticleValide`, `percentiles`, `versStat`, `calculerDefense`, `raretePourRang`, `typeDepuisP31`, `determinerType`, `JEU`
- Produces :
  - `creerClientWiki({ fetch?, userAgent, attente? })` qui renvoie :
    - `metadonnees(titres) → Meta[]`, avec `Meta = { titre, pageId, existe, ns, redirection, homonymie, longueur, wikidata, image }`
    - `extraits(pageIds) → Map<pageId, string>`
    - `labels(pageIds) → Map<pageId, 'qualite'|'bon'>`
    - `liensExternes(pageIds) → Map<pageId, number>`
    - `categories(pageIds) → Map<pageId, string[]>`
    - `natures(qids) → Map<qid, string[]>`
    - `topMensuel(mois: 'AAAA-MM') → { titre, vues }[]`
  - `moisPrecedents(maintenant, nb) → string[]` (mois complets, du plus récent au plus ancien)
  - `vuesDepuisTop(client, maintenant, nbMois) → Map<titre, vues>`
  - `construireCatalogue({ db, client, vues, n, longueurMin, parts, maintenant?, log? }) → { gardes, desactives }`
  - `enregistrerCatalogue(db, lignes, maintenant) → nbDesactives`
  - CLI : `npm run catalogue -- --source=top --mois=3 --n=1000`

- [ ] **Step 1 : écrire les tests du client (qui échouent)**

`backend/tests/catalogue-wikimedia.test.js` :

```js
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
```

- [ ] **Step 2 : lancer les tests et vérifier qu'ils échouent**

Run : `cd backend && npx vitest run tests/catalogue-wikimedia.test.js`
Expected : FAIL, modules introuvables.

- [ ] **Step 3 : implémenter le client et les sources**

`backend/src/jobs/catalogue/wikimedia.js` :

```js
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
    const qs = new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params });
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
```

`backend/src/jobs/catalogue/sources.js` :

```js
export function moisPrecedents(maintenant, nb) {
  const res = [];
  for (let i = 1; i <= nb; i++) {
    const d = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - i, 1));
    res.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return res;
}

/** Source rapide (dev / premier lancement) : top 1000 mensuel de l'API Wikimedia. */
export async function vuesDepuisTop(client, maintenant, nbMois) {
  const vues = new Map();
  for (const mois of moisPrecedents(maintenant, nbMois)) {
    for (const { titre, vues: v } of await client.topMensuel(mois)) vues.set(titre, (vues.get(titre) ?? 0) + v);
  }
  return vues;
}
```

- [ ] **Step 4 : lancer les tests du client et vérifier qu'ils passent**

Run : `cd backend && npx vitest run tests/catalogue-wikimedia.test.js`
Expected : PASS (8 tests)

- [ ] **Step 5 : écrire les tests de construction (qui échouent)**

`backend/tests/catalogue-construire.test.js` :

```js
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { preparerBaseTest, viderBase } from './aide/db.js';
import { construireCatalogue } from '../src/jobs/catalogue/construire.js';

let db;
beforeAll(async () => { db = await preparerBaseTest(); });
beforeEach(async () => { await viderBase(db); });
afterAll(async () => { await db.end(); });

const PARTS = { legendaire: 0.25, super_rare: 0.25, ultra_rare: 0.25, rare: 0.25, commune: 0 };
const ARTICLES = {
  'Napoléon Ier': { pageId: 1, longueur: 9000, wikidata: 'Q517' },
  Paris: { pageId: 2, longueur: 8000, wikidata: 'Q90' },
  Ornithorynque: { pageId: 3, longueur: 5000, wikidata: 'Q15343' },
  Mercure: { pageId: 4, longueur: 3000, homonymie: true },
  Bref: { pageId: 5, longueur: 100 },
  Cassoulet: { pageId: 6, longueur: 4000, wikidata: null },
};

function fauxClient({ echecNatures = false } = {}) {
  return {
    metadonnees: async (titres) => titres.map((titre) => ({
      titre, existe: true, ns: 0, redirection: false, homonymie: false, image: null, wikidata: null,
      ...ARTICLES[titre],
    })),
    extraits: async (ids) => new Map(ids.map((id) => [id, `Extrait ${id}`])),
    labels: async () => new Map([[1, 'qualite']]),
    liensExternes: async (ids) => new Map(ids.map((id) => [id, id * 10])),
    natures: async () => {
      if (echecNatures) throw new Error('Wikidata injoignable');
      return new Map([['Q517', ['Q5']], ['Q90', ['Q515']], ['Q15343', ['Q16521']]]);
    },
    categories: async () => new Map([[6, ['Catégorie:Truc']]]),
  };
}

const VUES = new Map([
  ['Napoléon Ier', 1000], ['Paris', 900], ['Ornithorynque', 500], ['Mercure', 800],
  ['Bref', 700], ['Cassoulet', 100], ['Liste des pays', 5000], ['1789', 4000],
]);
const options = (extra = {}) => ({ db, client: fauxClient(), vues: VUES, n: 4, longueurMin: 2000, parts: PARTS, log: () => {}, ...extra });

describe('construireCatalogue', () => {
  it('filtre, classe, calcule les stats et enregistre', async () => {
    const res = await construireCatalogue(options());
    expect(res).toEqual({ gardes: 4, desactives: 0 });
    const [lignes] = await db.query('SELECT page_id, titre, type, rarete, rang, attaque, defense, actif FROM catalogue ORDER BY rang');
    expect(lignes.map((l) => [l.titre, l.type, l.rarete, l.rang])).toEqual([
      ['Napoléon Ier', 'personnalite', 'legendaire', 1],
      ['Paris', 'lieu', 'super_rare', 2],
      ['Ornithorynque', 'nature', 'ultra_rare', 3],
      ['Cassoulet', 'culture', 'rare', 4],
    ]);
    expect(lignes[0].attaque).toBe(100);
    expect(lignes[3].attaque).toBe(1);
    expect(lignes[0].defense).toBeGreaterThan(lignes[1].defense);
  });

  it('respecte N', async () => {
    expect((await construireCatalogue(options({ n: 2 }))).gardes).toBe(2);
  });

  it('désactive les cartes sorties du top N lors du passage suivant', async () => {
    await construireCatalogue(options());
    const res = await construireCatalogue(options({ n: 2, maintenant: new Date(Date.now() + 1000) }));
    expect(res).toEqual({ gardes: 2, desactives: 2 });
    const [[{ actives }]] = await db.query('SELECT COUNT(*) AS actives FROM catalogue WHERE actif = 1');
    expect(Number(actives)).toBe(2);
  });

  it("garde l'ancien catalogue si une étape échoue", async () => {
    await construireCatalogue(options());
    await expect(construireCatalogue(options({ client: fauxClient({ echecNatures: true }) }))).rejects.toThrow(/Wikidata/);
    const [[{ actives }]] = await db.query('SELECT COUNT(*) AS actives FROM catalogue WHERE actif = 1');
    expect(Number(actives)).toBe(4);
  });

  it('refuse de vider le catalogue si aucun article n’est retenu', async () => {
    await expect(construireCatalogue(options({ vues: new Map([['1789', 10]]) }))).rejects.toThrow(/Aucun article/);
  });
});
```

- [ ] **Step 6 : lancer les tests et vérifier qu'ils échouent**

Run : `cd backend && npx vitest run tests/catalogue-construire.test.js`
Expected : FAIL, module `construire.js` introuvable.

- [ ] **Step 7 : implémenter la construction et la CLI**

`backend/src/jobs/catalogue/construire.js` :

```js
import { lots } from '../../utils/lots.js';
import { estTitreCandidat, estArticleValide } from './filtres.js';
import { percentiles, versStat, calculerDefense, raretePourRang } from './stats.js';
import { typeDepuisP31, determinerType } from './types.js';

const TRANCHE = 500;

export async function construireCatalogue({
  db, client, vues, n, longueurMin, parts, maintenant = new Date(), log = console.log,
}) {
  const candidats = [...vues.entries()]
    .map(([titre, v]) => ({ titre: titre.replace(/_/g, ' '), vues: v }))
    .filter((c) => estTitreCandidat(c.titre))
    .sort((a, b) => b.vues - a.vues);

  const gardes = [];
  const dejaVus = new Set();
  for (let i = 0; i < candidats.length && gardes.length < n; i += TRANCHE) {
    const tranche = candidats.slice(i, i + TRANCHE);
    const vuesParTitre = new Map(tranche.map((c) => [c.titre, c.vues]));
    for (const meta of await client.metadonnees(tranche.map((c) => c.titre))) {
      if (!estArticleValide(meta, longueurMin) || dejaVus.has(meta.pageId)) continue;
      dejaVus.add(meta.pageId);
      gardes.push({ ...meta, vues: vuesParTitre.get(meta.titre) ?? 0 });
    }
    log(`Métadonnées : ${Math.min(i + TRANCHE, candidats.length)}/${candidats.length} candidats, ${gardes.length} retenus`);
  }
  gardes.sort((a, b) => b.vues - a.vues);
  gardes.length = Math.min(gardes.length, n);
  if (!gardes.length) throw new Error('Aucun article retenu : catalogue inchangé.');

  const ids = gardes.map((g) => g.pageId);
  log('Extraits, labels et liens externes…');
  const extraits = await client.extraits(ids);
  const labels = await client.labels(ids);
  const liens = await client.liensExternes(ids);
  log('Natures Wikidata…');
  const natures = await client.natures(gardes.map((g) => g.wikidata).filter(Boolean));
  const sansType = gardes.filter((g) => !typeDepuisP31(natures.get(g.wikidata) ?? []));
  const categories = sansType.length ? await client.categories(sansType.map((g) => g.pageId)) : new Map();

  const pLongueur = percentiles(gardes.map((g) => g.longueur));
  const pLiens = percentiles(gardes.map((g) => liens.get(g.pageId) ?? 0));
  const rareteDe = raretePourRang(gardes.length, parts);
  const lignes = gardes.map((g, i) => [
    g.pageId, g.titre.slice(0, 255), extraits.get(g.pageId) ?? '', g.image,
    determinerType(natures.get(g.wikidata) ?? [], categories.get(g.pageId) ?? []),
    rareteDe(i), versStat(pLongueur[i]), calculerDefense(pLiens[i], labels.get(g.pageId) ?? null),
    i + 1, g.vues, 1, maintenant,
  ]);

  const desactives = await enregistrerCatalogue(db, lignes, maintenant);
  log(`Catalogue : ${lignes.length} cartes actives, ${desactives} désactivées.`);
  return { gardes: lignes.length, desactives };
}

export async function enregistrerCatalogue(db, lignes, maintenant) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const lot of lots(lignes, 500)) {
      await conn.query(
        `INSERT INTO catalogue (page_id, titre, extrait, image_url, type, rarete, attaque, defense, rang, vues_12_mois, actif, maj_le)
         VALUES ? AS nouv
         ON DUPLICATE KEY UPDATE titre = nouv.titre, extrait = nouv.extrait, image_url = nouv.image_url,
           type = nouv.type, rarete = nouv.rarete, attaque = nouv.attaque, defense = nouv.defense,
           rang = nouv.rang, vues_12_mois = nouv.vues_12_mois, actif = 1, maj_le = nouv.maj_le`,
        [lot],
      );
    }
    const [r] = await conn.query('UPDATE catalogue SET actif = 0 WHERE actif = 1 AND maj_le < ?', [maintenant]);
    await conn.commit();
    return r.affectedRows;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
```

`backend/src/jobs/catalogue/cli.js` :

```js
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
```

- [ ] **Step 8 : lancer les tests et vérifier qu'ils passent**

Run : `cd backend && npx vitest run tests/catalogue-construire.test.js tests/catalogue-wikimedia.test.js`
Expected : PASS

- [ ] **Step 9 : essai réel (petit catalogue)**

Dans `backend/.env`, renseigner `WIKI_USER_AGENT=WikiCards/0.1 (contact: <ton email>)`. La politique de Wikimedia exige un contact réel, et c'est à toi de le remplir.

Run : `cd backend && npm run catalogue -- --source=top --mois=3 --n=300`
Expected : « Catalogue : 300 cartes actives, 0 désactivées. » (ou un peu moins si les filtres en écartent beaucoup), en 1 à 3 minutes.

Vérifier : `node -e "import('./src/database.js').then(async m=>{const db=m.creerPool(process.env.DB_NAME);const [r]=await db.query('SELECT rarete, type, COUNT(*) n FROM catalogue GROUP BY rarete, type');console.table(r);await db.end()})"`
Expected : les 5 raretés présentes et plusieurs types, pas tout en `culture`.

- [ ] **Step 10 : commit**

```bash
git add backend/src/jobs backend/tests/catalogue-wikimedia.test.js backend/tests/catalogue-construire.test.js
git commit -m "Catalogue : client Wikimedia, construction et CLI

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10 : Catalogue, source de production (dumps mensuels de vues)

**Files :**
- Create : `backend/src/jobs/catalogue/dumps.js`, `backend/tests/catalogue-dumps.test.js`

**Interfaces :**
- Consumes : `moisPrecedents`, `lots`, `JEU.catalogue.seuilVuesMensuelles`
- Produces :
  - `urlDumpMensuel(mois) → string`
  - `parserLigneDump(ligne) → { titre, vues } | null`
  - `importerMois(db, mois, lignes: AsyncIterable<string>, seuil) → nbTitres`
  - `vuesDepuisDumps(db, maintenant, { nbMois?, seuil?, ouvrirLignes?, log? }) → Map<titre, vues>` (utilisée par la CLI : `--source=dumps`)

- [ ] **Step 1 : vérifier le format réel du fichier**

Run : `curl -sI -A "WikiCards-dev" https://dumps.wikimedia.org/other/pageview_complete/monthly/2026/2026-09/pageviews-202609-user.bz2 | head -3`
Expected : `HTTP/2 200` et une `content-length` de plusieurs Go. Si le chemin diffère, ouvrir `https://dumps.wikimedia.org/other/pageview_complete/monthly/` dans un navigateur et corriger `urlDumpMensuel` à l'étape 3.

Run (s'arrête après 3 lignes `fr.wikipedia`, peut prendre plusieurs minutes car fr arrive après de, en…) :

```bash
cd backend && npm install unbzip2-stream && node -e "
const bz2=require('unbzip2-stream');const rl=require('readline');const {Readable}=require('stream');
fetch('https://dumps.wikimedia.org/other/pageview_complete/monthly/2026/2026-09/pageviews-202609-user.bz2',{headers:{'User-Agent':'WikiCards-dev'}}).then(r=>{
const l=rl.createInterface({input:Readable.fromWeb(r.body).pipe(bz2())});let n=0;
l.on('line',x=>{if(x.startsWith('fr.wikipedia ')){console.log(x);if(++n===3)process.exit(0)}})})"
```

Expected : des lignes de la forme `fr.wikipedia Titre_avec_underscores 12345 desktop 678 …`, soit le code wiki, le titre, l'id de page, le mode d'accès et le total du mois. Si la colonne des vues n'est pas la 5e, adapter `parserLigneDump` et son test.

- [ ] **Step 2 : écrire les tests qui échouent**

`backend/tests/catalogue-dumps.test.js` :

```js
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { preparerBaseTest, viderBase } from './aide/db.js';
import { urlDumpMensuel, parserLigneDump, importerMois, vuesDepuisDumps } from '../src/jobs/catalogue/dumps.js';

let db;
beforeAll(async () => { db = await preparerBaseTest(); });
beforeEach(async () => { await viderBase(db); });
afterAll(async () => { await db.end(); });

async function* flux(lignes) { for (const l of lignes) yield l; }

describe('dumps de vues', () => {
  it("construit l'URL mensuelle", () => {
    expect(urlDumpMensuel('2026-09'))
      .toBe('https://dumps.wikimedia.org/other/pageview_complete/monthly/2026/2026-09/pageviews-202609-user.bz2');
  });

  it('ne garde que fr.wikipedia', () => {
    expect(parserLigneDump('fr.wikipedia Tour_Eiffel 1359783 desktop 4000 A1B2')).toEqual({ titre: 'Tour Eiffel', vues: 4000 });
    expect(parserLigneDump('en.wikipedia Eiffel_Tower 9 desktop 4000 A1')).toBeNull();
    expect(parserLigneDump('fr.wiktionary chat 1 desktop 40 A1')).toBeNull();
    expect(parserLigneDump('fr.wikipedia Cassé null desktop pasunnombre')).toBeNull();
  });

  it('additionne les modes d’accès et applique le seuil', async () => {
    const nb = await importerMois(db, '2026-09', flux([
      'fr.wikipedia Tour_Eiffel 1 desktop 200 A', 'fr.wikipedia Tour_Eiffel 1 mobile-web 150 A',
      'fr.wikipedia Élan 2 desktop 299 A', 'fr.wikipedia Elan 3 desktop 400 A',
    ]), 300);
    expect(nb).toBe(2);
    const [lignes] = await db.query('SELECT titre, vues FROM vues_mensuelles ORDER BY titre');
    expect(lignes).toEqual([{ titre: 'Elan', vues: 400 }, { titre: 'Tour Eiffel', vues: 350 }]);
  });

  it('télécharge seulement les mois manquants, purge les anciens et additionne', async () => {
    await db.query("INSERT INTO vues_mensuelles VALUES ('2026-09', 'Paris', 1000), ('2025-01', 'Vieux', 999)");
    const ouverts = [];
    const vues = await vuesDepuisDumps(db, new Date('2026-10-10T00:00:00Z'), {
      nbMois: 2, seuil: 1, log: () => {},
      ouvrirLignes: async (url) => { ouverts.push(url); return flux(['fr.wikipedia Paris 1 desktop 500 A', 'fr.wikipedia Lyon 2 desktop 50 A']); },
    });
    expect(ouverts).toEqual([urlDumpMensuel('2026-08')]);
    expect(vues).toEqual(new Map([['Paris', 1500], ['Lyon', 50]]));
    const [[{ n }]] = await db.query("SELECT COUNT(*) AS n FROM vues_mensuelles WHERE mois = '2025-01'");
    expect(Number(n)).toBe(0);
  });
});
```

- [ ] **Step 3 : lancer les tests et vérifier qu'ils échouent**

Run : `cd backend && npx vitest run tests/catalogue-dumps.test.js`
Expected : FAIL, module introuvable.

- [ ] **Step 4 : implémenter**

`backend/src/jobs/catalogue/dumps.js` :

```js
import { Readable } from 'node:stream';
import { createInterface } from 'node:readline';
import bz2 from 'unbzip2-stream';
import { JEU } from '../../config/jeu.js';
import { lots } from '../../utils/lots.js';
import { moisPrecedents } from './sources.js';

export function urlDumpMensuel(mois) {
  const [annee, mm] = mois.split('-');
  return `https://dumps.wikimedia.org/other/pageview_complete/monthly/${annee}/${mois}/pageviews-${annee}${mm}-user.bz2`;
}

export function parserLigneDump(ligne) {
  if (!ligne.startsWith('fr.wikipedia ')) return null;
  const champs = ligne.split(' ');
  const vues = Number(champs[4]);
  if (champs.length < 5 || !Number.isFinite(vues)) return null;
  return { titre: champs[1].replace(/_/g, ' '), vues };
}

export async function importerMois(db, mois, lignes, seuil) {
  const totaux = new Map();
  for await (const ligne of lignes) {
    const entree = parserLigneDump(ligne);
    if (entree) totaux.set(entree.titre, (totaux.get(entree.titre) ?? 0) + entree.vues);
  }
  const retenus = [...totaux].filter(([titre, v]) => v >= seuil && titre.length <= 255);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM vues_mensuelles WHERE mois = ?', [mois]);
    for (const lot of lots(retenus, 5000)) {
      await conn.query('INSERT INTO vues_mensuelles (mois, titre, vues) VALUES ?', [lot.map(([t, v]) => [mois, t, v])]);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return retenus.length;
}

async function lignesDepuisUrl(url) {
  const rep = await fetch(url, { headers: { 'User-Agent': process.env.WIKI_USER_AGENT } });
  if (!rep.ok) throw new Error(`Dump indisponible (${rep.status}) : ${url}`);
  return createInterface({ input: Readable.fromWeb(rep.body).pipe(bz2()), crlfDelay: Infinity });
}

/** Source de production. Le premier lancement télécharge 12 mois (plusieurs heures), les suivants un seul. */
export async function vuesDepuisDumps(db, maintenant, {
  nbMois = 12, seuil = JEU.catalogue.seuilVuesMensuelles, ouvrirLignes = lignesDepuisUrl, log = console.log,
} = {}) {
  const mois = moisPrecedents(maintenant, nbMois);
  const [presents] = await db.query('SELECT DISTINCT mois FROM vues_mensuelles WHERE mois IN (?)', [mois]);
  const dejaLa = new Set(presents.map((p) => p.mois));
  for (const m of mois.filter((x) => !dejaLa.has(x))) {
    log(`Import des vues ${m}…`);
    log(`${await importerMois(db, m, await ouvrirLignes(urlDumpMensuel(m)), seuil)} titres importés pour ${m}.`);
  }
  await db.query('DELETE FROM vues_mensuelles WHERE mois NOT IN (?)', [mois]);
  const [lignes] = await db.query(
    'SELECT titre, SUM(vues) AS vues FROM vues_mensuelles WHERE mois IN (?) GROUP BY titre', [mois],
  );
  return new Map(lignes.map((l) => [l.titre, Number(l.vues)]));
}
```

- [ ] **Step 5 : lancer les tests et vérifier qu'ils passent**

Run : `cd backend && npx vitest run tests/catalogue-dumps.test.js`
Expected : PASS (4 tests)

- [ ] **Step 6 : commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/jobs/catalogue/dumps.js backend/tests/catalogue-dumps.test.js
git commit -m "Catalogue : source de production par dumps mensuels

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

> Le lancement complet (`npm run catalogue -- --source=dumps`) n'est **pas** exécuté dans ce plan : il prend plusieurs heures. Il sera planifié avec le déploiement. Pour développer, utiliser `--source=top`.

---

### Task 11 : Front, fondations (thème, API, session, navigation)

**Files :**
- Create : `proxy.conf.json`, `src/app/core/modeles.ts`, `src/app/core/libelles.ts`, `src/app/core/temps.ts`, `src/app/core/temps.spec.ts`, `src/app/core/api.ts`, `src/app/core/session.ts`, `src/app/core/gardes.ts`, `src/app/core/intercepteur.ts`, `src/app/layout/navigation/navigation.ts`, `src/app/layout/navigation/navigation.css`, `src/app/layout/pied-de-page/pied-de-page.ts`
- Modify : `angular.json` (proxy), `src/styles.css`, `src/app/app.ts`, `src/app/app.html`, `src/app/app.css`, `src/app/app.config.ts`, `src/app/app.routes.ts`, `src/app/app.routes.server.ts`
- Delete : `src/app/components/` (card, header, search-bar), `src/app/pages/home/`, `src/app/pages/card-detail/`, `src/app/services/`, `src/app/app.spec.ts`

**Interfaces :**
- Produces (TypeScript) :
  - `modeles.ts` : `Rarete`, `TypeCarte`, `Carte`, `CarteAlbum`, `CarteDetail`, `Moi`, `ResultatOuverture`, `PageAlbum`, `Doublon`, `ResultatVente`, `FiltresAlbum`
  - `libelles.ts` : `LIBELLES_RARETE: Record<Rarete,string>`, `LIBELLES_TYPE: Record<TypeCarte,string>`, `RARETES: Rarete[]` (de la plus rare à la plus courante), `TYPES: TypeCarte[]`
  - `temps.ts` : `formatDuree(ms: number): string`
  - `ApiService` : `moi()`, `majMoi(changements)`, `inscription(email, pseudo, motDePasse)`, `connexion(email, motDePasse)`, `deconnexion()`, `ouvrirPaquet(source)`, `album(filtres)`, `epingler(carteId, epinglee)`, `carte(id)`, `doublons()`, `vendre(ventes)`, toutes en `Promise`, plus `messageErreur(e): string`
  - `SessionService` : `moi: Signal<Moi|null>`, `recuLe: Signal<number>`, `definir(m)`, `charger()`, `vider()`, `majPieces(p)`
  - `connecteGuard`, `inviteGuard`, `intercepteurSession`

- [ ] **Step 1 : écrire le test qui échoue**

`src/app/core/temps.spec.ts` :

```ts
import { formatDuree } from './temps';

describe('formatDuree', () => {
  it('affiche les minutes arrondies au supérieur', () => {
    expect(formatDuree(36 * 60_000)).toBe('36 min');
    expect(formatDuree(35 * 60_000 + 1)).toBe('36 min');
  });
  it('affiche heures et minutes au-delà de 60 min', () => {
    expect(formatDuree(65 * 60_000)).toBe('1 h 05');
  });
  it('moins d’une minute', () => {
    expect(formatDuree(30_000)).toBe('moins d’une minute');
    expect(formatDuree(0)).toBe('moins d’une minute');
  });
});
```

- [ ] **Step 2 : supprimer l'ancien code et lancer le test pour vérifier qu'il échoue**

```bash
git rm -r -q src/app/components src/app/pages/home src/app/pages/card-detail src/app/services src/app/app.spec.ts
```

Run : `npx ng test --watch=false`
Expected : FAIL. `./temps` est introuvable, et `app.ts` ou les routes font encore référence à des fichiers supprimés.

- [ ] **Step 3 : implémenter**

`proxy.conf.json` :

```json
{
  "/api": { "target": "http://localhost:3000", "secure": false }
}
```

Dans `angular.json`, sous `"serve"`, ajouter une clé `"options"` à côté de `"builder"` :

```json
          "options": { "proxyConfig": "proxy.conf.json" },
```

`src/app/app.routes.server.ts` :

```ts
import { RenderMode, ServerRoute } from '@angular/ssr';

// Pages derrière une session : rendu côté navigateur uniquement.
export const serverRoutes: ServerRoute[] = [
  { path: '**', renderMode: RenderMode.Client },
];
```

`src/styles.css` :

```css
:root {
  --fond: #111113;
  --surface: #1a1a1e;
  --texte: #ededed;
  --gris: #8b8b90;
  --bordure: #26262b;
  --commune: #a8a29e;
  --rare: #3b82f6;
  --ultra-rare: #a855f7;
  --super-rare: #ec4899;
  --legendaire: #d97706;
  --rayon: 8px;
  --police: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif;
  color-scheme: dark;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  background: var(--fond);
  color: var(--texte);
  font-family: var(--police);
  font-size: 15px;
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; }
h1, h2, h3 { font-weight: 600; letter-spacing: -0.02em; margin: 0; }
.gris { color: var(--gris); }

button, input, select { font: inherit; color: inherit; }

.bouton {
  display: inline-block;
  border: 0;
  border-radius: var(--rayon);
  padding: 10px 22px;
  background: var(--texte);
  color: var(--fond);
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}
.bouton:disabled { opacity: 0.35; cursor: not-allowed; }
.bouton.secondaire { background: none; color: var(--texte); border: 1px solid var(--bordure); }

.lien { background: none; border: 0; padding: 0; color: var(--gris); text-decoration: underline; cursor: pointer; }

.champ {
  width: 100%;
  padding: 9px 12px;
  border-radius: var(--rayon);
  border: 1px solid var(--bordure);
  background: var(--surface);
}

.erreur { color: #f87171; font-size: 13px; }
.succes { color: #4ade80; font-size: 13px; }

.pastille { display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.pastille.commune { background: var(--commune); }
.pastille.rare { background: var(--rare); }
.pastille.ultra_rare { background: var(--ultra-rare); }
.pastille.super_rare { background: var(--super-rare); }
.pastille.legendaire { background: var(--legendaire); }
```

`src/app/core/modeles.ts` :

```ts
export type Rarete = 'commune' | 'rare' | 'ultra_rare' | 'super_rare' | 'legendaire';
export type TypeCarte = 'personnalite' | 'lieu' | 'histoire' | 'science' | 'culture' | 'nature';

export interface Carte {
  id: number;
  pageId: number;
  titre: string;
  extrait: string;
  imageUrl: string | null;
  type: TypeCarte;
  rarete: Rarete;
  attaque: number;
  defense: number;
}
export interface CarteAlbum extends Carte { quantite: number; epinglee: boolean; }
export interface CarteDetail extends CarteAlbum { actif: boolean; }

export interface Moi {
  id: number;
  pseudo: string;
  email: string;
  pieces: number;
  paquetsStockes: number;
  paquetsMax: number;
  prochainPaquetDansMs: number | null;
  paquetsAvantPitie: number;
  venteAutoCommunes: boolean;
}

export interface ResultatOuverture {
  cartes: (Carte & { nouvelle: boolean })[];
  etat: Moi;
  venteAuto: { cartes: number; pieces: number } | null;
}

export interface FiltresAlbum {
  raretes: Rarete[];
  types: TypeCarte[];
  q: string;
  manquantes: boolean;
  page: number;
}

export interface PageAlbum {
  cartes: CarteAlbum[];
  total: number;
  page: number;
  parPage: number;
  possedees: number;
  tailleCatalogue: number;
}

export interface Doublon {
  carteId: number;
  titre: string;
  rarete: Rarete;
  type: TypeCarte;
  imageUrl: string | null;
  vendables: number;
  prixUnitaire: number;
}

export interface ResultatVente { cartesVendues: number; piecesGagnees: number; pieces: number; }
```

`src/app/core/libelles.ts` :

```ts
import { Rarete, TypeCarte } from './modeles';

export const RARETES: Rarete[] = ['legendaire', 'super_rare', 'ultra_rare', 'rare', 'commune'];
export const TYPES: TypeCarte[] = ['personnalite', 'lieu', 'histoire', 'science', 'culture', 'nature'];

export const LIBELLES_RARETE: Record<Rarete, string> = {
  commune: 'Commune', rare: 'Rare', ultra_rare: 'Ultra Rare', super_rare: 'Super Rare', legendaire: 'Légendaire',
};
export const LIBELLES_TYPE: Record<TypeCarte, string> = {
  personnalite: 'Personnalité', lieu: 'Lieu', histoire: 'Histoire', science: 'Science', culture: 'Culture', nature: 'Nature',
};
```

`src/app/core/temps.ts` :

```ts
export function formatDuree(ms: number): string {
  if (ms < 60_000) return 'moins d’une minute';
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}
```

`src/app/core/api.ts` :

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  CarteDetail, Doublon, FiltresAlbum, Moi, PageAlbum, ResultatOuverture, ResultatVente,
} from './modeles';

export function messageErreur(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return 'Connexion perdue, réessaie.';
    if (typeof e.error?.message === 'string') return e.error.message;
  }
  return 'Une erreur est survenue, réessaie.';
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  moi() { return firstValueFrom(this.http.get<Moi>('/api/moi')); }
  majMoi(changements: { pseudo?: string; venteAutoCommunes?: boolean }) {
    return firstValueFrom(this.http.patch<Moi>('/api/moi', changements));
  }
  inscription(email: string, pseudo: string, motDePasse: string) {
    return firstValueFrom(this.http.post<Moi>('/api/auth/inscription', { email, pseudo, motDePasse }));
  }
  connexion(email: string, motDePasse: string) {
    return firstValueFrom(this.http.post<Moi>('/api/auth/connexion', { email, motDePasse }));
  }
  deconnexion() { return firstValueFrom(this.http.post<void>('/api/auth/deconnexion', {})); }
  ouvrirPaquet(source: 'stock' | 'achat') {
    return firstValueFrom(this.http.post<ResultatOuverture>('/api/paquets/ouvrir', { source }));
  }
  album(f: FiltresAlbum) {
    let params = new HttpParams().set('page', f.page);
    if (f.raretes.length) params = params.set('rarete', f.raretes.join(','));
    if (f.types.length) params = params.set('type', f.types.join(','));
    if (f.q.trim()) params = params.set('q', f.q.trim());
    if (f.manquantes) params = params.set('manquantes', '1');
    return firstValueFrom(this.http.get<PageAlbum>('/api/album', { params }));
  }
  epingler(carteId: number, epinglee: boolean) {
    return firstValueFrom(this.http.patch<{ carteId: number; epinglee: boolean }>(`/api/album/${carteId}/epingle`, { epinglee }));
  }
  carte(id: number) { return firstValueFrom(this.http.get<CarteDetail>(`/api/cartes/${id}`)); }
  doublons() { return firstValueFrom(this.http.get<{ doublons: Doublon[] }>('/api/doublons')); }
  vendre(ventes: { carteId: number; quantite: number }[]) {
    return firstValueFrom(this.http.post<ResultatVente>('/api/doublons/vendre', { ventes }));
  }
}
```

`src/app/core/session.ts` :

```ts
import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api';
import { Moi } from './modeles';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private api = inject(ApiService);
  readonly moi = signal<Moi | null>(null);
  /** Date.now() à la réception de `moi`, pour le compte à rebours. */
  readonly recuLe = signal(0);

  definir(moi: Moi) {
    this.moi.set(moi);
    this.recuLe.set(Date.now());
  }

  async charger(): Promise<Moi | null> {
    try {
      this.definir(await this.api.moi());
    } catch {
      this.moi.set(null);
    }
    return this.moi();
  }

  vider() { this.moi.set(null); }

  majPieces(pieces: number) {
    this.moi.update((m) => (m ? { ...m, pieces } : m));
  }
}
```

`src/app/core/gardes.ts` :

```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session';

export const connecteGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (session.moi() || (await session.charger())) return true;
  return router.parseUrl('/connexion');
};

export const inviteGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (session.moi() || (await session.charger())) return router.parseUrl('/paquets');
  return true;
};
```

`src/app/core/intercepteur.ts` :

```ts
import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionService } from './session';

/** Session expirée sur une page protégée → retour à la connexion. */
export const intercepteurSession: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const router = inject(Router);
  return next(req).pipe(
    catchError((e) => {
      const ignore = req.url.startsWith('/api/auth') || req.url === '/api/moi';
      if (e instanceof HttpErrorResponse && e.status === 401 && !ignore) {
        session.vider();
        router.navigateByUrl('/connexion');
      }
      return throwError(() => e);
    }),
  );
};
```

`src/app/layout/navigation/navigation.ts` :

```ts
import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from '../../core/session';

@Component({
  selector: 'app-navigation',
  imports: [RouterLink, RouterLinkActive, DecimalPipe],
  styleUrl: './navigation.css',
  template: `
    @if (session.moi(); as moi) {
      <header class="haut">
        <a routerLink="/paquets" class="marque">WikiCards</a>
        <nav class="liens">
          <a routerLink="/paquets" routerLinkActive="actif">Paquets</a>
          <a routerLink="/album" routerLinkActive="actif">Album</a>
          <a routerLink="/doublons" routerLinkActive="actif">Doublons</a>
        </nav>
        <span class="pieces">{{ moi.pieces | number }} pièces</span>
        <a routerLink="/profil" routerLinkActive="actif" class="profil" aria-label="Profil">{{ moi.pseudo }}</a>
      </header>

      <nav class="bas">
        <a routerLink="/paquets" routerLinkActive="actif">
          <svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M4 11h16M12 7v13" /></svg>Paquets
        </a>
        <a routerLink="/album" routerLinkActive="actif">
          <svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" /><rect x="13" y="4" width="7" height="7" /><rect x="4" y="13" width="7" height="7" /><rect x="13" y="13" width="7" height="7" /></svg>Album
        </a>
        <a routerLink="/doublons" routerLinkActive="actif">
          <svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5M18 3v4h-4M6 21v-4h4" /></svg>Doublons
        </a>
        <a routerLink="/profil" routerLinkActive="actif">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>Profil
        </a>
      </nav>
    }
  `,
})
export class Navigation {
  protected session = inject(SessionService);
}
```

`src/app/layout/navigation/navigation.css` :

```css
.haut {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 14px 28px;
  border-bottom: 1px solid var(--bordure);
}
.marque { font-weight: 600; font-size: 17px; letter-spacing: -0.02em; text-decoration: none; }
.liens { display: flex; gap: 22px; }
.liens a, .profil { color: var(--gris); text-decoration: none; }
.liens a.actif, .profil.actif { color: var(--texte); font-weight: 600; }
.pieces { margin-left: auto; color: var(--gris); font-size: 13px; }

.bas { display: none; }

@media (max-width: 767px) {
  .haut { padding: 14px 16px; }
  .liens, .profil { display: none; }
  .bas {
    display: flex;
    position: fixed;
    inset: auto 0 0 0;
    justify-content: space-around;
    padding: 8px 0 calc(10px + env(safe-area-inset-bottom));
    background: var(--fond);
    border-top: 1px solid var(--bordure);
    z-index: 10;
  }
  .bas a { color: var(--gris); text-decoration: none; font-size: 10px; text-align: center; }
  .bas a.actif { color: var(--texte); font-weight: 600; }
  .bas svg {
    display: block; margin: 0 auto 3px; width: 20px; height: 20px;
    stroke: currentColor; fill: none; stroke-width: 1.6;
  }
}
```

`src/app/layout/pied-de-page/pied-de-page.ts` :

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-pied-de-page',
  template: `
    <footer>
      Contenus issus de <a href="https://fr.wikipedia.org" target="_blank" rel="noopener">Wikipédia</a>,
      sous licence <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noopener">CC BY-SA 4.0</a>.
    </footer>
  `,
  styles: `footer { padding: 24px 28px 90px; color: var(--gris); font-size: 12px; border-top: 1px solid var(--bordure); margin-top: 40px; }
    @media (min-width: 768px) { footer { padding-bottom: 24px; } }`,
})
export class PiedDePage {}
```

`src/app/app.ts` :

```ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navigation } from './layout/navigation/navigation';
import { PiedDePage } from './layout/pied-de-page/pied-de-page';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navigation, PiedDePage],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
```

`src/app/app.html` :

```html
<app-navigation />
<main class="contenu"><router-outlet /></main>
<app-pied-de-page />
```

`src/app/app.css` :

```css
.contenu { max-width: 1100px; margin: 0 auto; padding: 32px 28px; }
@media (max-width: 767px) { .contenu { padding: 20px 16px; } }
```

`src/app/app.config.ts` :

```ts
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { routes } from './app.routes';
import { intercepteurSession } from './core/intercepteur';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(),
    provideHttpClient(withFetch(), withInterceptors([intercepteurSession])),
    { provide: LOCALE_ID, useValue: 'fr' },
  ],
};
```

`src/app/app.routes.ts` (les pages seront ajoutées par les tâches suivantes) :

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [];
```

- [ ] **Step 4 : lancer les tests et le build**

Run : `npx ng test --watch=false`
Expected : PASS (3 tests `formatDuree`)

Run : `npx ng build`
Expected : build réussi, sans erreur.

- [ ] **Step 5 : commit**

```bash
git add -A src angular.json proxy.conf.json
git commit -m "Front : fondations (thème sombre, API, session, navigation)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12 : Front, connexion et inscription

**Files :**
- Create : `src/app/pages/auth/auth.ts`, `src/app/pages/auth/auth.css`
- Modify : `src/app/app.routes.ts`

**Interfaces :**
- Consumes : `ApiService.connexion/inscription`, `messageErreur`, `SessionService.definir`, `inviteGuard`
- Produces : routes `/connexion` et `/inscription` (composant `PageAuth`, `data.mode`)

- [ ] **Step 1 : implémenter**

`src/app/pages/auth/auth.ts` :

```ts
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, messageErreur } from '../../core/api';
import { SessionService } from '../../core/session';

@Component({
  selector: 'app-page-auth',
  imports: [FormsModule, RouterLink],
  styleUrl: './auth.css',
  template: `
    <section class="carte-auth">
      <h1>{{ inscription ? 'Créer un compte' : 'Connexion' }}</h1>
      <p class="gris">{{ inscription ? '10 paquets offerts pour commencer.' : 'Content de te revoir.' }}</p>
      <form (ngSubmit)="valider()">
        <label>Email <input class="champ" type="email" name="email" [(ngModel)]="email" required autocomplete="email" /></label>
        @if (inscription) {
          <label>Pseudo <input class="champ" name="pseudo" [(ngModel)]="pseudo" required minlength="3" maxlength="20" /></label>
        }
        <label>Mot de passe
          <input class="champ" type="password" name="motDePasse" [(ngModel)]="motDePasse" required
            [attr.autocomplete]="inscription ? 'new-password' : 'current-password'" />
        </label>
        @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
        <button class="bouton" type="submit" [disabled]="enCours()">{{ inscription ? 'Créer mon compte' : 'Se connecter' }}</button>
      </form>
      @if (inscription) {
        <p class="gris">Déjà un compte ? <a routerLink="/connexion">Se connecter</a></p>
      } @else {
        <p class="gris">Pas encore de compte ? <a routerLink="/inscription">Créer un compte</a></p>
      }
    </section>
  `,
})
export class PageAuth {
  private api = inject(ApiService);
  private session = inject(SessionService);
  private router = inject(Router);
  protected inscription = inject(ActivatedRoute).snapshot.data['mode'] === 'inscription';

  protected email = '';
  protected pseudo = '';
  protected motDePasse = '';
  protected erreur = signal('');
  protected enCours = signal(false);

  async valider() {
    this.enCours.set(true);
    this.erreur.set('');
    try {
      const moi = this.inscription
        ? await this.api.inscription(this.email, this.pseudo, this.motDePasse)
        : await this.api.connexion(this.email, this.motDePasse);
      this.session.definir(moi);
      await this.router.navigateByUrl('/paquets');
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.enCours.set(false);
    }
  }
}
```

`src/app/pages/auth/auth.css` :

```css
.carte-auth { max-width: 380px; margin: 40px auto; display: flex; flex-direction: column; gap: 14px; }
form { display: flex; flex-direction: column; gap: 14px; margin-top: 8px; }
label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--gris); }
```

`src/app/app.routes.ts` (pas encore de `inviteGuard` : sans page `/paquets`, il créerait une boucle de redirection ; il arrive avec les routes finales à la tâche 14) :

```ts
import { Routes } from '@angular/router';
import { PageAuth } from './pages/auth/auth';

export const routes: Routes = [
  { path: 'connexion', component: PageAuth, data: { mode: 'connexion' } },
  { path: 'inscription', component: PageAuth, data: { mode: 'inscription' } },
  { path: '**', redirectTo: 'connexion' },
];
```

- [ ] **Step 2 : vérifier dans le navigateur**

Run (deux terminaux) : `cd backend && npm run dev` puis `npx ng serve`
1. Ouvrir `http://localhost:4200/inscription` et créer un compte. Expected : dans l'onglet Réseau des DevTools, `POST /api/auth/inscription` renvoie 201 et pose un cookie `session`. La page revient ensuite sur `/connexion`, ce qui est normal puisque `/paquets` n'existe pas encore.
2. Sur `/connexion`, entrer un mauvais mot de passe. Expected : « Email ou mot de passe incorrect. »
3. Entrer un pseudo de 2 lettres sur `/inscription`. Expected : message d'erreur du serveur sur le format du pseudo.

Run : `npx ng build`
Expected : build réussi.

- [ ] **Step 3 : commit**

```bash
git add src/app
git commit -m "Front : pages de connexion et d'inscription

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13 : Front, carte style TCG et fiche carte

**Files :**
- Create : `src/app/ui/carte/carte.ts`, `src/app/ui/carte/carte.css`, `src/app/ui/carte/carte.spec.ts`, `src/app/pages/carte/carte-detail.ts`, `src/app/pages/carte/carte-detail.css`

**Interfaces :**
- Consumes : `Carte`, `CarteDetail`, `LIBELLES_RARETE`, `LIBELLES_TYPE`, `ApiService.carte/epingler`
- Produces : composant `<app-carte [carte]="c" taille="normale|mini" />` (classe `CarteVisuelle`) ; page `PageCarte` (input `id` lu dans la route `carte/:id`, branchée par la tâche 14)

- [ ] **Step 1 : écrire le test qui échoue**

`src/app/ui/carte/carte.spec.ts` :

```ts
import { TestBed } from '@angular/core/testing';
import { CarteVisuelle } from './carte';
import { Carte } from '../../core/modeles';

const NAPOLEON: Carte = {
  id: 1, pageId: 69880, titre: 'Napoléon Ier', extrait: 'Empereur des Français.', imageUrl: 'https://img/napoleon.jpg',
  type: 'personnalite', rarete: 'legendaire', attaque: 92, defense: 88,
};

function rendre(carte: Carte, taille: 'normale' | 'mini' = 'normale') {
  const f = TestBed.createComponent(CarteVisuelle);
  f.componentRef.setInput('carte', carte);
  f.componentRef.setInput('taille', taille);
  f.detectChanges();
  return f.nativeElement.querySelector('article') as HTMLElement;
}

describe('CarteVisuelle', () => {
  it('affiche le titre, le type, les stats et le reflet holo pour une Légendaire', () => {
    const el = rendre(NAPOLEON);
    expect(el.classList).toContain('rarete-legendaire');
    expect(el.classList).toContain('holo');
    expect(el.textContent).toContain('Napoléon Ier');
    expect(el.textContent).toContain('Personnalité');
    expect(el.textContent).toContain('92');
    expect(el.querySelector('img')?.getAttribute('src')).toBe('https://img/napoleon.jpg');
  });

  it('pas de holo pour une Commune ; initiale si pas d’image ; pas d’extrait en mini', () => {
    const el = rendre({ ...NAPOLEON, rarete: 'commune', imageUrl: null, titre: 'Ornithorynque' }, 'mini');
    expect(el.classList).not.toContain('holo');
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.sans-image')?.textContent?.trim()).toBe('O');
    expect(el.querySelector('.texte')).toBeNull();
  });
});
```

- [ ] **Step 2 : lancer le test et vérifier qu'il échoue**

Run : `npx ng test --watch=false`
Expected : FAIL, `./carte` introuvable.

- [ ] **Step 3 : implémenter**

`src/app/ui/carte/carte.ts` :

```ts
import { Component, computed, input } from '@angular/core';
import { Carte } from '../../core/modeles';
import { LIBELLES_RARETE, LIBELLES_TYPE } from '../../core/libelles';

const HOLO = new Set(['ultra_rare', 'super_rare', 'legendaire']);

@Component({
  selector: 'app-carte',
  styleUrl: './carte.css',
  template: `
    <article class="carte" [class]="'rarete-' + carte().rarete" [class.holo]="holo()" [class.mini]="taille() === 'mini'">
      <header class="entete">
        <span class="titre">{{ carte().titre }}</span>
        <span class="gemme" [attr.title]="libelleRarete()"></span>
      </header>
      <div class="illustration">
        @if (carte().imageUrl) {
          <img [src]="carte().imageUrl" [alt]="carte().titre" loading="lazy" />
        } @else {
          <div class="sans-image">{{ carte().titre.charAt(0) }}</div>
        }
      </div>
      @if (taille() === 'normale') {
        <p class="texte"><strong>{{ libelleType() }}</strong> · {{ carte().extrait }}</p>
      }
      <footer class="stats">
        <span>ATQ {{ carte().attaque }}</span>
        <span>DÉF {{ carte().defense }}</span>
      </footer>
    </article>
  `,
})
export class CarteVisuelle {
  carte = input.required<Carte>();
  taille = input<'normale' | 'mini'>('normale');
  protected holo = computed(() => HOLO.has(this.carte().rarete));
  protected libelleRarete = computed(() => LIBELLES_RARETE[this.carte().rarete]);
  protected libelleType = computed(() => LIBELLES_TYPE[this.carte().type]);
}
```

`src/app/ui/carte/carte.css` :

```css
:host { display: block; }

.carte {
  --cadre: var(--commune);
  position: relative;
  aspect-ratio: 5 / 7;
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #1b1b1b;
  background: linear-gradient(145deg, color-mix(in srgb, var(--cadre) 70%, white), var(--cadre));
  overflow: hidden;
}
.rarete-rare { --cadre: var(--rare); }
.rarete-ultra_rare { --cadre: var(--ultra-rare); }
.rarete-super_rare { --cadre: var(--super-rare); }
.rarete-legendaire {
  --cadre: var(--legendaire);
  background: linear-gradient(135deg, #f9d976, #e67e22 40%, #fff3b0 60%, #d97706);
}

.entete, .texte, .stats { background: rgb(255 255 255 / 0.88); border-radius: 6px; }
.entete { display: flex; justify-content: space-between; align-items: center; gap: 6px; padding: 4px 8px; font-weight: 700; font-size: 13px; }
.titre { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gemme { width: 10px; height: 10px; border-radius: 50%; background: var(--cadre); box-shadow: 0 0 0 2px white; flex-shrink: 0; }

.illustration { position: relative; flex: 1; min-height: 0; border-radius: 6px; overflow: hidden; border: 2px solid rgb(0 0 0 / 0.25); background: #2a2a30; }
.illustration img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sans-image { height: 100%; display: grid; place-items: center; font-size: 48px; font-weight: 700; color: rgb(255 255 255 / 0.5); }

.texte { margin: 0; padding: 5px 8px; font-size: 11px; line-height: 1.35; max-height: 4.2em; overflow: hidden; }
.stats { display: flex; justify-content: space-between; padding: 4px 10px; font-weight: 800; font-size: 13px; }

.holo .illustration::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 30%, rgb(255 255 255 / 0.55) 45%, rgb(150 255 255 / 0.4) 52%, transparent 65%);
  background-size: 250% 100%;
  mix-blend-mode: overlay;
  animation: reflet 3.5s linear infinite;
}
@keyframes reflet { from { background-position: 150% 0; } to { background-position: -100% 0; } }
@media (prefers-reduced-motion: reduce) { .holo .illustration::after { animation: none; } }

.mini { padding: 5px; gap: 4px; border-radius: 8px; }
.mini .entete { font-size: 10px; padding: 2px 5px; }
.mini .stats { font-size: 10px; padding: 2px 6px; }
.mini .sans-image { font-size: 28px; }
```

`src/app/pages/carte/carte-detail.ts` :

```ts
import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, messageErreur } from '../../core/api';
import { CarteDetail } from '../../core/modeles';
import { LIBELLES_RARETE, LIBELLES_TYPE } from '../../core/libelles';
import { CarteVisuelle } from '../../ui/carte/carte';

@Component({
  selector: 'app-page-carte',
  imports: [CarteVisuelle, RouterLink],
  styleUrl: './carte-detail.css',
  template: `
    <a routerLink="/album" class="lien">← Album</a>
    @if (carte(); as c) {
      <div class="fiche">
        <app-carte [carte]="c" class="grande" />
        <div class="infos">
          <h1>{{ c.titre }}</h1>
          <p class="gris"><span class="pastille" [class]="c.rarete"></span> {{ raretes[c.rarete] }} · {{ types[c.type] }}</p>
          <p>{{ c.extrait }}</p>
          <p class="gris">Exemplaires possédés : {{ c.quantite }}</p>
          @if (!c.actif) { <p class="gris">Cette carte ne sort plus des paquets.</p> }
          <div class="actions">
            @if (c.quantite > 0) {
              <button class="bouton secondaire" (click)="basculerEpingle(c)">{{ c.epinglee ? 'Désépingler' : 'Épingler' }}</button>
            }
            <a class="lien" [href]="'https://fr.wikipedia.org/?curid=' + c.pageId" target="_blank" rel="noopener">Lire l'article sur Wikipédia</a>
          </div>
        </div>
      </div>
    }
    @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
  `,
})
export class PageCarte {
  private api = inject(ApiService);
  id = input.required<string>();
  protected carte = signal<CarteDetail | null>(null);
  protected erreur = signal('');
  protected raretes = LIBELLES_RARETE;
  protected types = LIBELLES_TYPE;

  constructor() {
    effect(() => { this.charger(Number(this.id())); });
  }

  private async charger(id: number) {
    this.erreur.set('');
    try {
      this.carte.set(await this.api.carte(id));
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  async basculerEpingle(c: CarteDetail) {
    try {
      const { epinglee } = await this.api.epingler(c.id, !c.epinglee);
      this.carte.set({ ...c, epinglee });
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }
}
```

`src/app/pages/carte/carte-detail.css` :

```css
.fiche { display: flex; gap: 40px; margin-top: 20px; align-items: flex-start; }
.grande { width: 280px; flex-shrink: 0; }
.infos { display: flex; flex-direction: column; gap: 12px; max-width: 520px; }
.actions { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; }
@media (max-width: 767px) {
  .fiche { flex-direction: column; align-items: center; }
  .grande { width: min(280px, 80vw); }
}
```

- [ ] **Step 4 : lancer les tests et vérifier qu'ils passent**

Run : `npx ng test --watch=false`
Expected : PASS (`formatDuree` + `CarteVisuelle`)

- [ ] **Step 5 : commit**

```bash
git add src/app
git commit -m "Front : carte style TCG et fiche carte

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14 : Front, page Paquets et animation d'ouverture

**Files :**
- Create : `src/app/pages/paquets/paquets.ts`, `src/app/pages/paquets/paquets.css`, `src/app/pages/paquets/ouverture/ouverture.ts`, `src/app/pages/paquets/ouverture/ouverture.css`
- Modify : `src/app/app.routes.ts` (routes protégées complètes)

**Interfaces :**
- Consumes : `SessionService`, `ApiService.ouvrirPaquet`, `formatDuree`, `messageErreur`, `CarteVisuelle`, `PageCarte`, `connecteGuard`
- Produces : `PagePaquets` ; `<app-ouverture [resultat]="r" (fermer)="…" />` ; routes finales (les pages Album, Doublons et Profil sont ajoutées par les tâches 15 à 17)

- [ ] **Step 1 : implémenter l'ouverture**

`src/app/pages/paquets/ouverture/ouverture.ts` :

```ts
import { Component, computed, input, output, signal } from '@angular/core';
import { ResultatOuverture } from '../../../core/modeles';
import { CarteVisuelle } from '../../../ui/carte/carte';

@Component({
  selector: 'app-ouverture',
  imports: [CarteVisuelle],
  styleUrl: './ouverture.css',
  template: `
    <div class="voile" role="dialog" aria-label="Ouverture du paquet">
      @if (!dechire()) {
        <div class="paquet" (animationend)="dechire.set(true)">PAQUET</div>
      } @else {
        <div class="cartes">
          @for (c of resultat().cartes; track $index) {
            <button class="emplacement" [class.retournee]="retournees().has($index)" (click)="retourner($index)"
              [attr.aria-label]="retournees().has($index) ? c.titre : 'Retourner la carte'">
              <span class="dos"></span>
              <span class="face">
                <app-carte [carte]="c" />
                @if (c.nouvelle) { <span class="nouvelle">Nouvelle</span> }
              </span>
            </button>
          }
        </div>
        @if (resultat().venteAuto?.cartes) {
          <p class="gris">{{ resultat().venteAuto!.cartes }} Communes en double revendues (+{{ resultat().venteAuto!.pieces }} pièces).</p>
        }
        <div class="actions">
          @if (!toutesRetournees()) {
            <button class="bouton secondaire" (click)="toutRetourner()">Tout retourner</button>
          }
          <button class="bouton" (click)="fermer.emit()">Terminer</button>
        </div>
      }
    </div>
  `,
})
export class Ouverture {
  resultat = input.required<ResultatOuverture>();
  fermer = output<void>();
  protected dechire = signal(false);
  protected retournees = signal<ReadonlySet<number>>(new Set());
  protected toutesRetournees = computed(() => this.retournees().size === this.resultat().cartes.length);

  retourner(i: number) {
    this.retournees.update((s) => new Set(s).add(i));
  }

  toutRetourner() {
    this.retournees.set(new Set(this.resultat().cartes.map((_, i) => i)));
  }
}
```

`src/app/pages/paquets/ouverture/ouverture.css` :

```css
.voile {
  position: fixed; inset: 0; z-index: 20;
  background: rgb(10 10 12 / 0.94);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px;
  padding: 20px; overflow-y: auto;
}
.paquet {
  width: 200px; height: 280px; border-radius: 10px;
  border: 1px solid var(--bordure); background: var(--surface);
  display: grid; place-items: center; color: var(--gris); letter-spacing: 3px; font-size: 11px;
  animation: dechirer 0.5s ease-in forwards;
}
@keyframes dechirer {
  0% { transform: scale(1); }
  60% { transform: scale(1.06) rotate(-2deg); }
  100% { transform: scale(0.6); opacity: 0; clip-path: polygon(0 0, 100% 0, 100% 40%, 0 60%); }
}
.cartes { display: grid; grid-template-columns: repeat(5, 170px); gap: 16px; }
@media (max-width: 960px) { .cartes { grid-template-columns: repeat(3, minmax(0, 150px)); } }
@media (max-width: 520px) { .cartes { grid-template-columns: repeat(2, minmax(0, 150px)); } }

.emplacement {
  position: relative; aspect-ratio: 5 / 7; border: 0; padding: 0; background: none; cursor: pointer;
  perspective: 900px;
}
.dos, .face {
  position: absolute; inset: 0; backface-visibility: hidden;
  transition: transform 0.5s ease;
}
.dos {
  border-radius: 12px; border: 1px solid var(--bordure);
  background: repeating-linear-gradient(45deg, var(--surface) 0 8px, #202026 8px 16px);
}
.face { transform: rotateY(180deg); }
.retournee .dos { transform: rotateY(-180deg); }
.retournee .face { transform: rotateY(0); }
.nouvelle {
  position: absolute; top: -8px; right: -8px;
  background: var(--texte); color: var(--fond); font-size: 10px; font-weight: 700;
  padding: 2px 8px; border-radius: 10px;
}
.actions { display: flex; gap: 12px; }
@media (prefers-reduced-motion: reduce) { .paquet { animation-duration: 0.01s; } .dos, .face { transition: none; } }
```

- [ ] **Step 2 : implémenter la page**

`src/app/pages/paquets/paquets.ts` :

```ts
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService, messageErreur } from '../../core/api';
import { SessionService } from '../../core/session';
import { Carte, ResultatOuverture } from '../../core/modeles';
import { formatDuree } from '../../core/temps';
import { RouterLink } from '@angular/router';
import { Ouverture } from './ouverture/ouverture';

const PRIX_PAQUET = 100;

@Component({
  selector: 'app-page-paquets',
  imports: [Ouverture, RouterLink],
  styleUrl: './paquets.css',
  template: `
    @if (session.moi(); as moi) {
      <div class="paquets">
        <div class="paquet">PAQUET</div>
        <div class="etat">
          <p class="gris">Paquets disponibles</p>
          <p class="compteur">{{ moi.paquetsStockes }} <small>/ {{ moi.paquetsMax }}</small></p>
          <div class="jauge"><i [style.width.%]="(moi.paquetsStockes / moi.paquetsMax) * 100"></i></div>
          <p class="gris">
            @if (resteMs() === null) { Stock plein } @else { Prochain paquet dans {{ duree(resteMs()!) }} }
          </p>
          <div class="actions">
            <button class="bouton" (click)="ouvrir('stock')" [disabled]="enCours() || moi.paquetsStockes < 1">Ouvrir un paquet</button>
            <button class="lien" (click)="ouvrir('achat')" [disabled]="enCours() || moi.pieces < prix">Acheter · {{ prix }} pièces</button>
          </div>
          @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
          <p class="gris petit">Légendaire garantie dans {{ moi.paquetsAvantPitie }} paquets</p>
        </div>
        <aside class="dernieres">
          <h2>Dernières cartes</h2>
          @for (c of dernieres(); track $index) {
            <a [routerLink]="['/carte', c.id]"><span class="pastille" [class]="c.rarete"></span>{{ c.titre }}</a>
          } @empty {
            <p class="gris petit">Ouvre un paquet pour commencer.</p>
          }
        </aside>
      </div>
    }
    @if (ouverture(); as r) { <app-ouverture [resultat]="r" (fermer)="ouverture.set(null)" /> }
  `,
})
export class PagePaquets implements OnInit, OnDestroy {
  protected session = inject(SessionService);
  private api = inject(ApiService);
  protected prix = PRIX_PAQUET;
  protected enCours = signal(false);
  protected erreur = signal('');
  protected ouverture = signal<ResultatOuverture | null>(null);
  protected dernieres = signal<Carte[]>([]);
  private maintenant = signal(Date.now());
  private minuteur?: ReturnType<typeof setInterval>;
  private rechargeEnCours = false;

  protected resteMs = computed(() => {
    const moi = this.session.moi();
    if (!moi || moi.prochainPaquetDansMs === null) return null;
    return Math.max(0, moi.prochainPaquetDansMs - (this.maintenant() - this.session.recuLe()));
  });
  protected duree = formatDuree;

  ngOnInit() {
    this.minuteur = setInterval(async () => {
      this.maintenant.set(Date.now());
      if (this.resteMs() === 0 && !this.rechargeEnCours) {
        this.rechargeEnCours = true;
        await this.session.charger();
        this.rechargeEnCours = false;
      }
    }, 1000);
  }

  ngOnDestroy() { clearInterval(this.minuteur); }

  async ouvrir(source: 'stock' | 'achat') {
    this.enCours.set(true);
    this.erreur.set('');
    try {
      const resultat = await this.api.ouvrirPaquet(source);
      this.session.definir(resultat.etat);
      this.maintenant.set(Date.now());
      this.dernieres.update((d) => [...resultat.cartes, ...d].slice(0, 10));
      this.ouverture.set(resultat);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.enCours.set(false);
    }
  }
}
```

`src/app/pages/paquets/paquets.css` :

```css
.paquets { display: flex; gap: 40px; align-items: flex-start; }
.paquet {
  width: 200px; height: 280px; flex-shrink: 0; border-radius: 10px;
  border: 1px solid var(--bordure); background: var(--surface);
  display: grid; place-items: center; color: var(--gris); letter-spacing: 3px; font-size: 11px;
}
.etat { display: flex; flex-direction: column; gap: 8px; }
.etat p { margin: 0; }
.compteur { font-size: 52px; font-weight: 600; letter-spacing: -2px; line-height: 1; }
.compteur small { font-size: 18px; color: var(--gris); font-weight: 400; letter-spacing: 0; }
.jauge { width: 260px; max-width: 100%; height: 3px; background: var(--bordure); border-radius: 2px; margin: 8px 0; }
.jauge i { display: block; height: 100%; background: var(--texte); border-radius: 2px; transition: width 0.3s; }
.actions { display: flex; gap: 18px; align-items: center; margin-top: 14px; flex-wrap: wrap; }
.petit { font-size: 12px; margin-top: 12px !important; }
.dernieres { margin-left: auto; width: 210px; border-left: 1px solid var(--bordure); padding-left: 24px; }
.dernieres h2 { font-size: 13px; margin-bottom: 10px; }
.dernieres a {
  display: flex; align-items: center; gap: 8px; padding: 7px 0;
  font-size: 13px; text-decoration: none; border-bottom: 1px solid var(--bordure);
}
@media (max-width: 767px) {
  .paquets { flex-direction: column; align-items: stretch; gap: 20px; }
  .paquet { width: 150px; height: 210px; margin: 0 auto; order: 1; }
  .etat { order: 0; }
  .etat .actions { order: 2; }
  .dernieres { margin: 0; width: auto; border: 0; padding: 0; order: 3; }
}
```

`src/app/app.routes.ts` :

```ts
import { Routes } from '@angular/router';
import { connecteGuard, inviteGuard } from './core/gardes';
import { PageAuth } from './pages/auth/auth';
import { PagePaquets } from './pages/paquets/paquets';
import { PageCarte } from './pages/carte/carte-detail';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'paquets' },
  { path: 'connexion', component: PageAuth, data: { mode: 'connexion' }, canActivate: [inviteGuard] },
  { path: 'inscription', component: PageAuth, data: { mode: 'inscription' }, canActivate: [inviteGuard] },
  {
    path: '',
    canActivate: [connecteGuard],
    children: [
      { path: 'paquets', component: PagePaquets },
      { path: 'carte/:id', component: PageCarte },
      // PAGES (ajoutées par les tâches suivantes)
    ],
  },
  { path: '**', redirectTo: 'paquets' },
];
```

- [ ] **Step 3 : vérifier dans le navigateur**

Prérequis : catalogue rempli (tâche 9, étape 9). Lancer `cd backend && npm run dev` et `npx ng serve`.

1. Ouvrir `http://localhost:4200/inscription` et créer un compte. Expected : page Paquets avec « 10 / 10 » et « Stock plein ».
2. Cliquer « Ouvrir un paquet ». Expected : animation du paquet, 5 cartes face cachée ; un clic retourne une carte ; reflet sur les Ultra Rare et au-dessus ; badge « Nouvelle ».
3. Fermer. Expected : « 9 / 10 », « Prochain paquet dans 60 min », les 5 cartes dans « Dernières cartes ».
4. Réduire la fenêtre sous 768 px. Expected : la barre en bas apparaît et le menu du haut se masque.
5. Le lien « Acheter » est désactivé (0 pièce).

Run : `npx ng build`
Expected : build réussi.

- [ ] **Step 4 : commit**

```bash
git add src/app
git commit -m "Front : page Paquets et animation d'ouverture

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15 : Front, Album

**Files :**
- Create : `src/app/pages/album/album.ts`, `src/app/pages/album/album.css`
- Modify : `src/app/app.routes.ts`

**Interfaces :**
- Consumes : `ApiService.album`, `FiltresAlbum`, `PageAlbum`, `RARETES`, `TYPES`, `LIBELLES_*`, `CarteVisuelle`
- Produces : `PageAlbum` (classe `PageAlbumComposant`) sur la route `/album`

- [ ] **Step 1 : implémenter**

`src/app/pages/album/album.ts` :

```ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, messageErreur } from '../../core/api';
import { CarteAlbum, FiltresAlbum, Rarete, TypeCarte } from '../../core/modeles';
import { LIBELLES_RARETE, LIBELLES_TYPE, RARETES, TYPES } from '../../core/libelles';
import { CarteVisuelle } from '../../ui/carte/carte';

@Component({
  selector: 'app-page-album',
  imports: [CarteVisuelle, RouterLink, DecimalPipe],
  styleUrl: './album.css',
  template: `
    <div class="album">
      <aside class="filtres">
        <h3>Rareté</h3>
        @for (r of raretes; track r) {
          <label><input type="checkbox" [checked]="filtres().raretes.includes(r)" (change)="basculerRarete(r)" />
            <span class="pastille" [class]="r"></span>{{ libRarete[r] }}</label>
        }
        <h3>Type</h3>
        @for (t of types; track t) {
          <label><input type="checkbox" [checked]="filtres().types.includes(t)" (change)="basculerType(t)" />{{ libType[t] }}</label>
        }
        <h3>Affichage</h3>
        <label><input type="checkbox" [checked]="filtres().manquantes" (change)="basculerManquantes()" />Cartes manquantes</label>
      </aside>

      <section class="contenu">
        <div class="tete">
          <p><strong>{{ possedees() | number }}</strong> <span class="gris">/ {{ tailleCatalogue() | number }} cartes</span></p>
          <input class="champ recherche" type="search" placeholder="Rechercher une carte…" (input)="rechercher($any($event.target).value)" />
        </div>
        <div class="grille">
          @for (c of cartes(); track c.id) {
            <a [routerLink]="['/carte', c.id]" class="case" [class.manquante]="c.quantite === 0">
              <app-carte [carte]="c" taille="mini" />
              <span class="legende">
                @if (c.epinglee) { <span>Épinglée</span> }
                @if (c.quantite > 1) { <span>×{{ c.quantite }}</span> }
              </span>
            </a>
          } @empty {
            <p class="gris">Aucune carte ici pour l'instant.</p>
          }
        </div>
        @if (cartes().length < total()) {
          <button class="bouton secondaire plus" (click)="pageSuivante()" [disabled]="enCours()">Voir plus</button>
        }
        @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
      </section>
    </div>
  `,
})
export class PageAlbumComposant implements OnInit {
  private api = inject(ApiService);
  protected raretes = RARETES;
  protected types = TYPES;
  protected libRarete = LIBELLES_RARETE;
  protected libType = LIBELLES_TYPE;

  protected filtres = signal<FiltresAlbum>({ raretes: [], types: [], q: '', manquantes: false, page: 1 });
  protected cartes = signal<CarteAlbum[]>([]);
  protected total = signal(0);
  protected possedees = signal(0);
  protected tailleCatalogue = signal(0);
  protected enCours = signal(false);
  protected erreur = signal('');
  private delaiRecherche?: ReturnType<typeof setTimeout>;

  ngOnInit() { this.charger(); }

  private async charger(ajouter = false) {
    this.enCours.set(true);
    this.erreur.set('');
    try {
      const page = await this.api.album(this.filtres());
      this.cartes.update((c) => (ajouter ? [...c, ...page.cartes] : page.cartes));
      this.total.set(page.total);
      this.possedees.set(page.possedees);
      this.tailleCatalogue.set(page.tailleCatalogue);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.enCours.set(false);
    }
  }

  private changer(modif: Partial<FiltresAlbum>) {
    this.filtres.update((f) => ({ ...f, ...modif, page: 1 }));
    this.charger();
  }

  private bascule<T>(liste: T[], v: T): T[] {
    return liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v];
  }

  basculerRarete(r: Rarete) { this.changer({ raretes: this.bascule(this.filtres().raretes, r) }); }
  basculerType(t: TypeCarte) { this.changer({ types: this.bascule(this.filtres().types, t) }); }
  basculerManquantes() { this.changer({ manquantes: !this.filtres().manquantes }); }

  rechercher(q: string) {
    clearTimeout(this.delaiRecherche);
    this.delaiRecherche = setTimeout(() => this.changer({ q }), 300);
  }

  pageSuivante() {
    this.filtres.update((f) => ({ ...f, page: f.page + 1 }));
    this.charger(true);
  }
}
```

`src/app/pages/album/album.css` :

```css
.album { display: flex; gap: 36px; }
.filtres { width: 170px; flex-shrink: 0; display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
.filtres h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--gris); font-weight: 500; margin: 14px 0 4px; }
.filtres h3:first-child { margin-top: 0; }
.filtres label { display: flex; align-items: center; gap: 8px; padding: 3px 0; cursor: pointer; }
.contenu { flex: 1; min-width: 0; }
.tete { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 16px; }
.tete p { margin: 0; }
.recherche { max-width: 240px; }
.grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 14px; }
.case { text-decoration: none; display: flex; flex-direction: column; gap: 4px; }
.case.manquante { opacity: 0.35; filter: grayscale(1); }
.legende { display: flex; justify-content: space-between; font-size: 11px; color: var(--gris); min-height: 14px; }
.plus { margin: 24px auto 0; display: block; }
@media (max-width: 767px) {
  .album { flex-direction: column; gap: 16px; }
  .filtres { width: auto; flex-direction: row; flex-wrap: wrap; gap: 4px 14px; }
  .filtres h3 { width: 100%; margin: 6px 0 0; }
  .tete { flex-direction: column; align-items: stretch; }
  .recherche { max-width: none; }
  .grille { grid-template-columns: repeat(3, 1fr); gap: 8px; }
}
```

Dans `src/app/app.routes.ts` : importer `PageAlbumComposant` depuis `./pages/album/album` et ajouter sous `// PAGES` :

```ts
      { path: 'album', component: PageAlbumComposant },
```

- [ ] **Step 2 : vérifier dans le navigateur**

1. Ouvrir `/album`. Expected : les cartes ouvertes à la tâche 14, la plus rare en premier, avec « ×2 » sur les doublons.
2. Cocher « Commune ». Expected : seules les Communes restent.
3. Taper « napo » dans la recherche. Expected : filtrage après environ 300 ms.
4. Cocher « Cartes manquantes ». Expected : cartes grisées non possédées.
5. Sous 768 px : les filtres passent au-dessus de la grille, qui affiche 3 colonnes.

Run : `npx ng build`
Expected : build réussi.

- [ ] **Step 3 : commit**

```bash
git add src/app
git commit -m "Front : page Album avec filtres et recherche

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16 : Front, Doublons et vente rapide

**Files :**
- Create : `src/app/pages/doublons/selection.ts`, `src/app/pages/doublons/selection.spec.ts`, `src/app/pages/doublons/doublons.ts`, `src/app/pages/doublons/doublons.css`
- Modify : `src/app/app.routes.ts`

**Interfaces :**
- Consumes : `ApiService.doublons/vendre`, `SessionService.majPieces`, `Doublon`, `LIBELLES_RARETE`
- Produces : `Selection = ReadonlyMap<number, number>` ; `totalSelection(doublons, sel) → { cartes, pieces }` ; `toutSelectionner(doublons, rarete: Rarete | null) → Map` ; `basculer(sel, d) → Map` ; `definirQuantite(sel, d, q) → Map` ; page `/doublons`

- [ ] **Step 1 : écrire le test qui échoue**

`src/app/pages/doublons/selection.spec.ts` :

```ts
import { Doublon } from '../../core/modeles';
import { basculer, definirQuantite, totalSelection, toutSelectionner } from './selection';

const d = (carteId: number, rarete: Doublon['rarete'], vendables: number, prixUnitaire: number): Doublon => ({
  carteId, titre: `C${carteId}`, rarete, type: 'culture', imageUrl: null, vendables, prixUnitaire,
});
const LISTE = [d(1, 'commune', 2, 5), d(2, 'commune', 1, 5), d(3, 'rare', 1, 15)];

describe('sélection des doublons', () => {
  it('tout sélectionner prend tous les exemplaires vendables', () => {
    const sel = toutSelectionner(LISTE, null);
    expect([...sel]).toEqual([[1, 2], [2, 1], [3, 1]]);
    expect(totalSelection(LISTE, sel)).toEqual({ cartes: 4, pieces: 30 });
  });

  it('filtre par rareté', () => {
    expect([...toutSelectionner(LISTE, 'rare')]).toEqual([[3, 1]]);
  });

  it('basculer ajoute ou retire une carte', () => {
    const sel = basculer(new Map(), LISTE[0]);
    expect(sel.get(1)).toBe(2);
    expect(basculer(sel, LISTE[0]).has(1)).toBe(false);
  });

  it('définir une quantité la borne entre 0 et vendables', () => {
    expect(definirQuantite(new Map(), LISTE[0], 1).get(1)).toBe(1);
    expect(definirQuantite(new Map(), LISTE[0], 99).get(1)).toBe(2);
    expect(definirQuantite(new Map([[1, 2]]), LISTE[0], 0).has(1)).toBe(false);
  });

  it('le total plafonne une sélection trop grande', () => {
    expect(totalSelection(LISTE, new Map([[1, 50]]))).toEqual({ cartes: 2, pieces: 10 });
  });
});
```

- [ ] **Step 2 : lancer le test et vérifier qu'il échoue**

Run : `npx ng test --watch=false`
Expected : FAIL, `./selection` introuvable.

- [ ] **Step 3 : implémenter**

`src/app/pages/doublons/selection.ts` :

```ts
import { Doublon, Rarete } from '../../core/modeles';

export type Selection = ReadonlyMap<number, number>;

export function totalSelection(doublons: Doublon[], sel: Selection) {
  let cartes = 0;
  let pieces = 0;
  for (const d of doublons) {
    const q = Math.min(sel.get(d.carteId) ?? 0, d.vendables);
    cartes += q;
    pieces += q * d.prixUnitaire;
  }
  return { cartes, pieces };
}

export function toutSelectionner(doublons: Doublon[], rarete: Rarete | null) {
  return new Map(doublons.filter((d) => !rarete || d.rarete === rarete).map((d) => [d.carteId, d.vendables]));
}

export function basculer(sel: Selection, d: Doublon) {
  const res = new Map(sel);
  if (res.has(d.carteId)) res.delete(d.carteId);
  else res.set(d.carteId, d.vendables);
  return res;
}

export function definirQuantite(sel: Selection, d: Doublon, q: number) {
  const res = new Map(sel);
  const borne = Math.max(0, Math.min(d.vendables, Math.floor(q) || 0));
  if (borne === 0) res.delete(d.carteId);
  else res.set(d.carteId, borne);
  return res;
}
```

`src/app/pages/doublons/doublons.ts` :

```ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService, messageErreur } from '../../core/api';
import { SessionService } from '../../core/session';
import { Doublon, Rarete } from '../../core/modeles';
import { LIBELLES_RARETE } from '../../core/libelles';
import { Selection, basculer, definirQuantite, totalSelection, toutSelectionner } from './selection';

@Component({
  selector: 'app-page-doublons',
  styleUrl: './doublons.css',
  template: `
    <h1>Doublons</h1>
    <p class="gris">Tu gardes toujours un exemplaire de chaque carte. Les cartes épinglées ne sont jamais vendues.</p>

    <div class="outils">
      <button class="bouton secondaire" (click)="selection.set(toutSelectionner(doublons(), null))">Tout sélectionner</button>
      <button class="bouton secondaire" (click)="selection.set(toutSelectionner(doublons(), 'commune'))">Toutes les Communes</button>
      <button class="bouton secondaire" (click)="selection.set(toutSelectionner(doublons(), 'rare'))">Toutes les Rares</button>
      <button class="lien" (click)="selection.set(vide)">Vider</button>
    </div>

    <ul class="liste">
      @for (d of doublons(); track d.carteId) {
        <li>
          <input type="checkbox" [checked]="selection().has(d.carteId)" (change)="selection.set(basculer(selection(), d))"
            [attr.aria-label]="'Sélectionner ' + d.titre" />
          <span class="pastille" [class]="d.rarete"></span>
          <span class="nom"><strong>{{ d.titre }}</strong> <span class="gris">{{ libRarete[d.rarete] }} · {{ d.prixUnitaire }} pièces</span></span>
          <input class="champ quantite" type="number" min="0" [max]="d.vendables" [value]="selection().get(d.carteId) ?? 0"
            (change)="selection.set(definirQuantite(selection(), d, +$any($event.target).value))" />
          <span class="gris">/ {{ d.vendables }}</span>
        </li>
      } @empty {
        <li class="gris">Aucun doublon pour l'instant.</li>
      }
    </ul>

    <div class="barre">
      @if (confirmation()) {
        <span>Vendre {{ total().cartes }} cartes pour {{ total().pieces }} pièces ?</span>
        <button class="bouton" (click)="vendre()" [disabled]="enCours()">Confirmer</button>
        <button class="lien" (click)="confirmation.set(false)">Annuler</button>
      } @else {
        <span>{{ total().cartes }} cartes · <strong>+{{ total().pieces }} pièces</strong></span>
        <button class="bouton" (click)="confirmation.set(true)" [disabled]="total().cartes === 0">Vendre la sélection</button>
      }
    </div>
    @if (message()) { <p class="succes">{{ message() }}</p> }
    @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
  `,
})
export class PageDoublons implements OnInit {
  private api = inject(ApiService);
  private session = inject(SessionService);
  protected libRarete = LIBELLES_RARETE;
  protected vide: Selection = new Map();
  protected toutSelectionner = toutSelectionner;
  protected basculer = basculer;
  protected definirQuantite = definirQuantite;

  protected doublons = signal<Doublon[]>([]);
  protected selection = signal<Selection>(new Map());
  protected total = computed(() => totalSelection(this.doublons(), this.selection()));
  protected confirmation = signal(false);
  protected enCours = signal(false);
  protected message = signal('');
  protected erreur = signal('');

  ngOnInit() { this.charger(); }

  private async charger() {
    try {
      this.doublons.set((await this.api.doublons()).doublons);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  async vendre() {
    this.enCours.set(true);
    this.erreur.set('');
    try {
      const ventes = [...this.selection()].map(([carteId, quantite]) => ({ carteId, quantite }));
      const r = await this.api.vendre(ventes);
      this.session.majPieces(r.pieces);
      this.message.set(`${r.cartesVendues} cartes vendues, +${r.piecesGagnees} pièces.`);
      this.selection.set(new Map());
      this.confirmation.set(false);
      await this.charger();
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.enCours.set(false);
    }
  }
}
```

`src/app/pages/doublons/doublons.css` :

```css
h1 { margin-bottom: 6px; }
.outils { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin: 20px 0 12px; }
.liste { list-style: none; padding: 0; margin: 0 0 90px; }
.liste li { display: flex; align-items: center; gap: 12px; padding: 10px 4px; border-bottom: 1px solid var(--bordure); }
.nom { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nom .gris { font-size: 12px; margin-left: 6px; }
.quantite { width: 64px; padding: 5px 8px; }
.barre {
  position: sticky; bottom: 0; display: flex; gap: 16px; align-items: center; justify-content: flex-end;
  padding: 14px 0; background: var(--fond); border-top: 1px solid var(--bordure);
}
@media (max-width: 767px) {
  .barre { bottom: 64px; justify-content: space-between; }
  .nom .gris { display: block; margin: 0; }
}
```

Dans `src/app/app.routes.ts` : importer `PageDoublons` depuis `./pages/doublons/doublons` et ajouter sous `// PAGES` :

```ts
      { path: 'doublons', component: PageDoublons },
```

- [ ] **Step 4 : lancer les tests et vérifier qu'ils passent**

Run : `npx ng test --watch=false`
Expected : PASS (`formatDuree`, `CarteVisuelle`, sélection des doublons)

- [ ] **Step 5 : vérifier dans le navigateur**

1. Ouvrir `/doublons` après plusieurs ouvertures. Expected : la liste des cartes en ×2 et plus.
2. Cliquer « Toutes les Communes ». Expected : le total se met à jour, par exemple « 7 cartes · +35 pièces ».
3. « Vendre la sélection » puis « Confirmer ». Expected : message de succès, pièces mises à jour dans le menu, liste rechargée.
4. Épingler une carte en double depuis sa fiche. Expected : elle disparaît de `/doublons`.

- [ ] **Step 6 : commit**

```bash
git add src/app
git commit -m "Front : page Doublons et vente rapide

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17 : Front, Profil

**Files :**
- Create : `src/app/pages/profil/profil.ts`
- Modify : `src/app/app.routes.ts`

**Interfaces :**
- Consumes : `SessionService`, `ApiService.majMoi/deconnexion/album`, `messageErreur`
- Produces : page `/profil`

- [ ] **Step 1 : implémenter**

`src/app/pages/profil/profil.ts` :

```ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, messageErreur } from '../../core/api';
import { SessionService } from '../../core/session';

@Component({
  selector: 'app-page-profil',
  imports: [FormsModule, DecimalPipe],
  styles: `
    section { max-width: 480px; display: flex; flex-direction: column; gap: 18px; }
    .stats { display: flex; gap: 32px; }
    .stats strong { display: block; font-size: 28px; font-weight: 600; }
    form { display: flex; gap: 10px; }
    label.option { display: flex; gap: 10px; align-items: center; cursor: pointer; }
  `,
  template: `
    @if (session.moi(); as moi) {
      <section>
        <h1>{{ moi.pseudo }}</h1>
        <div class="stats">
          <div><strong>{{ possedees() | number }}</strong><span class="gris">cartes différentes</span></div>
          <div><strong>{{ moi.pieces | number }}</strong><span class="gris">pièces</span></div>
        </div>
        <form (ngSubmit)="changerPseudo()">
          <input class="champ" name="pseudo" [(ngModel)]="pseudo" minlength="3" maxlength="20" />
          <button class="bouton secondaire" type="submit">Renommer</button>
        </form>
        <label class="option">
          <input type="checkbox" [checked]="moi.venteAutoCommunes" (change)="basculerVenteAuto(!moi.venteAutoCommunes)" />
          Revendre automatiquement les Communes en double à l'ouverture
        </label>
        @if (message()) { <p class="succes">{{ message() }}</p> }
        @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
        <button class="lien" (click)="deconnecter()">Se déconnecter</button>
      </section>
    }
  `,
})
export class PageProfil implements OnInit {
  protected session = inject(SessionService);
  private api = inject(ApiService);
  private router = inject(Router);
  protected pseudo = this.session.moi()?.pseudo ?? '';
  protected possedees = signal(0);
  protected message = signal('');
  protected erreur = signal('');

  async ngOnInit() {
    try {
      const page = await this.api.album({ raretes: [], types: [], q: '', manquantes: false, page: 1 });
      this.possedees.set(page.possedees);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  private async maj(changements: { pseudo?: string; venteAutoCommunes?: boolean }, succes: string) {
    this.message.set('');
    this.erreur.set('');
    try {
      this.session.definir(await this.api.majMoi(changements));
      this.message.set(succes);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  changerPseudo() { return this.maj({ pseudo: this.pseudo }, 'Pseudo mis à jour.'); }
  basculerVenteAuto(actif: boolean) {
    return this.maj({ venteAutoCommunes: actif }, actif ? 'Vente automatique activée.' : 'Vente automatique désactivée.');
  }

  async deconnecter() {
    await this.api.deconnexion();
    this.session.vider();
    await this.router.navigateByUrl('/connexion');
  }
}
```

Dans `src/app/app.routes.ts` : importer `PageProfil` depuis `./pages/profil/profil` et ajouter sous `// PAGES` :

```ts
      { path: 'profil', component: PageProfil },
```

- [ ] **Step 2 : vérifier dans le navigateur**

1. Ouvrir `/profil`. Expected : pseudo, nombre de cartes et pièces.
2. Renommer avec « x ». Expected : message d'erreur sur le format du pseudo. Avec un pseudo valide, le menu se met à jour.
3. Cocher la vente automatique, puis ouvrir un paquet. Expected : la ligne « Communes en double revendues » apparaît si des Communes en double sont tirées.
4. Se déconnecter. Expected : retour à `/connexion`, et `/album` redirige vers `/connexion`.

Run : `npx ng build`
Expected : build réussi.

- [ ] **Step 3 : commit**

```bash
git add src/app
git commit -m "Front : page Profil (pseudo, vente auto, déconnexion)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18 : Vérification de bout en bout

**Files :** aucun nouveau. Corriger dans la tâche concernée ce qui ne passe pas.

- [ ] **Step 1 : toutes les suites de tests**

Run : `cd backend && npm test`
Expected : PASS (toutes les suites)

Run : `npx ng test --watch=false`
Expected : PASS

Run : `npx ng build`
Expected : build réussi, sans dépasser les budgets (500 kB d'avertissement initial, 8 kB par style de composant).

- [ ] **Step 2 : parcours complet, sur ordinateur puis sur mobile (DevTools, 390 px)**

Prérequis : catalogue « top » d'au moins 300 cartes, `npm run dev` (backend) et `npx ng serve`.

| # | Action | Attendu |
|---|---|---|
| 1 | Inscription | 10 / 10 paquets, 0 pièce |
| 2 | Ouvrir 3 paquets | 7 / 10 ; compte à rebours d'environ 60 min ; animation et retournement OK |
| 3 | Double-cliquer très vite sur « Ouvrir » | un seul paquet débité |
| 4 | Album : filtres, recherche, manquantes | résultats cohérents |
| 5 | Fiche carte : épingler, lien Wikipédia | épinglage visible dans l'album ; l'article s'ouvre |
| 6 | Doublons : tout vendre | pièces créditées, 1 exemplaire gardé par carte |
| 7 | Acheter un paquet (avec ≥ 100 pièces) | pièces −100, stock inchangé |
| 8 | Arrêter le backend puis ouvrir un paquet | « Connexion perdue, réessaie. » |
| 9 | Déconnexion puis `/album` | redirection vers `/connexion` |
| 10 | 6 mauvais mots de passe | « Trop de tentatives… » |

- [ ] **Step 3 : commit final si des corrections ont été faites**

```bash
git add -A backend src
git commit -m "Bloc 1 : corrections de la vérification de bout en bout

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
