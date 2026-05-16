const API_BASE = '';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface Player {
  id: number;
  name: string;
  created_at: string;
}

export interface Hero {
  name: string;
  name_cn: string;
  icon_url: string;
}

export interface MatchPlayer {
  id: number;
  match_id: number;
  player_id: number;
  player_name: string;
  hero_name: string;
  team: '天辉' | '夜魇';
}

export interface Match {
  id: number;
  winner: '天辉' | '夜魇';
  created_at: string;
  players: MatchPlayer[];
}

export interface PlayerStats {
  id: number;
  name: string;
  total_matches: number;
  wins: number;
  win_rate: number;
  confidence_lower: number;
  confidence_upper: number;
}

export interface HeroStats {
  hero_name: string;
  hero_name_cn: string;
  icon_url: string;
  total_matches: number;
  wins: number;
  win_rate: number;
}

export interface TeamStats {
  total_matches: number;
  radiant: { wins: number; losses: number; win_rate: number };
  dire: { wins: number; losses: number; win_rate: number };
}

export const api = {
  players: {
    list: () => fetchJson<Player[]>('/api/players'),
    create: (name: string) => fetchJson<Player>('/api/players', { method: 'POST', body: JSON.stringify({ name }) }),
    update: (id: number, name: string) => fetchJson<Player>(`/api/players/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
    delete: (id: number) => fetch(`/api/players/${id}`, { method: 'DELETE' }),
  },
  heroes: {
    list: () => fetchJson<Hero[]>('/api/heroes'),
  },
  matches: {
    list: () => fetchJson<Match[]>('/api/matches'),
    create: (winner: '天辉' | '夜魇', players: { player_id: number; hero_name: string; team: '天辉' | '夜魇' }[]) =>
      fetchJson<Match>('/api/matches', { method: 'POST', body: JSON.stringify({ winner, players }) }),
    update: (id: number, winner: '天辉' | '夜魇', players: { player_id: number; hero_name: string; team: '天辉' | '夜魇' }[]) =>
      fetchJson<Match>(`/api/matches/${id}`, { method: 'PUT', body: JSON.stringify({ winner, players }) }),
    delete: (id: number) => fetch(`/api/matches/${id}`, { method: 'DELETE' }),
  },
  stats: {
    players: () => fetchJson<PlayerStats[]>('/api/stats/players'),
    heroes: () => fetchJson<HeroStats[]>('/api/stats/heroes'),
    playerHeroes: (playerId: number) => fetchJson<HeroStats[]>(`/api/stats/player/${playerId}/heroes`),
    teams: () => fetchJson<TeamStats>('/api/stats/teams'),
  },
};
