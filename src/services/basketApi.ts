/**
 * Koripalloliitto / Basket.fi Torneopal REST API Client
 * Base: https://koripallo-api.torneopal.net/taso/rest
 */

import type {
  BasketMatchDetail,
  BasketQuarterScore,
  BasketPlayerLeader,
  BasketTeamFixture,
  BasketStandingRow,
  BasketRosterPlayer,
  BasketTeamProfile,
  BasketSeasonGroup,
  BasketCompetition,
  BasketCategory,
  BasketGroupSummary,
  BasketGroupTeam,
  BasketGroupMatch,
  BasketGroupDetail,
  BasketClubSummary,
  BasketClubTeam,
  BasketClubDetail,
  BasketPlayerProfile,
  BasketPlayerTeam,
  BasketPlayerMatch,
  DiscoveryHit,
} from '../types/basketball'
import { isKickoffUpcoming } from '../utils/matchContext.ts'

const API_BASE = 'https://koripallo-api.torneopal.net/taso/rest'
const TASO_PROXY = 'https://taso-proxy.sakkoja.workers.dev/basket'
const BASKET_KEY = 'df8e84j9xtdz269euy3h'

const reqHeaders = {
  Accept: `json/${BASKET_KEY}`,
  Referer: 'https://tulospalvelu.basket.fi/',
}

async function basketGet(path: string): Promise<Record<string, unknown> | null> {
  const urls = [
    `${TASO_PROXY}/${path}`,
    `${API_BASE}/${path}`,
    `${API_BASE}/${path}${path.includes('?') ? '&' : '?'}_cb=${Date.now()}`,
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: url.includes('taso-proxy') ? { Accept: 'application/json' } : reqHeaders,
      })
      if (!res.ok) continue
      const text = await res.text()
      const i = text.indexOf('{')
      if (i < 0) continue
      return JSON.parse(text.slice(i))
    } catch {
      /* try next */
    }
  }
  return null
}

type CacheEntry = { at: number; data: Record<string, unknown>; ttl: number }
const memCache = new Map<string, CacheEntry>()

async function basketGetCached(path: string, ttlMs = 5 * 60 * 1000): Promise<Record<string, unknown> | null> {
  const hit = memCache.get(path)
  if (hit && Date.now() - hit.at < hit.ttl) return hit.data
  const data = await basketGet(path)
  if (data) memCache.set(path, { at: Date.now(), data, ttl: ttlMs })
  return data
}

function n(v: unknown, fallback = 0): number {
  const x = Number(v)
  return Number.isFinite(x) ? x : fallback
}

function str(v: unknown, fallback = ''): string {
  if (v == null) return fallback
  return String(v).trim()
}

function numericId(v: unknown): string | undefined {
  const s = str(v)
  return /^\d+$/.test(s) ? s : undefined
}

function toResourceId(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const normalized = value.trim()
  return normalized ? normalized : undefined
}

function firstQueryValue(params: URLSearchParams, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = toResourceId(params.get(key))
    if (value) return value
  }
  return undefined
}

export type BasketResource =
  | { kind: 'match'; id: string }
  | { kind: 'team'; id: string }
  | { kind: 'player'; id: string }
  | { kind: 'none' }

