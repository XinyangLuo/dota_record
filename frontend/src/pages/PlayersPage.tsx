import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, User, Users, Pencil, Check, X } from 'lucide-react'
import { api, type Player } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState('')

  const loadPlayers = useCallback(async () => {
    const data = await api.players.list()
    setPlayers(data)
  }, [])

  useEffect(() => {
    loadPlayers()
  }, [loadPlayers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      await api.players.create(name.trim())
      setName('')
      await loadPlayers()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    await api.players.delete(id)
    await loadPlayers()
  }

  const startEdit = (player: Player) => {
    setEditingId(player.id)
    setEditName(player.name)
    setEditError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditError('')
  }

  const saveEdit = async (id: number) => {
    if (!editName.trim()) return
    setEditError('')
    try {
      await api.players.update(id, editName.trim())
      setEditingId(null)
      await loadPlayers()
    } catch (err) {
      setEditError((err as Error).message)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">选手管理</h1>
          <p className="text-sm text-muted-foreground">注册参与内战的所有选手</p>
        </div>
      </div>

      <Card className="border-border/60">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="输入选手名称..."
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-11 bg-secondary/50 border-border/60"
              />
              {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            </div>
            <Button type="submit" disabled={loading} className="h-11 px-6">
              <Plus className="w-4 h-4 mr-1.5" />
              注册
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {players.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>暂无选手，请先注册</p>
          </div>
        ) : (
          players.map(p => (
            <Card
              key={p.id}
              className="border-border/40 bg-card/60 hover:bg-card/80 transition-colors group"
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary/70" />
                  </div>
                  {editingId === p.id ? (
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Input
                          autoFocus
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="h-8 text-sm bg-secondary/50"
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit(p.id)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => saveEdit(p.id)}>
                          <Check className="w-4 h-4 text-radiant" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit}>
                          <X className="w-4 h-4 text-dire" />
                        </Button>
                      </div>
                      {editError && <p className="text-xs text-destructive mt-1">{editError}</p>}
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  )}
                </div>
                {editingId !== p.id && (
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(p)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
