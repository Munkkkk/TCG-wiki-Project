import { creerPool } from '../database.js';
import { migrer } from './migrer.js';

const db = creerPool(process.env.DB_NAME);
await migrer(db);
await db.end();
console.log('Migration terminée.');
