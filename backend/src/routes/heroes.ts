import { Router } from 'express';
import heroes from '../data/heroes.json' with { type: 'json' };

const router = Router();

router.get('/', (_req, res) => {
  res.json(heroes);
});

export default router;
