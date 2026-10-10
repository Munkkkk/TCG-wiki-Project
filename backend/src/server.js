import { creerPool } from './database.js';
import { creerApp } from './app.js';

const PORT = Number(process.env.PORT || 3000);
creerApp(creerPool(process.env.DB_NAME)).listen(PORT, () => {
  console.log(`API WikiCards sur http://localhost:${PORT}`);
});
