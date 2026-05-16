import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import playersRouter from './routes/players.js';
import matchesRouter from './routes/matches.js';
import statsRouter from './routes/stats.js';
import heroesRouter from './routes/heroes.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/players', playersRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/heroes', heroesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
