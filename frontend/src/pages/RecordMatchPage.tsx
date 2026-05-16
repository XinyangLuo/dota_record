import { useState, useEffect, useCallback, useRef } from 'react'
import { Save, Swords, ChevronDown, X, Search, Trophy, History } from 'lucide-react'
import { api, type Player, type Hero, type Match } from '@/lib/api'
import MatchCard from '@/components/MatchCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SlotState {
  playerId: number | null
  heroName: string | null
}

interface PickerProps<T> {
  items: T[]
  value: string | null
  onSelect: (value: string) => void
  displayKey: (item: T) => string
  searchKey: (item: T) => string
  matchKey: (item: T) => string
  iconUrl?: (item: T) => string | undefined
  placeholder: string
  team: '天辉' | '夜魇'
  type: 'player' | 'hero'
}

function Picker<T>({
  items, value, onSelect, displayKey, searchKey, matchKey, iconUrl, placeholder, team, type,
}: PickerProps<T>) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedItem = items.find(i => matchKey(i) === value)
  const filtered = query.trim()
    ? items.filter(i => searchKey(i).toLowerCase().includes(query.toLowerCase()))
    : items

  const teamColor = team === '天辉' ? 'text-radiant' : 'text-dire'
  const teamBorder = team === '天辉' ? 'border-radiant' : 'border-dire'
  const teamBgSoft = team === '天辉' ? 'bg-radiant-soft' : 'bg-dire-soft'

  if (selectedItem) {
    return (
      <div className="flex items-center gap-2">
        {type === 'hero' && iconUrl?.(selectedItem) && (
          <img src={iconUrl(selectedItem)} alt="" className="w-10 h-10 rounded-lg object-cover border border-border/40" />
        )}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold truncate', type === 'hero' && teamColor)}>
            {displayKey(selectedItem)}
          </p>
          {type === 'hero' && <p className="text-xs text-muted-foreground">{team === '天辉' ? '天辉' : '夜魇'}</p>}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => onSelect('')}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors hover:bg-secondary/80',
          open ? teamBorder : 'border-border/40',
          open && teamBgSoft,
        )}
      >
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground flex-1 text-left">{placeholder}</span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className={cn('absolute z-50 w-full mt-1 rounded-xl border shadow-2xl overflow-hidden bg-popover', teamBorder)}>
          <div className="p-2 border-b border-border/40">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input autoFocus placeholder="搜索..." value={query} onChange={e => setQuery(e.target.value)} className="pl-9 h-9 bg-transparent border-0 focus-visible:ring-0" />
            </div>
          </div>
          <div className="max-h-64 overflow-auto p-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">未找到</p>
            ) : (
              filtered.map(item => (
                <button
                  key={matchKey(item)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-accent text-left transition-colors"
                  onClick={() => { onSelect(matchKey(item)); setOpen(false); setQuery('') }}
                >
                  {iconUrl?.(item) && <img src={iconUrl(item)} alt="" className="w-9 h-9 rounded-lg object-cover" />}
                  <span className="font-medium">{displayKey(item)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TeamSlot({
  index, slot, players, heroes, team, onUpdate,
}: {
  index: number
  slot: SlotState
  players: Player[]
  heroes: Hero[]
  team: '天辉' | '夜魇'
  onUpdate: (field: 'playerId' | 'heroName', val: number | string | null) => void
}) {
  const teamBorder = team === '天辉' ? 'border-radiant/30' : 'border-dire/30'
  const teamBg = team === '天辉' ? 'bg-radiant-soft/50' : 'bg-dire-soft/50'

  return (
    <div className={cn('rounded-xl border p-4 transition-all', teamBorder, slot.playerId && slot.heroName ? teamBg : 'bg-card/40')}>
      <div className="flex items-center gap-2 mb-3">
        <span className={cn('text-xs font-bold w-5 h-5 rounded-md flex items-center justify-center shrink-0', team === '天辉' ? 'bg-radiant/20 text-radiant' : 'bg-dire/20 text-dire')}>
          {index + 1}
        </span>
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{team === '天辉' ? 'Radiant' : 'Dire'}</span>
      </div>
      <div className="space-y-2.5">
        <Picker items={players} value={slot.playerId?.toString() ?? null} onSelect={val => onUpdate('playerId', val ? parseInt(val) : null)} displayKey={p => p.name} searchKey={p => p.name} matchKey={p => p.id.toString()} placeholder="选择选手" team={team} type="player" />
        <Picker items={heroes} value={slot.heroName} onSelect={val => onUpdate('heroName', val || null)} displayKey={h => h.name_cn} searchKey={h => `${h.name_cn} ${h.name}`} matchKey={h => h.name} iconUrl={h => h.icon_url} placeholder="选择英雄" team={team} type="hero" />
      </div>
    </div>
  )
}

export default function RecordMatchPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [heroes, setHeroes] = useState<Hero[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [winner, setWinner] = useState<'天辉' | '夜魇'>('天辉')
  const [radiant, setRadiant] = useState<SlotState[]>(Array(5).fill(null).map(() => ({ playerId: null, heroName: null })))
  const [dire, setDire] = useState<SlotState[]>(Array(5).fill(null).map(() => ({ playerId: null, heroName: null })))
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    const [p, h, m] = await Promise.all([api.players.list(), api.heroes.list(), api.matches.list()])
    setPlayers(p)
    setHeroes(h)
    setMatches(m)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // 支持从其他页面通过 ?edit=xxx 进入编辑模式
  useEffect(() => {
    if (matches.length === 0 || editingMatchId !== null) return
    const search = new URLSearchParams(window.location.search)
    const editId = search.get('edit')
    if (editId) {
      const m = matches.find(x => x.id === parseInt(editId))
      if (m) {
        handleEdit(m)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [matches, editingMatchId])

  const updateSlot = (team: '天辉' | '夜魇', index: number, field: 'playerId' | 'heroName', val: number | string | null) => {
    const setter = team === '天辉' ? setRadiant : setDire
    setter(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: val }
      return next
    })
  }

  const resetForm = () => {
    setEditingMatchId(null)
    setWinner('天辉')
    setRadiant(Array(5).fill(null).map(() => ({ playerId: null, heroName: null })))
    setDire(Array(5).fill(null).map(() => ({ playerId: null, heroName: null })))
  }

  const handleEdit = (match: Match) => {
    setEditingMatchId(match.id)
    setWinner(match.winner)

    const r: SlotState[] = Array(5).fill(null).map(() => ({ playerId: null, heroName: null }))
    const d: SlotState[] = Array(5).fill(null).map(() => ({ playerId: null, heroName: null }))

    match.players.forEach((p) => {
      const slot = { playerId: p.player_id, heroName: p.hero_name }
      if (p.team === '天辉') {
        const idx = r.findIndex(s => s.playerId === null)
        if (idx >= 0) r[idx] = slot
      } else {
        const idx = d.findIndex(s => s.playerId === null)
        if (idx >= 0) d[idx] = slot
      }
    })

    setRadiant(r)
    setDire(d)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    const radiantPlayers = radiant.filter(s => s.playerId !== null && s.heroName !== null).map(s => ({ player_id: s.playerId!, hero_name: s.heroName!, team: '天辉' as const }))
    const direPlayers = dire.filter(s => s.playerId !== null && s.heroName !== null).map(s => ({ player_id: s.playerId!, hero_name: s.heroName!, team: '夜魇' as const }))

    if (radiantPlayers.length !== 5 || direPlayers.length !== 5) {
      setError('天辉和夜魇各需要选择 5 名选手和英雄')
      return
    }

    const allPlayers = [...radiantPlayers, ...direPlayers]
    const ids = allPlayers.map(p => p.player_id)
    if (new Set(ids).size !== 10) {
      setError('选手不能重复')
      return
    }

    const heroNames = allPlayers.map(p => p.hero_name)
    if (new Set(heroNames).size !== 10) {
      setError('英雄不能重复')
      return
    }

    setSubmitting(true)
    try {
      if (editingMatchId !== null) {
        await api.matches.update(editingMatchId, winner, allPlayers)
        setSuccess('战绩更新成功！')
      } else {
        await api.matches.create(winner, allPlayers)
        setSuccess('战绩记录成功！')
      }
      resetForm()
      await loadData()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这场战局吗？')) return
    try {
      const res = await api.matches.delete(id)
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || '删除失败')
        return
      }
      setSuccess('战局已删除')
      if (editingMatchId === id) resetForm()
      await loadData()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const filledCount = (slots: SlotState[]) => slots.filter(s => s.playerId !== null && s.heroName !== null).length

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Swords className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {editingMatchId !== null ? `编辑战绩 #${editingMatchId}` : '战绩记录'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {editingMatchId !== null ? '修改这场对局的选手和胜方' : '记录一场天辉 vs 夜魇的对局'}
            </p>
          </div>
          {editingMatchId !== null && (
            <Button variant="ghost" size="sm" onClick={resetForm} className="ml-auto">
              <X className="w-4 h-4 mr-1" />
              取消编辑
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-radiant" />
                <h2 className="text-lg font-bold text-radiant">天辉</h2>
                <span className="text-xs text-muted-foreground">Radiant</span>
              </div>
              <span className="text-sm text-muted-foreground">{filledCount(radiant)} / 5</span>
            </div>
            <div className="space-y-2.5">
              {radiant.map((slot, i) => <TeamSlot key={i} index={i} slot={slot} players={players} heroes={heroes} team="天辉" onUpdate={(field, val) => updateSlot('天辉', i, field, val)} />)}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-dire" />
                <h2 className="text-lg font-bold text-dire">夜魇</h2>
                <span className="text-xs text-muted-foreground">Dire</span>
              </div>
              <span className="text-sm text-muted-foreground">{filledCount(dire)} / 5</span>
            </div>
            <div className="space-y-2.5">
              {dire.map((slot, i) => <TeamSlot key={i} index={i} slot={slot} players={players} heroes={heroes} team="夜魇" onUpdate={(field, val) => updateSlot('夜魇', i, field, val)} />)}
            </div>
          </div>
        </div>

        <Card className="border-border/60">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">选择胜方</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setWinner('天辉')} className={cn('relative flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all', winner === '天辉' ? 'border-radiant bg-radiant-soft text-radiant' : 'border-border/40 bg-card/40 text-muted-foreground hover:border-radiant/30')}>
                <span className="text-lg font-bold">天辉</span>
                <span className="text-xs opacity-70">Radiant</span>
                {winner === '天辉' && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-radiant flex items-center justify-center"><svg className="w-3 h-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg></div>}
              </button>
              <button onClick={() => setWinner('夜魇')} className={cn('relative flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all', winner === '夜魇' ? 'border-dire bg-dire-soft text-dire' : 'border-border/40 bg-card/40 text-muted-foreground hover:border-dire/30')}>
                <span className="text-lg font-bold">夜魇</span>
                <span className="text-xs opacity-70">Dire</span>
                {winner === '夜魇' && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-dire flex items-center justify-center"><svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg></div>}
              </button>
            </div>
          </CardContent>
        </Card>

        {error && <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-400">{success}</div>}

        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 text-base font-semibold">
          <Save className="w-5 h-5 mr-2" />
          {submitting ? '提交中...' : editingMatchId !== null ? '保存修改' : '提交战绩'}
        </Button>
      </div>

      {matches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">战局列表</h2>
              <p className="text-sm text-muted-foreground">共 {matches.length} 场对局</p>
            </div>
          </div>
          <div className="space-y-3">
            {matches.map(match => <MatchCard key={match.id} match={match} heroes={heroes} onDelete={handleDelete} onEdit={handleEdit} />)}
          </div>
        </div>
      )}
    </div>
  )
}
