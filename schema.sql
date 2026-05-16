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
