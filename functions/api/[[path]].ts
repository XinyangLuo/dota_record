// Cloudflare Pages Functions 入口：处理所有 /api/* 请求。
// 通过 wrangler 的 D1 binding `DB` 访问数据库（在 wrangler.toml 或 Pages 控制台配置）。

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import heroes from '../heroes.json';

type Bindings = {
  DB: D1Database;
};

type MatchPlayerInput = {
  player_id: number;
  hero_name: string;
  team: '天辉' | '夜魇';
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

app.use('*', cors());

// 健康检查
app.get('/health', c => c.json({ status: 'ok' }));

// ---------- heroes ----------
app.get('/heroes', c => c.json(heroes));

// ---------- players ----------
app.get('/players', async c => {
  const { results } = await c.env.DB
    .prepare('SELECT * FROM players ORDER BY created_at DESC')
    .all();
  return c.json(results);
});

app.post('/players', async c => {
  const body = await c.req.json<{ name?: string }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: '选手名称不能为空' }, 400);

  try {
    await c.env.DB.prepare('INSERT INTO players (name) VALUES (?)').bind(name).run();
    const player = await c.env.DB
      .prepare('SELECT * FROM players WHERE name = ?').bind(name).first();
    return c.json(player, 201);
  } catch (err) {
    if ((err as Error).message.includes('UNIQUE')) {
      return c.json({ error: '选手名称已存在' }, 409);
    }
    throw err;
  }
});

app.put('/players/:id', async c => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{ name?: string }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: '选手名称不能为空' }, 400);

  try {
    await c.env.DB.prepare('UPDATE players SET name = ? WHERE id = ?').bind(name, id).run();
    const player = await c.env.DB
      .prepare('SELECT * FROM players WHERE id = ?').bind(id).first();
    return c.json(player);
  } catch (err) {
    if ((err as Error).message.includes('UNIQUE')) {
      return c.json({ error: '选手名称已存在' }, 409);
    }
    throw err;
  }
});