function parseBasketSourceUrl(rawUrl: string): BasketResource {
  try {
    const url = new URL(rawUrl)
    const fromPath = url.pathname.match(/\/(match|game|team|player)\/([^/?#]+)/i)
    if (fromPath?.[1] && fromPath[2]) {
      const kind = fromPath[1].toLowerCase()
      const id = decodeURIComponent(fromPath[2])
      if (kind === 'match' || kind === 'game') return { kind: 'match', id }
      if (kind === 'team') return { kind: 'team', id }
      if (kind === 'player') return { kind: 'player', id }
    }

    const matchId = firstQueryValue(url.searchParams, ['match_id', 'matchId', 'match', 'game_id', 'gameId', 'game'])
    if (matchId) return { kind: 'match', id: matchId }
    const teamId = firstQueryValue(url.searchParams, ['team_id', 'teamId', 'team', 'joukkue'])
    if (teamId) return { kind: 'team', id: teamId }
    const playerId = firstQueryValue(url.searchParams, ['player_id', 'playerId', 'player'])
    if (playerId) return { kind: 'player', id: playerId }
  } catch {
    /* ignore malformed pasted URLs */
  }
  return { kind: 'none' }
}

export function parseBasketResourceFromLocation(href: string): BasketResource {
  try {
    const url = new URL(href)
    const hashBody = (url.hash || '').replace(/^#/, '')
    const [hashPathRaw, hashQueryRaw] = hashBody.split('?')
    const hashPath = hashPathRaw || ''
    const mergedParams = new URLSearchParams(url.search)
    if (hashQueryRaw) {
      new URLSearchParams(hashQueryRaw).forEach((value, key) => {
        if (!mergedParams.get(key)) mergedParams.set(key, value)
      })
    }

    const pathCandidates = [url.pathname, hashPath.startsWith('/') ? hashPath : `/${hashPath}`]
    for (const candidate of pathCandidates) {
      const pathMatch = candidate.match(/\/(match|game|team|player)\/([^/?#]+)/i)
      if (pathMatch?.[1] && pathMatch[2]) {
        const kind = pathMatch[1].toLowerCase()
        const id = decodeURIComponent(pathMatch[2])
        if (kind === 'match' || kind === 'game') return { kind: 'match', id }
        if (kind === 'team') return { kind: 'team', id }
        if (kind === 'player') return { kind: 'player', id }
      }
    }

    const matchId = firstQueryValue(mergedParams, ['match', 'matchId', 'game', 'gameId', 'match_id', 'game_id'])
    if (matchId) return { kind: 'match', id: matchId }
    const teamId = firstQueryValue(mergedParams, ['team', 'teamId', 'team_id', 'joukkue'])
    if (teamId) return { kind: 'team', id: teamId }
    const playerId = firstQueryValue(mergedParams, ['player', 'playerId', 'player_id'])
    if (playerId) return { kind: 'player', id: playerId }

    const targetId = firstQueryValue(mergedParams, ['targetId'])
    if (targetId) return { kind: 'match', id: targetId }

    const sourceUrl = toResourceId(mergedParams.get('url'))
    if (sourceUrl) {
      const parsed = parseBasketSourceUrl(sourceUrl)
      if (parsed.kind !== 'none') return parsed
    }
  } catch {
    /* ignore malformed href */
  }

  return { kind: 'none' }
}

export function mapLineupPlayer(p: Record<string, unknown>, teamName: string, teamId?: string): BasketRosterPlayer {
  const first = str(p.first_name)
  const last = str(p.last_name)
  const full = `${first} ${last}`.trim() || str(p.player_name, 'Pelaaja')
  return {
    playerId: str(p.player_id),
    fullName: full,
    shirtNumber: str(p.shirt_number),
    teamId: teamId || (p.team_id ? str(p.team_id) : undefined),
    teamName,
    points: n(p.points ?? p.player_points ?? p.goals),
    assists: n(p.assists),
    fouls: n(p.fouls ?? p.personal_fouls),
    threePointers: n(p.three_pointers ?? p.threes ?? p['3p']),
    isCaptain: p.captain === 1 || p.captain === '1' || p.captain === true,
    birthYear: p.birthyear ? str(p.birthyear) : undefined,
  }
}

export function extractMatchLineups(m: Record<string, unknown>): { home: BasketRosterPlayer[]; away: BasketRosterPlayer[] } {
  const homeName = str(m.team_A_name, 'Koti')
  const awayName = str(m.team_B_name, 'Vieras')
  const homeId = m.team_A_id ? str(m.team_A_id) : undefined
  const awayId = m.team_B_id ? str(m.team_B_id) : undefined
  const home: BasketRosterPlayer[] = []
  const away: BasketRosterPlayer[] = []
  const seen = new Set<string>()

  const push = (p: Record<string, unknown>, side: 'home' | 'away' | '') => {
    if (!p || typeof p !== 'object') return
    const first = str(p.first_name)
    const last = str(p.last_name)
    const name = `${first} ${last}`.trim() || str(p.player_name)
    if (!name || name.toLowerCase() === 'ei pelaajia') return
    const tid = p.team_id ? str(p.team_id) : ''
    let which: 'home' | 'away' = side === 'away' ? 'away' : 'home'
    if (homeId && tid === homeId) which = 'home'
    else if (awayId && tid === awayId) which = 'away'
    const mapped = mapLineupPlayer(p, which === 'home' ? homeName : awayName, tid || (which === 'home' ? homeId : awayId))
    const key = mapped.playerId || `${which}:${mapped.fullName}:${mapped.shirtNumber}`
    if (seen.has(key)) return
    seen.add(key)
    ;(which === 'home' ? home : away).push(mapped)
  }

  if (Array.isArray(m.lineup_A)) (m.lineup_A as Record<string, unknown>[]).forEach((p: Record<string, unknown>) => push(p, 'home'))
  if (Array.isArray(m.lineup_B)) (m.lineup_B as Record<string, unknown>[]).forEach((p: Record<string, unknown>) => push(p, 'away'))
  if (Array.isArray(m.team_A_players)) (m.team_A_players as Record<string, unknown>[]).forEach((p: Record<string, unknown>) => push(p, 'home'))
  if (Array.isArray(m.team_B_players)) (m.team_B_players as Record<string, unknown>[]).forEach((p: Record<string, unknown>) => push(p, 'away'))
  if (Array.isArray(m.lineups)) (m.lineups as Record<string, unknown>[]).forEach((p: Record<string, unknown>) => push(p, ''))
  if (Array.isArray(m.players)) (m.players as Record<string, unknown>[]).forEach((p: Record<string, unknown>) => push(p, ''))
  return { home, away }
}

function leadersFromRosters(home: BasketRosterPlayer[], away: BasketRosterPlayer[]): BasketPlayerLeader[] {
  return [...home, ...away]
    .map((p) => ({
      playerId: p.playerId || undefined,
      playerName: p.fullName,
      shirtNumber: p.shirtNumber,
      teamName: p.teamName,
      points: p.points,
      threePointers: p.threePointers,
      fouls: p.fouls,
    }))
    .sort((a, b) => b.points - a.points || b.threePointers - a.threePointers)
}

export async function fetchBasketTeamRoster(teamId: string): Promise<BasketRosterPlayer[]> {
  if (!teamId) return []
  const data = await basketGet(`getTeam?team_id=${encodeURIComponent(teamId)}&players=1`)
  const t = data?.team as Record<string, unknown> | undefined
  if (!t || !Array.isArray(t.players)) return []
  const teamName = str(t.team_name)
  return (t.players as Record<string, unknown>[]).map((p: Record<string, unknown>) => mapLineupPlayer(p, teamName, str(t.team_id || teamId)))
}

export function mapMatchFixture(m: Record<string, unknown>, selectedTeamId?: string): BasketTeamFixture {
  const rawDate = str(m.date)
  const rawTime = str(m.time)
  const rawCat = str(m.category_name)
  let scoreHome = m.fs_A != null && m.fs_A !== '' ? Number(m.fs_A) : undefined
  let scoreAway = m.fs_B != null && m.fs_B !== '' ? Number(m.fs_B) : undefined
  const st = str(m.status).toLowerCase()
  const live = st.includes('live') || st === '2'
  const zeroZero = scoreHome === 0 && scoreAway === 0
  if (!live && zeroZero && (isKickoffUpcoming(rawDate, rawTime) || !rawDate)) {
    scoreHome = undefined
    scoreAway = undefined
  }
  const hasScore = scoreHome !== undefined && scoreAway !== undefined
  const homeId = str(m.team_A_id)
  const isHome = selectedTeamId ? homeId === selectedTeamId : true
  const ownScore = hasScore ? (isHome ? scoreHome : scoreAway) : undefined
  const oppScore = hasScore ? (isHome ? scoreAway : scoreHome) : undefined

  return {
    matchId: str(m.match_id),
    date: rawDate,
    time: rawTime,
    homeTeam: str(m.team_A_name, 'Koti'),
    awayTeam: str(m.team_B_name, 'Vieras'),
    homeTeamId: m.team_A_id ? str(m.team_A_id) : undefined,
    awayTeamId: m.team_B_id ? str(m.team_B_id) : undefined,
    score: hasScore ? `${scoreHome}–${scoreAway}` : undefined,
    scoreHome,
    scoreAway,
    isHome,
    isWin: ownScore !== undefined && oppScore !== undefined ? ownScore > oppScore : undefined,
    isDraw: ownScore !== undefined && oppScore !== undefined ? ownScore === oppScore : undefined,
    isLoss: ownScore !== undefined && oppScore !== undefined ? ownScore < oppScore : undefined,
    venueName: str(m.venue_name, 'Kenttä'),
    categoryName: rawCat,
    competitionId: m.competition_id ? str(m.competition_id) : undefined,
    categoryId: m.category_id ? str(m.category_id) : undefined,
    status: str(m.status),
    seasonYear: getSeasonYear(rawDate),
    seasonHalf: determineSeasonHalf(rawDate, rawCat),
  }
}

async function fetchMatchesByPath(path: string, selectedTeamId?: string): Promise<BasketTeamFixture[]> {
  const data = await basketGet(path)
  if (!Array.isArray(data?.matches)) return []
  return (data.matches as Record<string, unknown>[]).slice(0, 40).map((m: Record<string, unknown>) => mapMatchFixture(m, selectedTeamId))
}

export async function fetchBasketMatch(matchId: string): Promise<BasketMatchDetail | null> {
  try {
    const data = await basketGet(`getMatch?match_id=${encodeURIComponent(matchId)}`)
    if (!data?.match || typeof data.match !== 'object') return null

    const m = data.match as Record<string, unknown>

    // Quarters calculation
    const quarters: BasketQuarterScore[] = [
      { quarter: 1, scoreHome: Number(m.p1s_A || 0), scoreAway: Number(m.p1s_B || 0) },
      { quarter: 2, scoreHome: Number(m.p2s_A || 0), scoreAway: Number(m.p2s_B || 0) },
      { quarter: 3, scoreHome: Number(m.p3s_A || 0), scoreAway: Number(m.p3s_B || 0) },
      { quarter: 4, scoreHome: Number(m.p4s_A || 0), scoreAway: Number(m.p4s_B || 0) },
    ]

    const hasOvertime = Boolean(m.p5s_A || m.p5s_B)
    const overtimeScore = hasOvertime
      ? { scoreHome: Number(m.p5s_A || 0), scoreAway: Number(m.p5s_B || 0) }
      : undefined

    const teamFoulsHome = Number(m.live_fouls_A || 0)
    const teamFoulsAway = Number(m.live_fouls_B || 0)

    const lineups = extractMatchLineups(m)
    const homeSeasonRoster =
      !lineups.home.length && m.team_A_id ? await fetchBasketTeamRoster(String(m.team_A_id)) : []
    const awaySeasonRoster =
      !lineups.away.length && m.team_B_id ? await fetchBasketTeamRoster(String(m.team_B_id)) : []
    const leaders: BasketPlayerLeader[] = leadersFromRosters(lineups.home, lineups.away)

    const date = String(m.date || '')
    const time = String(m.time || '').replace(/:00$/, '').slice(0, 5)
    const st = String(m.status || '').toLowerCase()
    const live = st === 'live' || st.includes('live') || st === '2' || String(m.time || '').includes("'")
    const rawA = m.fs_A != null && m.fs_A !== '' ? Number(m.fs_A) : Number.NaN
    const rawB = m.fs_B != null && m.fs_B !== '' ? Number(m.fs_B) : Number.NaN
    const qHome = quarters.reduce((acc, q) => acc + q.scoreHome, 0)
    const qAway = quarters.reduce((acc, q) => acc + q.scoreAway, 0)
    const a = Number.isFinite(rawA) ? rawA : qHome
    const b = Number.isFinite(rawB) ? rawB : qAway
    const zeroZero = a === 0 && b === 0
    const kickoffFuture = isKickoffUpcoming(date, time)
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Helsinki' })
    const phase: BasketMatchDetail['phase'] = live
      ? 'live'
      : zeroZero && (kickoffFuture || date >= today || date === '')
        ? 'upcoming'
        : 'played'
    const scoreHome = phase === 'upcoming' ? 0 : a
    const scoreAway = phase === 'upcoming' ? 0 : b

    return {
      matchId: String(m.match_id || matchId),
      matchNumber: m.match_number ? String(m.match_number) : undefined,
      competitionName: String(m.competition_name || 'Koripalloliitto / Eteläinen alue'),
      categoryName: String(m.category_name || ''),
      competitionId: m.competition_id ? String(m.competition_id) : undefined,
      categoryId: m.category_id ? String(m.category_id) : undefined,
      groupId: m.group_id ? String(m.group_id) : undefined,
      date,
      time,
      venueName: String(m.venue_name || 'Pelihalli'),
      venueLat: m.venue_lat ? Number(m.venue_lat) : undefined,
      venueLon: m.venue_lon ? Number(m.venue_lon) : undefined,
      homeTeamName: String(m.team_A_name || 'Koti'),
      awayTeamName: String(m.team_B_name || 'Vieras'),
      homeTeamId: m.team_A_id ? String(m.team_A_id) : undefined,
      awayTeamId: m.team_B_id ? String(m.team_B_id) : undefined,
      scoreHome,
      scoreAway,
      isLive: phase === 'live',
      phase,
      referee1: m.referee_1_name ? String(m.referee_1_name) : undefined,
      referee2: m.referee_2_name ? String(m.referee_2_name) : undefined,
      spectators: m.attendance ? Number(m.attendance) : undefined,
      playingTimeMin: m.playing_time_min ? Number(m.playing_time_min) : 40,
      quarters,
      overtimeScore,
      teamFoulsHome,
      teamFoulsAway,
      isHomeBonusFreeThrow: teamFoulsHome >= 5,
      isAwayBonusFreeThrow: teamFoulsAway >= 5,
      leaders,
      homeRoster: lineups.home,
      awayRoster: lineups.away,
      homeSeasonRoster,
      awaySeasonRoster,
      lineupNotice: m.lineup_notice ? String(m.lineup_notice) : undefined,
    }
  } catch (err) {
    console.error('[BASKET_API]', err)
    return null
  }
}

export async function fetchBasketMatchesByTeam(teamId: string): Promise<BasketTeamFixture[]> {
  if (!teamId) return []
  try {
    return await fetchMatchesByPath(`getMatches?team_id=${encodeURIComponent(teamId)}`, teamId)
  } catch (err) {
    console.error('[BASKET_FIXTURES_API]', err)
    return []
  }
}

export async function fetchBasketMatchesByPlayer(playerId: string): Promise<BasketTeamFixture[]> {
  if (!playerId) return []
  try {
    const fromMatches = await fetchMatchesByPath(`getMatches?player_id=${encodeURIComponent(playerId)}`)
    if (fromMatches.length > 0) return fromMatches

    const playerData = await basketGet(`getPlayer?player_id=${encodeURIComponent(playerId)}`)
    const playerObj = playerData?.player as Record<string, unknown> | undefined
    const candidates = [
      playerData?.matches,
      playerObj?.matches,
      playerObj?.fixtures,
      playerData?.fixtures,
    ]
    for (const list of candidates) {
      if (Array.isArray(list)) {
        return (list as Record<string, unknown>[]).slice(0, 40).map((m: Record<string, unknown>) => mapMatchFixture(m))
      }
    }
    return []
  } catch (err) {
    console.error('[BASKET_PLAYER_MATCHES_API]', err)
    return []
  }
}

export async function fetchBasketTeamFixtures(teamId: string): Promise<BasketTeamFixture[]> {
  return fetchBasketMatchesByTeam(teamId)
}

/** @deprecated Use fetchBasketGroup standings. Kept for offline fallback only. */
export function fetchBasketStandings(): BasketStandingRow[] {
  return []
}

export function determineSeasonHalf(dateStr?: string, categoryName?: string): 'syksy' | 'kevat' {
  const cat = (categoryName || '').toUpperCase()
  if (cat.includes('SYKSY') || cat.includes('AUTUMN')) return 'syksy'
  if (cat.includes('KEVÄT') || cat.includes('KEVAT') || cat.includes('SPRING')) return 'kevat'
  if (dateStr && dateStr.length >= 7) {
    const month = parseInt(dateStr.slice(5, 7), 10)
    if (month >= 8 && month <= 12) return 'syksy'
    if (month >= 1 && month <= 7) return 'kevat'
  }
  return 'syksy'
}

export function getSeasonYear(dateStr?: string): string {
  if (dateStr && dateStr.length >= 4) return dateStr.slice(0, 4)
  return '2026'
}

export function normalizeSearch(q: string): string {
  return q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function parseBasketQuery(raw: string):
  | { kind: 'match'; id: string }
  | { kind: 'team'; id: string }
  | { kind: 'player'; id: string }
  | { kind: 'club'; id: string }
  | { kind: 'text'; q: string } {
  const val = raw.trim()
  if (!val) return { kind: 'text', q: '' }

  const fromLocation = parseBasketSourceUrl(val)
  if (fromLocation.kind !== 'none') return fromLocation

  const matchUrl = val.match(/(?:ottelu|match(?:_id)?)[=/](\d+)/i)
  if (matchUrl) return { kind: 'match', id: matchUrl[1] }

  const teamUrl = val.match(/(?:joukkue|team(?:_id)?)[=/](\d+)/i)
  if (teamUrl) return { kind: 'team', id: teamUrl[1] }

  const playerUrl = val.match(/(?:pelaaja|player(?:_id)?)[=/](\d+)/i)
  if (playerUrl) return { kind: 'player', id: playerUrl[1] }

  const clubUrl = val.match(/(?:seura|club(?:_id)?)[=/](\d+)/i)
  if (clubUrl) return { kind: 'club', id: clubUrl[1] }

  if (/^\d{4,8}$/.test(val)) return { kind: 'match', id: val }

  return { kind: 'text', q: val }
}

export function pickCurrentGroup(groups: BasketSeasonGroup[]): BasketSeasonGroup | null {
  if (!groups.length) return null
  const published = groups.find((g) => g.competitionStatus === 'published')
  if (published) return published
  const current = groups.find((g) => g.isCurrent)
  if (current) return current
  const season2026 = groups.find((g) => (g.seasonId || '').includes('2026'))
  return season2026 || groups[0]
}

export function lastFormForTeam(teamId: string, matches: BasketGroupMatch[]): ('V' | 'T' | 'H')[] {
  return matches
    .filter(
      (m) =>
        m.scoreHome != null &&
        m.scoreAway != null &&
        (m.homeTeamId === teamId || m.awayTeamId === teamId),
    )
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
    .slice(0, 5)
    .map((m) => {
      if (m.scoreHome === m.scoreAway) return 'T' as const
      const home = m.homeTeamId === teamId
      const won = home ? m.scoreHome! > m.scoreAway! : m.scoreAway! > m.scoreHome!
      return won ? ('V' as const) : ('H' as const)
    })
    .reverse()
}

export function mapGroupTeamsToStandings(
  teams: BasketGroupTeam[],
  matches: BasketGroupMatch[] = [],
): BasketStandingRow[] {
  return [...teams]
    .sort((a, b) => a.rank - b.rank || b.points - a.points)
    .map((t) => ({
      rank: t.rank || 0,
      teamId: t.teamId,
      teamName: t.teamName,
      matchesPlayed: t.played,
      wins: t.wins,
      draws: t.draws,
      losses: t.losses,
      pointsFor: t.goalsFor,
      pointsAgainst: t.goalsAgainst,
      diff: t.diff,
      totalPoints: t.points,
      form: lastFormForTeam(t.teamId, matches),
    }))
}

export async function fetchBasketTeamProfile(teamId: string): Promise<BasketTeamProfile | null> {
  if (!teamId) return null
  try {
    const data = await basketGetCached(`getTeam?team_id=${encodeURIComponent(teamId)}`, 60 * 1000)
    const t = data?.team as Record<string, unknown> | undefined
    if (!t) return null

    const rawPlayers = Array.isArray(t.players) ? (t.players as Record<string, unknown>[]) : []
    const teamName = str(t.team_name, 'Koripallojoukkue')
    const players = rawPlayers.map((p) => mapLineupPlayer(p, teamName, str(t.team_id || teamId)))

    const rawGroups = Array.isArray(t.groups) ? (t.groups as Record<string, unknown>[]) : []
    const groups: BasketSeasonGroup[] = rawGroups.map((g) => ({
      competitionId: str(g.competition_id),
      competitionName: str(g.competition_name),
      categoryId: str(g.category_id),
      categoryName: str(g.category_name),
      groupId: str(g.group_id),
      groupName: str(g.group_name),
      seasonId: g.competition_season ? str(g.competition_season) : undefined,
      isCurrent: g.group_current === '1' || g.competition_status === 'published',
      competitionStatus: g.competition_status ? str(g.competition_status) : undefined,
    }))

    const fixtures = await fetchBasketMatchesByTeam(teamId)
    const published = groups.find((g) => g.competitionStatus === 'published')
    const categoryName =
      published?.categoryName ||
      groups[0]?.categoryName ||
      str((t.primary_category as Record<string, unknown> | undefined)?.category_name)

    return {
      teamId: str(t.team_id || teamId),
      teamName,
      clubName: str(t.club_name) || undefined,
      clubId: t.club_id ? str(t.club_id) : undefined,
      clubCrest: (t.club_crest as string) || (t.crest as string) || undefined,
      categoryName,
      players,
      fixtures,
      groups,
    }
  } catch (err) {
    console.error('[BASKET_PROFILE_API]', err)
    return null
  }
}

export async function fetchBasketCompetitions(): Promise<BasketCompetition[]> {
  const data = await basketGetCached('getCompetitions?current=1', 5 * 60 * 1000)
  const list = Array.isArray(data?.competitions) ? (data!.competitions as Record<string, unknown>[]) : []
  return list.map((c) => ({
    competitionId: str(c.competition_id),
    competitionName: str(c.competition_name),
    seasonId: str(c.season_id),
    status: str(c.competition_status),
    startDate: c.competition_start_date ? str(c.competition_start_date) : undefined,
    endDate: c.competition_end_date ? str(c.competition_end_date) : undefined,
    organiser: c.organiser_name ? str(c.organiser_name) : str(c.organiser) || undefined,
    locationName: c.competition_location_name ? str(c.competition_location_name) : undefined,
  }))
}

export async function fetchBasketCategories(competitionId: string): Promise<BasketCategory[]> {
  const data = await basketGetCached(`getCategories?competition_id=${encodeURIComponent(competitionId)}`)
  const list = Array.isArray(data?.categories) ? (data!.categories as Record<string, unknown>[]) : []
  return list.map((c) => ({
    categoryId: str(c.category_id),
    categoryName: str(c.category_name),
    competitionId: str(c.competition_id || competitionId),
    competitionName: str(c.competition_name),
    groupCount: c.group_count != null ? n(c.group_count) : undefined,
    teamCount: c.team_count != null ? n(c.team_count) : undefined,
    ageGroup: c.category_age_group ? str(c.category_age_group) : undefined,
    gender: c.category_gender_fi ? str(c.category_gender_fi) : str(c.category_gender) || undefined,
  }))
}

export async function fetchBasketGroups(competitionId: string, categoryId: string): Promise<BasketGroupSummary[]> {
  const data = await basketGetCached(
    `getGroups?competition_id=${encodeURIComponent(competitionId)}&category_id=${encodeURIComponent(categoryId)}`,
  )
  const list = Array.isArray(data?.groups) ? (data!.groups as Record<string, unknown>[]) : []
  return list.map((g) => ({
    groupId: str(g.group_id),
    groupName: str(g.group_name),
    competitionId: str(g.competition_id || competitionId),
    competitionName: str(g.competition_name),
    categoryId: str(g.category_id || categoryId),
    categoryName: str(g.category_name),
    teamCount: Array.isArray(g.teams) ? g.teams.length : n(g.team_count),
  }))
}

function mapGroupTeam(t: Record<string, unknown>): BasketGroupTeam {
  return {
    teamId: str(t.team_id),
    teamName: str(t.team_name),
    clubId: t.club_id ? str(t.club_id) : undefined,
    crest: (t.crest as string) || undefined,
    rank: n(t.current_standing || t.final_group_standing),
    points: n(t.points),
    played: n(t.matches_played),
    wins: n(t.matches_won),
    draws: n(t.matches_tied),
    losses: n(t.matches_lost),
    goalsFor: n(t.goals_for),
    goalsAgainst: n(t.goals_against),
    diff: n(t.goals_diff, n(t.goals_for) - n(t.goals_against)),
  }
}

function mapGroupMatch(m: Record<string, unknown>): BasketGroupMatch {
  const scoreHome = m.fs_A != null && m.fs_A !== '' ? n(m.fs_A) : undefined
  const scoreAway = m.fs_B != null && m.fs_B !== '' ? n(m.fs_B) : undefined
  const live = str(m.status).toLowerCase().includes('live') || str(m.status) === '2'
  const zeroZero = scoreHome === 0 && scoreAway === 0
  const upcoming = !live && zeroZero && isKickoffUpcoming(str(m.date), str(m.time))
  return {
    matchId: str(m.match_id),
    date: str(m.date),
    time: str(m.time),
    homeTeam: str(m.team_A_name, 'Koti'),
    awayTeam: str(m.team_B_name, 'Vieras'),
    homeTeamId: numericId(m.team_A_id),
    awayTeamId: numericId(m.team_B_id),
    scoreHome: upcoming ? undefined : scoreHome,
    scoreAway: upcoming ? undefined : scoreAway,
    status: str(m.status),
    venueName: m.venue_name ? str(m.venue_name) : undefined,
  }
}

export async function fetchBasketGroup(
  competitionId: string,
  categoryId: string,
  groupId: string,
): Promise<BasketGroupDetail | null> {
  const data = await basketGetCached(
    `getGroup?competition_id=${encodeURIComponent(competitionId)}&category_id=${encodeURIComponent(categoryId)}&group_id=${encodeURIComponent(groupId)}`,
    3 * 60 * 1000,
  )
  const g = data?.group as Record<string, unknown> | undefined
  if (!g) return null
  const teams = Array.isArray(g.teams) ? (g.teams as Record<string, unknown>[]).map(mapGroupTeam) : []
  const matches = Array.isArray(g.matches) ? (g.matches as Record<string, unknown>[]).map(mapGroupMatch) : []
  return {
    groupId: str(g.group_id || groupId),
    groupName: str(g.group_name),
    competitionId: str(g.competition_id || competitionId),
    competitionName: str(g.competition_name),
    categoryId: str(g.category_id || categoryId),
    categoryName: str(g.category_name),
    teams,
    matches,
  }
}

export async function fetchBasketClubs(): Promise<BasketClubSummary[]> {
  const data = await basketGetCached('getClubs', 5 * 60 * 1000)
  const list = Array.isArray(data?.clubs) ? (data!.clubs as Record<string, unknown>[]) : []
  return list
    .filter((c) => str(c.archived) !== '1' && str(c.name) && !str(c.name).startsWith('#'))
    .map((c) => ({
      clubId: str(c.club_id),
      name: str(c.name),
      abbreviation: str(c.abbrevation || c.abbreviation),
      cityName: str(c.city_name),
      crest: (c.crest as string) || undefined,
      region: c.region ? str(c.region) : undefined,
    }))
}

function mapClubTeam(t: Record<string, unknown>): BasketClubTeam {
  const pc = (t.primary_category as Record<string, unknown>) || {}
  return {
    teamId: str(t.team_id),
    teamName: str(t.team_name || pc.category_team_name),
    status: str(t.status, 'active'),
    categoryName: str(pc.category_name),
    competitionName: str(pc.competition_name || pc.tournament_name),
    competitionId: pc.competition_id ? str(pc.competition_id) : undefined,
    categoryId: pc.category_id ? str(pc.category_id) : undefined,
    groupId: pc.group_id ? str(pc.group_id) : undefined,
    season: pc.competition_season ? str(pc.competition_season) : undefined,
    venueName: t.home_venue_name ? str(t.home_venue_name) : undefined,
  }
}

export async function fetchBasketClub(clubId: string): Promise<BasketClubDetail | null> {
  const data = await basketGetCached(`getClub?club_id=${encodeURIComponent(clubId)}`)
  const c = data?.club as Record<string, unknown> | undefined
  if (!c) return null
  const teams = Array.isArray(c.teams) ? (c.teams as Record<string, unknown>[]).map(mapClubTeam) : []
  return {
    clubId: str(c.club_id || clubId),
    name: str(c.name),
    abbreviation: str(c.abbrevation || c.abbreviation),
    cityName: str(c.city_name),
    crest: (c.crest as string) || undefined,
    www: c.www ? str(c.www) : undefined,
    districtName: c.district_name ? str(c.district_name) : undefined,
    venueName: c.home_venue_name ? str(c.home_venue_name) : undefined,
    teams,
  }
}

function pickNum(obj: Record<string, unknown> | undefined, keys: string[], fallback = 0): number {
  if (!obj) return fallback
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== '') {
      const value = n(obj[k], Number.NaN)
      if (Number.isFinite(value)) return value
    }
  }
  return fallback
}

function mapPlayerMatch(m: Record<string, unknown>): BasketPlayerMatch {
  const scoreHome = m.fs_A != null && m.fs_A !== '' ? n(m.fs_A) : undefined
  const scoreAway = m.fs_B != null && m.fs_B !== '' ? n(m.fs_B) : undefined
  const stats = (m.stats || m.player_stats || m.statistics || {}) as Record<string, unknown>
  const points = pickNum(m, ['player_points', 'points', 'pts'], pickNum(stats, ['points', 'pts']))
  const assists = pickNum(m, ['player_assists', 'assists', 'ast'], pickNum(stats, ['assists', 'ast']))
  const fouls = pickNum(m, ['fouls', 'personal_fouls', 'pf'], pickNum(stats, ['fouls', 'pf']))
  const threePointers = pickNum(m, ['three_pointers', 'threes', '3p'], pickNum(stats, ['three_pointers', '3p']))
  return {
    matchId: str(m.match_id),
    date: str(m.date),
    time: str(m.time),
    status: str(m.status),
    homeTeam: str(m.team_A_name, 'Koti'),
    awayTeam: str(m.team_B_name, 'Vieras'),
    homeTeamId: numericId(m.team_A_id),
    awayTeamId: numericId(m.team_B_id),
    teamId: numericId(m.team_id),
    scoreHome,
    scoreAway,
    categoryName: str(m.category_name),
    competitionName: str(m.competition_name),
    seasonId: m.season_id ? str(m.season_id) : undefined,
    points,
    assists,
    fouls,
    threePointers,
    venueName: m.venue_name ? str(m.venue_name) : undefined,
  }
}

export async function fetchBasketPlayer(playerId: string): Promise<BasketPlayerProfile | null> {
  const data = await basketGetCached(`getPlayer?player_id=${encodeURIComponent(playerId)}`, 5 * 60 * 1000)
  const p = data?.player as Record<string, unknown> | undefined
  if (!p) return null
  const teams: BasketPlayerTeam[] = (Array.isArray(p.teams) ? (p.teams as Record<string, unknown>[]) : []).map((t) => {
    const pc = (t.primary_category as Record<string, unknown>) || {}
    return {
      teamId: str(t.team_id),
      teamName: str(t.team_name),
      clubName: t.club_name ? str(t.club_name) : undefined,
      categoryName: pc.category_name ? str(pc.category_name) : undefined,
      competitionName: pc.competition_name ? str(pc.competition_name) : undefined,
      shirtNumber: t.shirt_number ? str(t.shirt_number) : undefined,
    }
  })
  const matches = (Array.isArray(p.matches) ? (p.matches as Record<string, unknown>[]) : []).map(mapPlayerMatch)
  const upcoming = (Array.isArray(p.upcoming) ? (p.upcoming as Record<string, unknown>[]) : []).map(mapPlayerMatch)
  return {
    playerId: str(p.player_id || playerId),
    firstName: str(p.first_name),
    lastName: str(p.last_name),
    fullName: `${p.first_name || ''} ${p.last_name || ''}`.trim() || `Pelaaja #${playerId}`,
    birthYear: p.birthyear ? str(p.birthyear) : undefined,
    age: p.age != null ? n(p.age) : undefined,
    clubId: p.club_id ? str(p.club_id) : undefined,
    clubName: p.club_name ? str(p.club_name) : undefined,
    imageUrl: (p.img_url as string) || undefined,
    ageGroup: p.age_group ? str(p.age_group) : undefined,
    teams,
    matches,
    upcoming,
  }
}

export async function searchDiscovery(query: string): Promise<DiscoveryHit[]> {
  const parsed = parseBasketQuery(query)
  const hits: DiscoveryHit[] = []

  if (parsed.kind === 'match') {
    hits.push({ kind: 'match', id: parsed.id, title: `Ottelu #${parsed.id}`, subtitle: 'Avaa ottelu' })
    hits.push({ kind: 'team', id: parsed.id, title: `Joukkue #${parsed.id}`, subtitle: 'Kokeile joukkueena' })
    hits.push({ kind: 'player', id: parsed.id, title: `Pelaaja #${parsed.id}`, subtitle: 'Kokeile pelaajana' })
    return hits
  }
  if (parsed.kind === 'team') {
    hits.push({ kind: 'team', id: parsed.id, title: `Joukkue #${parsed.id}`, subtitle: 'Avaa joukkue' })
    return hits
  }
  if (parsed.kind === 'player') {
    hits.push({ kind: 'player', id: parsed.id, title: `Pelaaja #${parsed.id}`, subtitle: 'Avaa pelaaja' })
    return hits
  }
  if (parsed.kind === 'club') {
    hits.push({ kind: 'club', id: parsed.id, title: `Seura #${parsed.id}`, subtitle: 'Avaa seura' })
    return hits
  }

  const q = normalizeSearch(parsed.q)
  if (q.length < 2) return []

  const clubs = await fetchBasketClubs()
  const tokens = q.split(' ').filter(Boolean)
  const clubHits = clubs.filter((c) => {
    const hay = normalizeSearch(`${c.name} ${c.abbreviation} ${c.cityName}`)
    return tokens.every((t) => hay.includes(t)) || hay.includes(q)
  })

  const topClubs = clubHits.slice(0, 8)
  for (const c of topClubs) {
    hits.push({
      kind: 'club',
      id: c.clubId,
      title: c.abbreviation || c.name,
      subtitle: [c.cityName, 'Seura'].filter(Boolean).join(' · '),
      crest: c.crest,
    })
  }

  const clubsToExpand = (
    topClubs.length > 0
      ? topClubs
      : clubs.filter((c) => {
          const hay = normalizeSearch(`${c.name} ${c.abbreviation}`)
          return tokens.some((t) => t.length >= 3 && hay.includes(t))
        })
  ).slice(0, 5)

  const clubDetails = await Promise.all(clubsToExpand.map((c) => fetchBasketClub(c.clubId)))
  const seenTeams = new Set<string>()
  for (const detail of clubDetails) {
    if (!detail) continue
    const active = detail.teams.filter((t) => t.status === 'active')
    const pool = active.length ? active : detail.teams
    for (const t of pool) {
      const hay = normalizeSearch(`${t.teamName} ${t.categoryName} ${detail.name}`)
      const matchesAll = tokens.every((tok) => hay.includes(tok))
      if (!matchesAll && topClubs.length === 0) continue
      if (!matchesAll && tokens.length > 1) {
        const last = tokens[tokens.length - 1]
        if (!normalizeSearch(t.teamName).includes(last) && !hay.includes(last)) continue
      }
      if (seenTeams.has(t.teamId)) continue
      seenTeams.add(t.teamId)
      hits.push({
        kind: 'team',
        id: t.teamId,
        title: t.teamName,
        subtitle: [t.categoryName, t.season || detail.name].filter(Boolean).join(' · '),
      })
      if (hits.filter((h) => h.kind === 'team').length >= 12) break
    }
    if (hits.filter((h) => h.kind === 'team').length >= 12) break
  }

  const comps = await fetchBasketCompetitions().catch(() => [])
  const looksLikePerson = tokens.length >= 2 && tokens.every((t) => /^[a-zåäö]{2,}$/i.test(t))
  if (!looksLikePerson) {
    for (const c of comps) {
      const hay = normalizeSearch(`${c.competitionName} ${c.organiser || ''} ${c.locationName || ''}`)
      if (tokens.every((t) => hay.includes(t)) || hay.includes(q)) {
        hits.push({
          kind: 'competition',
          id: c.competitionId,
          title: c.competitionName,
          subtitle: c.seasonId,
        })
      }
    }

    const catSources = comps
      .filter((c) => (c.competitionId || '').includes('2026') || (c.seasonId || '').includes('2026'))
      .slice(0, 4)
    const catLists = await Promise.all(catSources.map((c) => fetchBasketCategories(c.competitionId).catch(() => [])))
    for (const list of catLists) {
      for (const cat of list) {
        if (!normalizeSearch(cat.categoryName).includes(q) && !tokens.some((t) => normalizeSearch(cat.categoryName).includes(t))) {
          continue
        }
        hits.push({
          kind: 'category',
          id: `${cat.competitionId}::${cat.categoryId}`,
          title: cat.categoryName,
          subtitle: cat.competitionName,
        })
      }
    }
  }

  const playerTeamIds = ['20053', ...[...seenTeams].slice(0, 4)]
  const profiles = await Promise.all(
    [...new Set(playerTeamIds)].slice(0, 8).map((id) => fetchBasketTeamProfile(id).catch(() => null)),
  )
  const seenPlayers = new Set<string>()
  for (const team of profiles) {
    if (!team) continue
    for (const p of team.players) {
      const hay = normalizeSearch(p.fullName)
      if (!hay.includes(q) && !tokens.some((t) => hay.includes(t))) continue
      if (!p.playerId || seenPlayers.has(p.playerId)) continue
      seenPlayers.add(p.playerId)
      hits.push({
        kind: 'player',
        id: p.playerId,
        title: p.fullName,
        subtitle: team.teamName,
      })
    }
  }

  return hits.slice(0, 30)
}


