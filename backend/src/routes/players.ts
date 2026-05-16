import { Router } from 'express';
import { queryAll, queryOne, run } from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const players = queryAll('SELECT * FROM players ORDER BY created_at DESC');
  res.json(players);
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: '选手名称不能为空' });
    return;
  }
  try {
    run('INSERT INTO players (name) VALUES (?)', [name.trim()]);
    const player = queryOne('SELECT * FROM players WHERE name = ?', [name.trim()]);
    res.status(201).json(player);
  } catch (err) {
    if ((err as Error).message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: '选手名称已存在' });
      return;
    }
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: '选手名称不能为空' });
    return;
  }
  try {
    run('UPDATE players SET name = ? WHERE id = ?', [name.trim(), id]);
    const player = queryOne('SELECT * FROM players WHERE id = ?', [id]);
    res.json(player);
  } catch (err) {
    if ((err as Error).message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: '选手名称已存在' });
      return;
    }
    throw err;
  }
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  run('DELETE FROM players WHERE id = ?', [id]);
  res.status(204).send();
});

export default router;
