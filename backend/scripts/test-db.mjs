import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../database.sqlite');

const filebuffer = fs.readFileSync(dbPath);
const SQL = await initSqlJs();
const db = new SQL.Database(filebuffer);

console.log('=== Matches ===');
try {
  const matches = db.exec('SELECT * FROM matches');
  console.log(JSON.stringify(matches, null, 2));
} catch (e) {
  console.log('Error:', e.message);
}

console.log('\n=== Match Players ===');
try {
  const mps = db.exec('SELECT * FROM match_players');
  console.log(JSON.stringify(mps, null, 2));
} catch (e) {
  console.log('Error:', e.message);
}

console.log('\n=== Players ===');
try {
  const players = db.exec('SELECT * FROM players');
  console.log(JSON.stringify(players, null, 2));
} catch (e) {
  console.log('Error:', e.message);
}
