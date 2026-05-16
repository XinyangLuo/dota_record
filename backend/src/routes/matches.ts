import { Router } from 'express';
import { queryAll, queryOne, run, getDb } from '../db.js';

const router = Router();

interface MatchPlayerInput {
  player_id: number;
  hero_name: string;
  team: '天辉' | '夜魇';
}

function validateConsistency(): { ok: boolean; totalWins: number; totalLosses: number; expected: number; matchCount: number } {
  const matchCount = queryAll('SELECT COUNT(*) as c FROM matches')[0]?.c as number || 0;
  const expected = matchCount * 5;

  const playerStats = queryAll(`
    SELECT
      SUM(CASE WHEN mp.team = m.winner THEN 1 ELSE 0 END) as wins,
      COUNT(*) as total
    FROM match_players mp
    JOIN matches m ON mp.match_id = m.id
  `);

  const totalWins = (playerStats[0]?.wins as number) || 0;
  const totalMatches = (playerStats[0]?.total as number) || 0;
  const totalLosses = totalMatches - totalWins;

  return {
    ok: totalWins === totalLosses && totalWins === expected,
    totalWins,
    totalLosses,
    expected,
    matchCount,
  };
}

router.get('/', (_req, res) => {
  const matches = queryAll('SELECT * FROM matches ORDER BY created_at DESC');
  const result = matches.map(m => {
    const players = queryAll(
      `SELECT mp.*, p.name as player_name, p.id as player_id
       FROM match_players mp
       JOIN players p ON mp.player_id = p.id
       WHERE mp.match_id = ?`,
      [m.id as number]
    );
    return { ...m, players };
  });
  res.json(result);
});

router.post('/', (req, res) => {
  const { winner, players }: { winner: '天辉' | '夜魇'; players: MatchPlayerInput[] } = req.body;

  if (!winner || !['天辉', '夜魇'].includes(winner)) {
    res.status(400).json({ error: '胜方必须是天辉或夜魇' });
    return;
  }
  if (!Array.isArray(players) || players.length !== 10) {
    res.status(400).json({ error: '必须选择10名选手' });
    return;
  }

  const radiant = players.filter(p => p.team === '天辉');
  const dire = players.filter(p => p.team === '夜魇');
  if (radiant.length !== 5 || dire.length !== 5) {
    res.status(400).json({ error: '天辉和夜魇各需要5名选手' });
    return;
  }

  const playerIds = players.map(p => p.player_id);
  if (new Set(playerIds).size !== 10) {
    res.status(400).json({ error: '选手不能重复' });
    return;
  }

  const db = getDb();
  let matchId: number;
  try {
    db.run('BEGIN TRANSACTION');

    db.run('INSERT INTO matches (winner) VALUES (?)', [winner]);
    const matchResult = db.exec('SELECT last_insert_rowid() as id');
    matchId = matchResult[0].values[0][0] as number;

    for (const p of players) {
      db.run(
        'INSERT INTO match_players (match_id, player_id, hero_name, team) VALUES (?, ?, ?, ?)',
        [matchId, p.player_id, p.hero_name, p.team]
      );
    }

    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }

  const check = validateConsistency();
  if (!check.ok) {
    try {
      db.run('BEGIN TRANSACTION');
      db.run('DELETE FROM match_players WHERE match_id = ?', [matchId]);
      db.run('DELETE FROM matches WHERE id = ?', [matchId]);
      db.run('COMMIT');
    } catch {
      db.run('ROLLBACK');
    }
    res.status(500).json({
      error: `数据一致性校验失败：总胜场(${check.totalWins}) ≠ 总败场(${check.totalLosses})，期望值为 ${check.expected}（${check.matchCount} 局 × 5）`,
    });
    return;
  }

  const match = queryOne('SELECT * FROM matches WHERE id = ?', [matchId]);
  const matchPlayers = queryAll(
    `SELECT mp.*, p.name as player_name
     FROM match_players mp
     JOIN players p ON mp.player_id = p.id
     WHERE mp.match_id = ?`,
    [matchId]
  );
  res.status(201).json({ ...match, players: matchPlayers });
});

router.put('/:id', (req, res) => {
  const matchId = parseInt(req.params.id);
  const { winner, players }: { winner: '天辉' | '夜魇'; players: MatchPlayerInput[] } = req.body;

  if (!winner || !['天辉', '夜魇'].includes(winner)) {
    res.status(400).json({ error: '胜方必须是天辉或夜魇' });
    return;
  }
  if (!Array.isArray(players) || players.length !== 10) {
    res.status(400).json({ error: '必须选择10名选手' });
    return;
  }

  const radiant = players.filter(p => p.team === '天辉');
  const dire = players.filter(p => p.team === '夜魇');
  if (radiant.length !== 5 || dire.length !== 5) {
    res.status(400).json({ error: '天辉和夜魇各需要5名选手' });
    return;
  }

  const playerIds = players.map(p => p.player_id);
  if (new Set(playerIds).size !== 10) {
    res.status(400).json({ error: '选手不能重复' });
    return;
  }

  const db = getDb();
  try {
    db.run('BEGIN TRANSACTION');

    db.run('UPDATE matches SET winner = ? WHERE id = ?', [winner, matchId]);
    db.run('DELETE FROM match_players WHERE match_id = ?', [matchId]);

    for (const p of players) {
      db.run(
        'INSERT INTO match_players (match_id, player_id, hero_name, team) VALUES (?, ?, ?, ?)',
        [matchId, p.player_id, p.hero_name, p.team]
      );
    }

    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }

  const check = validateConsistency();
  if (!check.ok) {
    res.status(500).json({
      error: `数据一致性校验失败：总胜场(${check.totalWins}) ≠ 总败场(${check.totalLosses})，期望值为 ${check.expected}（${check.matchCount} 局 × 5）`,
    });
    return;
  }

  const match = queryOne('SELECT * FROM matches WHERE id = ?', [matchId]);
  const matchPlayers = queryAll(
    `SELECT mp.*, p.name as player_name
     FROM match_players mp
     JOIN players p ON mp.player_id = p.id
     WHERE mp.match_id = ?`,
    [matchId]
  );
  res.json({ ...match, players: matchPlayers });
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);

  const db = getDb();
  try {
    db.run('BEGIN TRANSACTION');
    db.run('DELETE FROM match_players WHERE match_id = ?', [id]);
    db.run('DELETE FROM matches WHERE id = ?', [id]);
    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }

  const check = validateConsistency();
  if (!check.ok) {
    res.status(500).json({
      error: `数据一致性校验失败：总胜场(${check.totalWins}) ≠ 总败场(${check.totalLosses})，期望值为 ${check.expected}（${check.matchCount} 局 × 5）`,
    });
    return;
  }

  res.status(204).send();
});

export default router;
