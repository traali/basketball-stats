export interface FavoriteTeam {
  id: string
  name: string
}

export const FAVORITE_TEAMS_STORAGE_KEY = 'basket_favorite_teams'
export const LAST_TEAM_ID_STORAGE_KEY = 'basket_last_team_id'

export function isTorneopalTeamId(teamId: string): boolean {
  return /^\d+$/.test(teamId.trim())
}

export function parseBasketTeamId(input: string): string {
  const value = input.trim()
  if (!value) return ''
  if (/^\d+$/.test(value)) return value
  const pathMatch = value.match(/\/team\/(\d+)/i)
  if (pathMatch) return pathMatch[1]
  const urlMatch = value.match(/(?:team_id|joukkue|team|id)=([a-zA-Z0-9_-]+)/i)
  return urlMatch ? urlMatch[1] : value
}

export function normalizeFavoriteTeams(value: unknown): FavoriteTeam[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const normalized: FavoriteTeam[] = []
  for (const row of value) {
    if (!row || typeof row !== 'object') continue
    const id = String((row as { id?: unknown }).id || '').trim()
    const name = String((row as { name?: unknown }).name || '').trim()
    if (!id || !name || seen.has(id)) continue
    seen.add(id)
    normalized.push({ id, name })
  }
  return normalized
}

export function loadFavoriteTeams(): FavoriteTeam[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(FAVORITE_TEAMS_STORAGE_KEY)
    if (!raw) return []
    return normalizeFavoriteTeams(JSON.parse(raw))
  } catch {
    return []
  }
}

export function saveFavoriteTeams(teams: FavoriteTeam[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(FAVORITE_TEAMS_STORAGE_KEY, JSON.stringify(normalizeFavoriteTeams(teams)))
}

export function getTeamIdFromSearch(search: string): string {
  const params = new URLSearchParams(search)
  const value = params.get('team') || params.get('teamId') || params.get('team_id') || ''
  return parseBasketTeamId(value)
}
