import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { favoritesStore, type FavKind, type FavoriteItem } from '../utils/favoritesStore'

export type { FavKind, FavoriteItem }

const EMPTY: FavoriteItem[] = []
let persistAsked = false

export function useFavorites() {
  const favorites = useSyncExternalStore(favoritesStore.subscribe, favoritesStore.get, () => EMPTY)

  useEffect(() => {
    if (persistAsked || favorites.length === 0) return
    persistAsked = true
    // Ask the browser not to clear saved favourites under storage pressure.
    void navigator.storage?.persist?.().catch(() => undefined)
  }, [favorites.length])

  const isFavorite = useCallback(
    (kind: FavKind, id: string) => favorites.some((f) => f.kind === kind && f.id === id),
    [favorites],
  )
  const toggle = useCallback((item: FavoriteItem) => favoritesStore.toggle(item), [])

  return { favorites, isFavorite, toggle }
}
