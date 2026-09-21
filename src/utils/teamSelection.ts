const TEAM_ID_RE = /^\d+$/
const LAST_TEAM_KEY = 'basket.lastTeamId.v1'

interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

function getStorage(storage?: StorageLike): StorageLike | undefined {
  if (storage) return storage
  if (typeof window === 'undefined') return undefined
  return window.localStorage
}

export function parseFederationTeamId(value?: string | null): string | undefined {
  if (!value) return undefined
  const text = value.trim()
  if (!text) return undefined
  if (TEAM_ID_RE.test(text)) return text

  const match = text.match(/(?:team_id=|[?&]team=|\/team\/|\/joukkueet\/)(\d+)/i)
  return match?.[1]
}

export function writeLastTeamId(teamId: string, storage?: StorageLike) {
  const valid = parseFederationTeamId(teamId)
  if (!valid) return
  const s = getStorage(storage)
  if (!s) return
  try {
    s.setItem(LAST_TEAM_KEY, valid)
  } catch {
    /* ignore storage failures */
  }
}

export function readLastTeamId(storage?: StorageLike): string | undefined {
  const s = getStorage(storage)
  if (!s) return undefined
  try {
    return parseFederationTeamId(s.getItem(LAST_TEAM_KEY))
  } catch {
    return undefined
  }
}
