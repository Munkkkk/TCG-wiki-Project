import mysql from 'mysql2/promise';
import { creerPool } from '../../src/database.js';
import { migrer } from '../../src/db/migrer.js';

export const NOM_BASE_TEST = process.env.DB_NAME_TEST || 'wikimasters_test';

const TABLES = ['ouvertures', 'epingles', 'cartes_joueur', 'catalogue', 'joueurs', 'vues_mensuelles'];

export async function preparerBaseTest() {
  if (NOM_BASE_TEST === process.env.DB_NAME) {
    throw new Error(`NOM_BASE_TEST (${NOM_BASE_TEST}) est la base de développement : refus de la vider.`);
  }
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
