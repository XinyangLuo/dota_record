import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'wouter'
import { api, type PlayerStats, type HeroStats, type Player, type TeamStats, type Match, type Hero } from '@/lib/api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MatchCard from '@/components/MatchCard'
import {
  Trophy, Target, User, TrendingUp, Medal, Crown, Shield, History,
  Flame, Hash,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function WinRateBar({ rate, color = 'bg-primary' }: { rate: number; color?: string }) {
  const pct = Math.round(rate * 100)
  return (
    <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
      <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

function ConfidenceBar({ lower, upper, rate }: { lower: number; upper: number; rate: number }) {
  const l = Math.round(lower * 100)
  const u = Math.round(upper * 100)
  const r = Math.round(rate * 100)
  return (
    <div className="w-full bg-muted/60 rounded-full h-2.5 relative overflow-hidden">
      <div className="bg-primary/25 h-full rounded-full absolute" style={{ left: `${l}%`, width: `${u - l}%` }} />
      <div className="bg-primary h-full rounded-full absolute" style={{ left: 0, width: `${r}%` }} />
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center"><Crown className="w-4 h-4 text-amber-400" /></div>
  if (rank === 2) return <div className="w-7 h-7 rounded-lg bg-slate-400/20 flex items-center justify-center"><Medal className="w-4 h-4 text-slate-300" /></div>
  if (rank === 3) return <div className="w-7 h-7 rounded-lg bg-amber-700/20 flex items-center justify-center"><Medal className="w-4 h-4 text-amber-600" /></div>
  return <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">{rank}</div>
}

type SortMode = 'win_rate' | 'matches'

function SortToggle({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  return (
    <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-0.5">
      <button
        onClick={() => onChange('win_rate')}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
          value === 'win_rate' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Flame className="w-3 h-3" /> 按胜率
      </button>
      <button
        onClick={() => onChange('matches')}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
          value === 'matches' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Hash className="w-3 h-3" /> 按场次
      </button>
    </div>
  )
}

export default function StatsPage() {
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [heroStats, setHeroStats] = useState<HeroStats[]>([])
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null)
  const [playerHeroStats, setPlayerHeroStats] = useState<HeroStats[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [heroes, setHeroes] = useState<Hero[]>([])
  const [, navigate] = useLocation()

  const [playerSort, setPlayerSort] = useState<SortMode>('win_rate')
  const [heroSort, setHeroSort] = useState<SortMode>('win_rate')
  const [playerHeroSort, setPlayerHeroSort] = useState<SortMode>('win_rate')

  const loadStats = useCallback(async () => {
    const [ps, hs, ts, pls, mchs, hros] = await Promise.all([
      api.stats.players(),
      api.stats.heroes(),
      api.stats.teams(),
      api.players.list(),
      api.matches.list(),
      api.heroes.list(),
    ])
    setPlayerStats(ps)
    setHeroStats(hs)
    setTeamStats(ts)
    setPlayers(pls)
    setMatches(mchs)
    setHeroes(hros)
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  useEffect(() => {
    if (selectedPlayer !== null) {
      api.stats.playerHeroes(selectedPlayer).then(setPlayerHeroStats)
    }
  }, [selectedPlayer])

  const formatRate = (r: number) => `${(r * 100).toFixed(1)}%`

  const handleEditMatch = (match: Match) => {
    navigate(`/record?edit=${match.id}`)
  }

  const handleDeleteMatch = async (id: number) => {
    if (!confirm('确定要删除这场战局吗？')) return
    try {
      const res = await api.matches.delete(id)
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || '删除失败')
        return
      }
      await loadStats()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  const sortedPlayerStats = [...playerStats].sort((a, b) => {
    if (playerSort === 'win_rate') return b.confidence_lower - a.confidence_lower
    return b.total_matches - a.total_matches
  })

  const sortedHeroStats = [...heroStats].sort((a, b) => {
    if (heroSort === 'win_rate') return b.win_rate - a.win_rate || b.total_matches - a.total_matches
    return b.total_matches - a.total_matches || b.win_rate - a.win_rate
  })

  const sortedPlayerHeroStats = [...playerHeroStats].sort((a, b) => {
    if (playerHeroSort === 'win_rate') return b.win_rate - a.win_rate || b.total_matches - a.total_matches
    return b.total_matches - a.total_matches || b.win_rate - a.win_rate
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">战绩统计</h1>
          <p className="text-sm text-muted-foreground">查看选手胜率、英雄胜率等数据</p>
        </div>
      </div>

      {/* Team Stats Overview */}
      {teamStats && teamStats.total_matches > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-radiant/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-radiant" />
                </div>
                <div>
                  <p className="font-bold text-radiant">天辉</p>
                  <p className="text-xs text-muted-foreground">Radiant</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-2xl font-bold">{formatRate(teamStats.radiant.win_rate)}</p>
                  <p className="text-xs text-muted-foreground">胜率</p>
                </div>
              </div>
              <WinRateBar rate={teamStats.radiant.win_rate} color="bg-radiant" />
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-radiant">{teamStats.radiant.wins} 胜</span>
                <span className="text-muted-foreground">{teamStats.radiant.losses} 负</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-dire/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-dire" />
                </div>
                <div>
                  <p className="font-bold text-dire">夜魇</p>
                  <p className="text-xs text-muted-foreground">Dire</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-2xl font-bold">{formatRate(teamStats.dire.win_rate)}</p>
                  <p className="text-xs text-muted-foreground">胜率</p>
                </div>
              </div>
              <WinRateBar rate={teamStats.dire.win_rate} color="bg-dire" />
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-dire">{teamStats.dire.wins} 胜</span>
                <span className="text-muted-foreground">{teamStats.dire.losses} 负</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="players" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-4 h-11">
          <TabsTrigger value="players" className="gap-2">
            <Trophy className="w-4 h-4" />
            选手
          </TabsTrigger>
          <TabsTrigger value="heroes" className="gap-2">
            <Target className="w-4 h-4" />
            英雄
          </TabsTrigger>
          <TabsTrigger value="player-heroes" className="gap-2">
            <User className="w-4 h-4" />
            选手英雄
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            历史战绩
          </TabsTrigger>
        </TabsList>

        {/* Players */}
        <TabsContent value="players">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  选手胜率排行
                </CardTitle>
                <SortToggle value={playerSort} onChange={setPlayerSort} />
              </div>
            </CardHeader>
            <CardContent>
              {sortedPlayerStats.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>暂无数据，请先记录战绩</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedPlayerStats.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-4 p-4 rounded-xl bg-card/40 border border-border/30 hover:border-border/60 transition-colors">
                      <RankBadge rank={i + 1} />
                      <div className="w-24 shrink-0">
                        <p className="font-semibold truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.total_matches} 场</p>
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{formatRate(s.win_rate)}</span>
                          <span className="text-xs text-muted-foreground">{s.wins} 胜 / {s.total_matches - s.wins} 负</span>
                        </div>
                        <ConfidenceBar lower={s.confidence_lower} upper={s.confidence_upper} rate={s.win_rate} />
                        <p className="text-xs text-muted-foreground">
                          95% 置信区间: {formatRate(s.confidence_lower)} ~ {formatRate(s.confidence_upper)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Heroes */}
        <TabsContent value="heroes">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  英雄胜率排行
                </CardTitle>
                <SortToggle value={heroSort} onChange={setHeroSort} />
              </div>
            </CardHeader>
            <CardContent>
              {sortedHeroStats.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>暂无数据，请先记录战绩</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sortedHeroStats.map(s => (
                    <div key={s.hero_name} className="flex items-center gap-3 p-3 rounded-xl bg-card/40 border border-border/30 hover:border-border/60 transition-colors">
                      {s.icon_url && <img src={s.icon_url} alt={s.hero_name_cn} className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{s.hero_name_cn}</p>
                        <p className="text-xs text-muted-foreground">{s.wins} 胜 / {s.total_matches - s.wins} 负 · {s.total_matches} 场</p>
                      </div>
                      <div className="w-24 shrink-0 space-y-1.5 text-right">
                        <p className="text-sm font-bold">{formatRate(s.win_rate)}</p>
                        <WinRateBar rate={s.win_rate} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Player Heroes */}
        <TabsContent value="player-heroes">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  选手英雄榜
                </CardTitle>
                <SortToggle value={playerHeroSort} onChange={setPlayerHeroSort} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {players.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlayer(p.id)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                      selectedPlayer === p.id
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'bg-card/40 border-border/30 text-muted-foreground hover:border-border/60 hover:text-foreground'
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              {selectedPlayer === null ? (
                <div className="text-center py-16 text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>请选择一名选手查看其英雄数据</p>
                </div>
              ) : sortedPlayerHeroStats.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>该选手暂无英雄数据</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sortedPlayerHeroStats.map(s => (
                    <div key={s.hero_name} className="flex items-center gap-3 p-3 rounded-xl bg-card/40 border border-border/30 hover:border-border/60 transition-colors">
                      {s.icon_url && <img src={s.icon_url} alt={s.hero_name_cn} className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{s.hero_name_cn}</p>
                        <p className="text-xs text-muted-foreground">{s.wins} 胜 / {s.total_matches - s.wins} 负 · {s.total_matches} 场</p>
                      </div>
                      <div className="w-24 shrink-0 space-y-1.5 text-right">
                        <p className="text-sm font-bold">{formatRate(s.win_rate)}</p>
                        <WinRateBar rate={s.win_rate} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                历史战绩
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matches.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>暂无历史战绩</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-2">共 {matches.length} 场对局 · 点击编辑按钮跳转到战绩页面修改</p>
                  {matches.map(match => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      heroes={heroes}
                      onDelete={handleDeleteMatch}
                      onEdit={handleEditMatch}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
