import { Link, useLocation } from 'wouter'
import { Swords, Trophy, Users, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/players', label: '选手', icon: Users },
  { href: '/record', label: '战绩', icon: Swords },
  { href: '/stats', label: '统计', icon: Trophy },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/60 bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 flex items-center h-16 gap-1">
          <div className="flex items-center gap-2 mr-6">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight">Dota Record</span>
          </div>
          <div className="flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  location === item.href
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
