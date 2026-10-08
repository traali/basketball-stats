/**
 * Favourite teams, players and clubs, saved on the phone (localStorage).
 * One shared store so every component and every tab sees the same list.
 * Key and format are unchanged from v1, so earlier saves still load.
 */
export type FavKind = 'team' | 'player' | 'club'

export interface FavoriteItem {
  kind: FavKind
  /** Basket.fi (TASO) numeric id. */
  id: string
  name: string
  subtitle?: string
}

export interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export const FAVORITES_KEY = 'basket.favorites.v1'
const MAX_ITEMS = 60
const KINDS: FavKind[] = ['team', 'player', 'club']
const ID_RE = /^\d+$/

export function isValidFavorite(item: unknown): item is FavoriteItem {
  if (!item || typeof item !== 'object') return false
  const f = item as Partial<FavoriteItem>
  return (
    typeof f.kind === 'string' &&
    KINDS.includes(f.kind as FavKind) &&
    typeof f.id === 'string' &&
    ID_RE.test(f.id.trim()) &&
    typeof f.name === 'string' &&
    f.name.trim().length > 0
  )
}

export function parseFavorites(raw: string | null): FavoriteItem[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const seen = new Set<string>()
    const out: FavoriteItem[] = []
    for (const item of parsed) {
      if (!isValidFavorite(item)) continue
      const key = `${item.kind}:${item.id.trim()}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        kind: item.kind,
        id: item.id.trim(),
        name: item.name.trim(),
        ...(item.subtitle ? { subtitle: String(item.subtitle) } : {}),
      })
    }
    return out
  } catch {
    return []
  }
}

export function toggleFavorite(list: FavoriteItem[], item: FavoriteItem): FavoriteItem[] {
  if (!isValidFavorite(item)) return list
  const exists = list.some((f) => f.kind === item.kind && f.id === item.id)
  if (exists) return list.filter((f) => !(f.kind === item.kind && f.id === item.id))
  return [item, ...list].slice(0, MAX_ITEMS)
}

function defaultStorage(): StorageLike | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined
  } catch {
    return undefined
  }
}

export function createFavoritesStore(storage: StorageLike | undefined = defaultStorage()) {
  let cache: FavoriteItem[] | null = null
  const listeners = new Set<() => void>()

  const read = (): FavoriteItem[] => {
    if (cache) return cache
    try {
      cache = parseFavorites(storage?.getItem(FAVORITES_KEY) ?? null)
    } catch {
      cache = []
    }
    return cache
  }

  const emit = () => listeners.forEach((l) => l())

  return {
    get: read,
    toggle(item: FavoriteItem) {
      const next = toggleFavorite(read(), item)
      if (next === cache) return
      cache = next
      try {
        storage?.setItem(FAVORITES_KEY, JSON.stringify(next))
      } catch {
        /* storage full or blocked: the list still works for this visit */
      }
      emit()
    },
    /** Another tab changed the list. */
    reload() {
      cache = null
      emit()
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export const favoritesStore = createFavoritesStore()

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === FAVORITES_KEY || e.key === null) favoritesStore.reload()
  })
}