app.delete('/players/:id', async c => {
  const id = parseInt(c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM players WHERE id = ?').bind(id).run();
  return c.body(null, 204);
});

// ---------- matches ----------
async function validateConsistency(db: D1Database) {
  const matchCountRow = await db
    .prepare('SELECT COUNT(*) AS c FROM matches').first<{ c: number }>();
  const matchCount = matchCountRow?.c ?? 0;
  const expected = matchCount * 5;

  const statsRow = await db
    .prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN mp.team = m.winner THEN 1 ELSE 0 END), 0) AS wins,
        COUNT(*) AS total
      FROM match_players mp
      JOIN matches m ON mp.match_id = m.id
    `).first<{ wins: number; total: number }>();

  const totalWins = statsRow?.wins ?? 0;
  const totalMatches = statsRow?.total ?? 0;
  const totalLosses = totalMatches - totalWins;

  return {
    ok: totalWins === totalLosses && totalWins === expected,
    totalWins,
    totalLosses,
    expected,
    matchCount,
  };
}

function validateMatchInput(winner: unknown, players: unknown): string | null {
  if (typeof winner !== 'string' || !['天辉', '夜魇'].includes(winner)) {
    return '胜方必须是天辉或夜魇';
  }
  if (!Array.isArray(players) || players.length !== 10) {
    return '必须选择10名选手';
  }
  const ps = players as MatchPlayerInput[];
  const radiant = ps.filter(p => p.team === '天辉');
  const dire = ps.filter(p => p.team === '夜魇');
  if (radiant.length !== 5 || dire.length !== 5) {
    return '天辉和夜魇各需要5名选手';
  }
  const ids = ps.map(p => p.player_id);
  if (new Set(ids).size !== 10) {
    return '选手不能重复';
  }
  return null;
}

async function loadMatchWithPlayers(db: D1Database, matchId: number) {
  const match = await db
    .prepare('SELECT * FROM matches WHERE id = ?').bind(matchId).first();
  const { results: players } = await db
    .prepare(`
      SELECT mp.*, p.name AS player_name
      FROM match_players mp
      JOIN players p ON mp.player_id = p.id
      WHERE mp.match_id = ?
    `).bind(matchId).all();
  return { ...match, players };
}

app.get('/matches', async c => {
  const [{ results: matches }, { results: allPlayers }] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM matches ORDER BY created_at DESC').all(),
    c.env.DB.prepare(`
      SELECT mp.*, p.name AS player_name, p.id AS player_id
      FROM match_players mp
      JOIN players p ON mp.player_id = p.id
    `).all(),
  ]);

  const playersByMatch = new Map<number, Record<string, unknown>[]>();
  for (const p of allPlayers) {
    const mid = (p as { match_id: number }).match_id;
    if (!playersByMatch.has(mid)) playersByMatch.set(mid, []);
    playersByMatch.get(mid)!.push(p);
  }

  const out = matches.map(m => ({
    ...m,
    players: playersByMatch.get((m as { id: number }).id) || [],
  }));
  return c.json(out);
});

app.post('/matches', async c => {
  const body = await c.req.json<{ winner: '天辉' | '夜魇'; players: MatchPlayerInput[] }>();
  const err = validateMatchInput(body.winner, body.players);
  if (err) return c.json({ error: err }, 400);

  const insertMatch = await c.env.DB
    .prepare('INSERT INTO matches (winner) VALUES (?) RETURNING id')
    .bind(body.winner).first<{ id: number }>();
  const matchId = insertMatch?.id;
  if (!matchId) return c.json({ error: '插入比赛失败' }, 500);

  const stmts = body.players.map(p =>
    c.env.DB
      .prepare('INSERT INTO match_players (match_id, player_id, hero_name, team) VALUES (?, ?, ?, ?)')
      .bind(matchId, p.player_id, p.hero_name, p.team)
  );
  await c.env.DB.batch(stmts);

  const check = await validateConsistency(c.env.DB);
  if (!check.ok) {
    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM match_players WHERE match_id = ?').bind(matchId),
      c.env.DB.prepare('DELETE FROM matches WHERE id = ?').bind(matchId),
    ]);
    return c.json({
      error: `数据一致性校验失败：总胜场(${check.totalWins}) ≠ 总败场(${check.totalLosses})，期望值为 ${check.expected}（${check.matchCount} 局 × 5）`,
    }, 500);
  }

  const data = await loadMatchWithPlayers(c.env.DB, matchId);
  return c.json(data, 201);
});

app.put('/matches/:id', async c => {
  const matchId = parseInt(c.req.param('id'));
  const body = await c.req.json<{ winner: '天辉' | '夜魇'; players: MatchPlayerInput[] }>();
  const err = validateMatchInput(body.winner, body.players);
  if (err) return c.json({ error: err }, 400);

  const stmts = [
    c.env.DB.prepare('UPDATE matches SET winner = ? WHERE id = ?').bind(body.winner, matchId),
    c.env.DB.prepare('DELETE FROM match_players WHERE match_id = ?').bind(matchId),
    ...body.players.map(p =>
      c.env.DB
        .prepare('INSERT INTO match_players (match_id, player_id, hero_name, team) VALUES (?, ?, ?, ?)')
        .bind(matchId, p.player_id, p.hero_name, p.team)
    ),
  ];
  await c.env.DB.batch(stmts);

  const check = await validateConsistency(c.env.DB);
  if (!check.ok) {
    return c.json({
      error: `数据一致性校验失败：总胜场(${check.totalWins}) ≠ 总败场(${check.totalLosses})，期望值为 ${check.expected}（${check.matchCount} 局 × 5）`,
    }, 500);
  }

  const data = await loadMatchWithPlayers(c.env.DB, matchId);
  return c.json(data);
});

app.delete('/matches/:id', async c => {
  const matchId = parseInt(c.req.param('id'));
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM match_players WHERE match_id = ?').bind(matchId),
    c.env.DB.prepare('DELETE FROM matches WHERE id = ?').bind(matchId),
  ]);

  const check = await validateConsistency(c.env.DB);
  if (!check.ok) {
    return c.json({
      error: `数据一致性校验失败：总胜场(${check.totalWins}) ≠ 总败场(${check.totalLosses})，期望值为 ${check.expected}（${check.matchCount} 局 × 5）`,
    }, 500);
  }

  return c.body(null, 204);
});

// ---------- stats ----------
function wilsonInterval(wins: number, total: number, z = 1.96) {
  if (total === 0) return { rate: 0, lower: 0, upper: 0 };
  const p = wins / total;
  const denom = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total)) / denom;
  return {
    rate: p,
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
  };
}

app.get('/stats/players', async c => {
  const { results } = await c.env.DB
    .prepare(`
      SELECT
        p.id,
        p.name,
        COUNT(DISTINCT m.id) AS total_matches,
        SUM(CASE WHEN mp.team = m.winner THEN 1 ELSE 0 END) AS wins
      FROM players p
      JOIN match_players mp ON p.id = mp.player_id
      JOIN matches m ON mp.match_id = m.id
      GROUP BY p.id, p.name
    `).all<{ id: number; name: string; total_matches: number; wins: number }>();

  const data = results.map(r => {
    const ci = wilsonInterval(r.wins ?? 0, r.total_matches ?? 0);
    return {
      id: r.id,
      name: r.name,
      total_matches: r.total_matches ?? 0,
      wins: r.wins ?? 0,
      win_rate: ci.rate,
      confidence_lower: ci.lower,
      confidence_upper: ci.upper,
    };
  });
  data.sort((a, b) => b.confidence_lower - a.confidence_lower);
  return c.json(data);
});

const heroMap = new Map(heroes.map(h => [h.name, h]));

app.get('/stats/heroes', async c => {
  const { results } = await c.env.DB
    .prepare(`
      SELECT
        mp.hero_name,
        COUNT(DISTINCT m.id) AS total_matches,
        SUM(CASE WHEN mp.team = m.winner THEN 1 ELSE 0 END) AS wins
      FROM match_players mp
      JOIN matches m ON mp.match_id = m.id
      GROUP BY mp.hero_name
    `).all<{ hero_name: string; total_matches: number; wins: number }>();

  const data = results.map(r => {
    const hero = heroMap.get(r.hero_name);
    const total = r.total_matches ?? 0;
    const wins = r.wins ?? 0;
    return {
      hero_name: r.hero_name,
      hero_name_cn: hero?.name_cn ?? r.hero_name,
      icon_url: hero?.icon_url ?? '',
      total_matches: total,
      wins,
      win_rate: total > 0 ? wins / total : 0,
    };
  });
  data.sort((a, b) => b.win_rate - a.win_rate || b.total_matches - a.total_matches);
  return c.json(data);
});

app.get('/stats/player/:id/heroes', async c => {
  const playerId = parseInt(c.req.param('id'));
  const { results } = await c.env.DB
    .prepare(`
      SELECT
        mp.hero_name,
        COUNT(DISTINCT m.id) AS total_matches,
        SUM(CASE WHEN mp.team = m.winner THEN 1 ELSE 0 END) AS wins
      FROM match_players mp
      JOIN matches m ON mp.match_id = m.id
      WHERE mp.player_id = ?
      GROUP BY mp.hero_name
    `).bind(playerId).all<{ hero_name: string; total_matches: number; wins: number }>();

  const data = results.map(r => {
    const hero = heroMap.get(r.hero_name);
    const total = r.total_matches ?? 0;
    const wins = r.wins ?? 0;
    return {
      hero_name: r.hero_name,
      hero_name_cn: hero?.name_cn ?? r.hero_name,
      icon_url: hero?.icon_url ?? '',
      total_matches: total,
      wins,
      win_rate: total > 0 ? wins / total : 0,
    };
  });
  data.sort((a, b) => b.win_rate - a.win_rate || b.total_matches - a.total_matches);
  return c.json(data);
});

app.get('/stats/teams', async c => {
  const { results } = await c.env.DB
    .prepare('SELECT winner, COUNT(*) AS count FROM matches GROUP BY winner')
    .all<{ winner: string; count: number }>();

  const totalRow = await c.env.DB
    .prepare('SELECT COUNT(*) AS c FROM matches').first<{ c: number }>();
  const totalMatches = totalRow?.c ?? 0;

  const radiantWins = results.find(r => r.winner === '天辉')?.count ?? 0;
  const direWins = results.find(r => r.winner === '夜魇')?.count ?? 0;

  return c.json({
    total_matches: totalMatches,
    radiant: {
      wins: radiantWins,
      losses: totalMatches - radiantWins,
      win_rate: totalMatches > 0 ? radiantWins / totalMatches : 0,
    },
    dire: {
      wins: direWins,
      losses: totalMatches - direWins,
      win_rate: totalMatches > 0 ? direWins / totalMatches : 0,
    },
  });
});

export const onRequest: PagesFunction<Bindings> = ctx =>
  app.fetch(ctx.request, ctx.env, ctx as unknown as ExecutionContext);
