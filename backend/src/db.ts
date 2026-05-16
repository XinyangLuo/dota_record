import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../database.sqlite');

let db: InstanceType<Awaited<ReturnType<typeof initSqlJs>>['Database']>;

export async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_no INTEGER NOT NULL DEFAULT 0,
      winner TEXT NOT NULL CHECK (winner IN ('天辉', '夜魇')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS match_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id),
      hero_name TEXT NOT NULL,
      team TEXT NOT NULL CHECK (team IN ('天辉', '夜魇')),
      UNIQUE(match_id, player_id)
    );

    CREATE INDEX IF NOT EXISTS idx_mp_player ON match_players(player_id);
    CREATE INDEX IF NOT EXISTS idx_mp_hero ON match_players(hero_name);
    CREATE INDEX IF NOT EXISTS idx_mp_match ON match_players(match_id);
  `);

  // 迁移：为已存在的 matches 表添加 match_no 列
  try {
    db.exec(`ALTER TABLE matches ADD COLUMN match_no INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // 列已存在，忽略
  }

  saveDb();
}

export function saveDb() {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

export function getDb() {
  return db;
}

export function queryOne(sql: string, params?: (string | number | null)[]) {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return result;
}

export function queryAll(sql: string, params?: (string | number | null)[]) {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const results: Record<string, unknown>[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function run(sql: string, params?: (string | number | null)[]) {
  db.run(sql, params);
  saveDb();
}

export function insert(sql: string, params?: (string | number | null)[]) {
  run(sql, params);
  const result = queryOne('SELECT last_insert_rowid() as id');
  return result?.id as number;
}
