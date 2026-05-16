// 一键备份云端 D1 到本地 backups/ 目录，并打印当前数据统计。
// 用法：npm run backup
//
// 实现细节：不依赖 `wrangler d1 export`（在大表 / 某些 wrangler 版本下会截断），
// 而是用 `wrangler d1 execute --json` 跑 SELECT * 逐表拉取，自己组装 INSERT 语句。

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 本机有 HTTPS 抓包代理时 wrangler 会报 UNABLE_TO_GET_ISSUER_CERT_LOCALLY。
// 跳过 TLS 校验，仅作用于本脚本启动的子进程。
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backupsDir = path.resolve(__dirname, '../backups');
const schemaPath = path.resolve(__dirname, '../schema.sql');
fs.mkdirSync(backupsDir, { recursive: true });

const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const outPath = path.join(backupsDir, `dota-record-${ts}.sql`);

const WRANGLER = 'npx --yes wrangler@4';

function query(sql) {
  const raw = execSync(
    `${WRANGLER} d1 execute dota-record --remote --json --command=${JSON.stringify(sql)}`,
    { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024, stdio: ['pipe', 'pipe', 'inherit'] }
  );
  const m = raw.match(/\[\s*\{[\s\S]*\}\s*\]\s*$/);
  if (!m) throw new Error(`无法解析 wrangler 输出：\n${raw}`);
  return JSON.parse(m[0])[0].results;
}

function quote(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

function dump(table, columns) {
  const rows = query(`SELECT ${columns.join(', ')} FROM ${table}`);
  return {
    rows,
    sql: rows.map(r =>
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(c => quote(r[c])).join(', ')});`
    ),
  };
}

console.log('==> 备份云端 D1 到本地...\n');

console.log('  • 读取 schema');
const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

console.log('  • 拉取 players');
const players = dump('players', ['id', 'name', 'created_at']);
console.log(`    ${players.rows.length} 行`);

console.log('  • 拉取 matches');
const matches = dump('matches', ['id', 'match_no', 'winner', 'created_at']);
console.log(`    ${matches.rows.length} 行`);

console.log('  • 拉取 match_players');
const mp = dump('match_players', ['id', 'match_id', 'player_id', 'hero_name', 'team']);
console.log(`    ${mp.rows.length} 行`);

const out = [
  `-- 备份于 ${new Date().toISOString()}`,
  '-- 恢复方法：',
  '--   npx wrangler@4 d1 execute dota-record --remote --command="DELETE FROM match_players; DELETE FROM matches; DELETE FROM players; DELETE FROM sqlite_sequence;"',
  '--   npx wrangler@4 d1 execute dota-record --remote --file=<此文件>',
  '',
  '-- ===== schema =====',
  schemaSql,
  '',
  '-- ===== data =====',
  '',
  '-- players',
  ...players.sql,
  '',
  '-- matches',
  ...matches.sql,
  '',
  '-- match_players',
  ...mp.sql,
  '',
];
fs.writeFileSync(outPath, out.join('\n'));

const fileSize = fs.statSync(outPath).size;
const expectedMP = matches.rows.length * 10;
const mpOK = mp.rows.length === expectedMP;

console.log('\n========== 备份完成 ==========');
console.log(`文件: ${path.relative(process.cwd(), outPath)}`);
console.log(`大小: ${(fileSize / 1024).toFixed(2)} KB`);
console.log('---');
console.log(`选手数:       ${players.rows.length}`);
console.log(`对战局数:     ${matches.rows.length}`);
console.log(`场内选手记录: ${mp.rows.length}（预期 ${expectedMP} = ${matches.rows.length} 局 × 10）${mpOK ? '' : '  ⚠️ 数量异常'}`);
console.log('==============================\n');
