import type { BasketTeamFixture } from '../types/basketball'

export function formatClock(time: string): string {
  const m = String(time || '').trim().match(/^(\d{1,2}):(\d{2})/)
  if (!m) return ''
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

export function helsinkiStamp(d = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Helsinki',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`
}

export function isKickoffUpcoming(date: string, time: string, now = new Date()): boolean {
  if (!date) return false
  const clock = formatClock(time) || '00:00'
  return `${date} ${clock}` > helsinkiStamp(now)
}

export type FormLetter = 'V' | 'T' | 'H'

export function recentForm(
  fixtures: BasketTeamFixture[],
  excludeMatchId?: string,
  n = 5,
): BasketTeamFixture[] {
  return [...fixtures]
    .filter((f) => f.score && f.matchId !== excludeMatchId)
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
    .slice(0, n)
}

export function formLetter(f: BasketTeamFixture): FormLetter {
  if (f.isWin) return 'V'
  if (f.isDraw) return 'T'
  return 'H'
}

export function headToHead(
  homeFixtures: BasketTeamFixture[],
  awayTeamId: string | undefined,
  awayTeamName: string,
  excludeMatchId?: string,
): BasketTeamFixture[] {
  const away = (awayTeamName || '').toLowerCase()
  return [...homeFixtures]
    .filter((f) => {
      if (excludeMatchId && f.matchId === excludeMatchId) return false
      if (!f.score) return false
      if (awayTeamId && (f.homeTeamId === awayTeamId || f.awayTeamId === awayTeamId)) return true
      const opp = f.isHome ? f.awayTeam : f.homeTeam
      return away && opp.toLowerCase() === away
    })
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
    .slice(0, 8)
}

export type CommonRow = {
  opponent: string
  opponentId?: string
  home?: BasketTeamFixture
  away?: BasketTeamFixture
}

export function commonOpponents(
  homeFixtures: BasketTeamFixture[],
  awayFixtures: BasketTeamFixture[],
  homeId: string | undefined,
  awayId: string | undefined,
  excludeMatchId?: string,
): CommonRow[] {
  const played = (fx: BasketTeamFixture[]) =>
    fx.filter((f) => f.score && f.matchId !== excludeMatchId)

  const keyOf = (f: BasketTeamFixture, selfId?: string) => {
    const oppId = f.isHome ? f.awayTeamId : f.homeTeamId
    if (oppId && oppId !== selfId) return `id:${oppId}`
    const name = f.isHome ? f.awayTeam : f.homeTeam
    return `n:${name.toLowerCase()}`
  }

  const homeMap = new Map<string, BasketTeamFixture>()
  for (const f of played(homeFixtures)) {
    const k = keyOf(f, homeId)
    if (!homeMap.has(k)) homeMap.set(k, f)
  }
  const rows: CommonRow[] = []
  const seen = new Set<string>()
  for (const f of played(awayFixtures)) {
    const k = keyOf(f, awayId)
    if (homeId && k === `id:${homeId}`) continue
    const home = homeMap.get(k)
    if (!home || seen.has(k)) continue
    seen.add(k)
    const opponent = f.isHome ? f.awayTeam : f.homeTeam
    rows.push({
      opponent,
      opponentId: f.isHome ? f.awayTeamId : f.homeTeamId,
      home,
      away: f,
    })
  }
  return rows.slice(0, 8)
}

export function sameDayPool(
  buckets: BasketTeamFixture[][],
  date: string,
  current?: BasketTeamFixture,
): BasketTeamFixture[] {
  const map = new Map<string, BasketTeamFixture>()
  if (current?.matchId) map.set(current.matchId, current)
  for (const list of buckets) {
    for (const f of list) {
      if (!f.matchId || f.date !== date) continue
      if (!map.has(f.matchId)) map.set(f.matchId, f)
    }
  }
  return [...map.values()].sort((a, b) => {
    const c = formatClock(a.time).localeCompare(formatClock(b.time))
    return c !== 0 ? c : a.matchId.localeCompare(b.matchId)
  })
}
