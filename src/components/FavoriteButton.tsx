import { Heart } from 'lucide-react'
import clsx from 'clsx'
import { useFavorites, type FavoriteItem } from '../hooks/useFavorites'

/** Heart toggle that saves a team, player or club on this phone. */
export function FavoriteButton({ item, size = 'md' }: { item: FavoriteItem; size?: 'sm' | 'md' }) {
  const { isFavorite, toggle } = useFavorites()
  const fav = isFavorite(item.kind, item.id)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        toggle(item)
      }}
      aria-label={fav ? `Poista ${item.name} suosikeista` : `Lisää ${item.name} suosikkeihin`}
      aria-pressed={fav}
      className={clsx(
        'rounded-full border shrink-0 flex items-center justify-center',
        size === 'sm' ? 'w-11 h-11' : 'p-2.5',
        fav ? 'border-rose-400 text-rose-400' : 'border-slate-700 text-slate-400 hover:text-rose-300',
      )}
    >
      <Heart className={clsx(size === 'sm' ? 'w-4 h-4' : 'w-5 h-5', fav && 'fill-current')} />
    </button>
  )
}
