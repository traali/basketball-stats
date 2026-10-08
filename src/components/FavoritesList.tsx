import { Link } from 'react-router-dom'
import { Shield, User, Users } from 'lucide-react'
import type { FavKind, FavoriteItem } from '../hooks/useFavorites'
import { FavoriteButton } from './FavoriteButton'

const KIND_LABEL: Record<FavKind, string> = { team: 'Joukkueet', player: 'Pelaajat', club: 'Seurat' }
const KIND_ICON = { team: Shield, player: User, club: Users }
const ORDER: FavKind[] = ['team', 'player', 'club']

function favoritePath(f: FavoriteItem): string {
  return `/${f.kind}/${encodeURIComponent(f.id)}`
}

/** Saved favourites grouped by kind; each row opens the app's own page. */
export function FavoritesList({ favorites, compact = false }: { favorites: FavoriteItem[]; compact?: boolean }) {
  return (
    <div className="space-y-4">
      {ORDER.map((kind) => {
        const items = favorites.filter((f) => f.kind === kind)
        if (!items.length) return null
        const Icon = KIND_ICON[kind]
        return (
          <section key={kind} className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 text-accent" /> {KIND_LABEL[kind]} ({items.length})
            </h3>
            <ul className="space-y-1.5">
              {items.map((f) => (
                <li key={`${f.kind}-${f.id}`} className="flex items-center gap-2 rounded-xl border border-hairline bg-court pl-3 pr-1 min-h-12">
                  <Link to={favoritePath(f)} className="min-w-0 grow py-2">
                    <p className="text-sm font-semibold text-white truncate">{f.name}</p>
                    {f.subtitle && !compact ? <p className="text-[11px] text-slate-400 truncate">{f.subtitle}</p> : null}
                  </Link>
                  <FavoriteButton item={f} size="sm" />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
