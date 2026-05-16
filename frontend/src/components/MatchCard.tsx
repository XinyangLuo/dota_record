import { Pencil, Shield, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Hero, Match } from '@/lib/api'

interface MatchCardProps {
  match: Match
  heroes: Hero[]
  onDelete: (id: number) => void
  onEdit: (match: Match) => void
}

export default function MatchCard({ match, heroes, onDelete, onEdit }: MatchCardProps) {
  const heroMap = new Map(heroes.map(h => [h.name, h]))
  const radiantPlayers = match.players.filter(p => p.team === '天辉')
  const direPlayers = match.players.filter(p => p.team === '夜魇')

  return (
    <Card className="border-border/40 bg-card/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono">#{match.id}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(match.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className={cn('flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold', match.winner === '天辉' ? 'bg-radiant/15 text-radiant' : 'bg-dire/15 text-dire')}>
            <Shield className="w-3 h-3" />
            {match.winner} 胜
          </div>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEdit(match)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(match.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div className="p-4 grid grid-cols-2 gap-4">
        <div className="space-y-2">
          {radiantPlayers.map(p => {
            const hero = heroMap.get(p.hero_name)
            return (
              <div key={p.id} className="flex items-center gap-2">
                {hero && <img src={hero.icon_url} alt="" className="w-7 h-7 rounded-md object-cover" />}
                <span className="text-sm truncate">{p.player_name}</span>
                {match.winner === '天辉' && <span className="text-[10px] font-bold text-radiant ml-auto">W</span>}
              </div>
            )
          })}
        </div>
        <div className="space-y-2">
          {direPlayers.map(p => {
            const hero = heroMap.get(p.hero_name)
            return (
              <div key={p.id} className="flex items-center gap-2">
                {hero && <img src={hero.icon_url} alt="" className="w-7 h-7 rounded-md object-cover" />}
                <span className="text-sm truncate">{p.player_name}</span>
                {match.winner === '夜魇' && <span className="text-[10px] font-bold text-dire ml-auto">W</span>}
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
