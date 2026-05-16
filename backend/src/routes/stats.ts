import { Router } from 'express';
import { queryAll } from '../db.js';
import heroes from '../data/heroes.json' with { type: 'json' };

const router = Router();

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

router.get('/players', (_req, res) => {
  const rows = queryAll(`
    SELECT
      p.id,
      p.name,
      COUNT(DISTINCT m.id) as total_matches,
      SUM(CASE WHEN mp.team = m.winner THEN 1 ELSE 0 END) as wins
    FROM players p
    JOIN match_players mp ON p.id = mp.player_id
    JOIN matches m ON mp.match_id = m.id
    GROUP BY p.id, p.name
    ORDER BY wins DESC
  `);

  const result = rows.map(r => {
    const total = (r.total_matches as number) || 0;
    const wins = (r.wins as number) || 0;
    const ci = wilsonInterval(wins, total);
    return {
      id: r.id,
      name: r.name,
      total_matches: total,
      wins,
      win_rate: ci.rate,
      confidence_lower: ci.lower,
      confidence_upper: ci.upper,
    };
  });

  res.json(result);
});

router.get('/heroes', (_req, res) => {
  const rows = queryAll(`
    SELECT
      mp.hero_name,
      COUNT(DISTINCT m.id) as total_matches,
      SUM(CASE WHEN mp.team = m.winner THEN 1 ELSE 0 END) as wins
    FROM match_players mp
    JOIN matches m ON mp.match_id = m.id
    GROUP BY mp.hero_name
    ORDER BY wins DESC
  `);

  const heroMap = new Map(heroes.map(h => [h.name, h]));

  const result = rows.map(r => {
    const total = (r.total_matches as number) || 0;
    const wins = (r.wins as number) || 0;
    const hero = heroMap.get(r.hero_name as string);
    return {
      hero_name: r.hero_name,
      hero_name_cn: hero?.name_cn || r.hero_name,
      icon_url: hero?.icon_url || '',
      total_matches: total,
      wins,
      win_rate: total > 0 ? wins / total : 0,
    };
  });

  res.json(result);
});

router.get('/player/:id/heroes', (req, res) => {
  const playerId = parseInt(req.params.id);

  const rows = queryAll(`
    SELECT
      mp.hero_name,
      COUNT(DISTINCT m.id) as total_matches,
      SUM(CASE WHEN mp.team = m.winner THEN 1 ELSE 0 END) as wins
    FROM match_players mp
    JOIN matches m ON mp.match_id = m.id
    WHERE mp.player_id = ?
    GROUP BY mp.hero_name
    ORDER BY total_matches DESC
  `, [playerId]);

  const heroMap = new Map(heroes.map(h => [h.name, h]));

  const result = rows.map(r => {
    const total = (r.total_matches as number) || 0;
    const wins = (r.wins as number) || 0;
    const hero = heroMap.get(r.hero_name as string);
    return {
      hero_name: r.hero_name,
      hero_name_cn: hero?.name_cn || r.hero_name,
      icon_url: hero?.icon_url || '',
      total_matches: total,
      wins,
      win_rate: total > 0 ? wins / total : 0,
    };
  });

  res.json(result);
});

router.get('/teams', (_req, res) => {
  const rows = queryAll(`
    SELECT
      winner,
      COUNT(*) as count
    FROM matches
    GROUP BY winner
  `);

  const totalMatches = queryAll('SELECT COUNT(*) as c FROM matches')[0]?.c as number || 0;

  const radiantRow = rows.find(r => r.winner === '天辉');
  const direRow = rows.find(r => r.winner === '夜魇');

  const radiantWins = (radiantRow?.count as number) || 0;
  const direWins = (direRow?.count as number) || 0;

  const result = {
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
  };

  res.json(result);
});

export default router;
