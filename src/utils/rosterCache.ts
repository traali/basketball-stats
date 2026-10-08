/**
 * Short-lived roster cache for player search (sessionStorage, 15 min).
 * A roster is a team's registered players from TASO getTeam; it changes
 * rarely, so repeating a search within a visit does not refetch 60 teams.
 * Only successful answers are stored; failures are never cached.
 */
import type { BasketRosterPlayer } from '../types/basketball'

export interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  key: (index: number) => string | null
  readonly length: number
}

export const ROSTER_TTL_MS = 15 * 60 * 1000
const PREFIX = 'basket.roster.v1:'

type Entry = { at: number; players: Array<Pick<BasketRosterPlayer, 'playerId' | 'fullName' | 'shirtNumber' | 'teamId' | 'teamName' | 'birthYear'>> }

function defaultStorage(): StorageLike | undefined {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : undefined
  } catch {
    return undefined
  }
}

export function createRosterCache(storage: StorageLike | undefined = defaultStorage(), ttlMs = ROSTER_TTL_MS, now = () => Date.now()) {
  const clear = () => {
    if (!storage) return
    for (let i = storage.length - 1; i >= 0; i--) {
      const k = storage.key(i)
      if (k && k.startsWith(PREFIX)) storage.removeItem(k)
    }
  }
  return {
    get(teamId: string): BasketRosterPlayer[] | undefined {
      try {
        const raw = storage?.getItem(PREFIX + teamId)
        if (!raw) return undefined
        const e = JSON.parse(raw) as Entry
        if (!e || typeof e.at !== 'number' || !Array.isArray(e.players) || now() - e.at > ttlMs) {
          storage?.removeItem(PREFIX + teamId)
          return undefined
        }
        return e.players.map((p) => ({ ...p, points: null, assists: null, fouls: null, threePointers: null }))
      } catch {
        return undefined
      }
    },
    set(teamId: string, players: BasketRosterPlayer[]) {
      if (!storage) return
      const entry: Entry = {
        at: now(),
        players: players.map(({ playerId, fullName, shirtNumber, teamId: tid, teamName, birthYear }) => ({
          playerId,
          fullName,
          shirtNumber,
          teamId: tid,
          teamName,
          birthYear,
        })),
      }
      const json = JSON.stringify(entry)
      try {
        storage.setItem(PREFIX + teamId, json)
      } catch {
        // Full: drop our old rosters and try once more; never break the search.
        try {
          clear()
          storage.setItem(PREFIX + teamId, json)
        } catch {
          /* ignore */
        }
      }
    },
  }
}

/** Fetch through the cache: a stored roster younger than the TTL is reused. */
export function cachedRoster(
  fetchRoster: (teamId: string) => Promise<BasketRosterPlayer[]>,
  cache: ReturnType<typeof createRosterCache>,
) {
  return async (teamId: string): Promise<BasketRosterPlayer[]> => {
    const hit = cache.get(teamId)
    if (hit) return hit
    const players = await fetchRoster(teamId)
    cache.set(teamId, players)
    return players
  }
}
