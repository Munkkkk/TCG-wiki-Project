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
