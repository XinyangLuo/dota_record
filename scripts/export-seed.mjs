// 把 backend/database.sqlite 中的数据导出为 seed.sql，用于导入 Cloudflare D1。
// 用法：node scripts/export-seed.mjs
// 输出：seed.sql（包含 INSERT 语句，不含 CREATE TABLE）。

import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../backend/database.sqlite');
const outPath = path.resolve(__dirname, '../seed.sql');

if (!fs.existsSync(dbPath)) {
  console.error(`找不到数据库文件：${dbPath}`);
  process.exit(1);
}

const SQL = await initSqlJs();
const db = new SQL.Database(fs.readFileSync(dbPath));

function quote(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

function dump(table, columns) {
  const stmt = db.prepare(`SELECT ${columns.join(', ')} FROM ${table}`);
  const lines = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    const values = columns.map(c => quote(row[c])).join(', ');
    lines.push(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values});`);
  }
  stmt.free();
  return lines;
}

const out = [
  '-- seed.sql：由 scripts/export-seed.mjs 自动生成',
  '-- 导入到 Cloudflare D1 之前请先确保已执行 schema.sql 建表',
  '',
  '-- players',
  ...dump('players', ['id', 'name', 'created_at']),
  '',
  '-- matches',
  ...dump('matches', ['id', 'match_no', 'winner', 'created_at']),
  '',
  '-- match_players',
  ...dump('match_players', ['id', 'match_id', 'player_id', 'hero_name', 'team']),
  '',
];

fs.writeFileSync(outPath, out.join('\n'));
console.log(`已生成 ${outPath}`);
console.log(`players: ${out.filter(l => l.startsWith('INSERT INTO players')).length}`);
console.log(`matches: ${out.filter(l => l.startsWith('INSERT INTO matches')).length}`);
console.log(`match_players: ${out.filter(l => l.startsWith('INSERT INTO match_players')).length}`);
