import { useCallback, useEffect, useState } from 'react'
import { parseFederationTeamId } from '../utils/teamSelection'

export type FavKind = 'team' | 'player' | 'club'

export interface FavoriteItem {
  kind: FavKind
  id: string
  name: string
  subtitle?: string
}

const KEY = 'basket.favorites.v1'

function read(): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => {
      if (!item || typeof item !== 'object') return false
      const favorite = item as FavoriteItem
      if (!favorite.kind || !favorite.id || !favorite.name) return false
      if (favorite.kind === 'team') return Boolean(parseFederationTeamId(favorite.id))
      return true
    })
  } catch {
    return []
  }
}

function write(items: FavoriteItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 40)))
  } catch {
    /* quota */
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])

  useEffect(() => {
    setFavorites(read())
  }, [])

  const isFavorite = useCallback(
    (kind: FavKind, id: string) => favorites.some((f) => f.kind === kind && f.id === id),
    [favorites],
  )

  const toggle = useCallback((item: FavoriteItem) => {
    if (item.kind === 'team' && !parseFederationTeamId(item.id)) return
    setFavorites((current) => {
      const exists = current.some((f) => f.kind === item.kind && f.id === item.id)
      const next = exists
        ? current.filter((f) => !(f.kind === item.kind && f.id === item.id))
        : [item, ...current]
      write(next)
      return next
    })
  }, [])

  return { favorites, isFavorite, toggle }
}
