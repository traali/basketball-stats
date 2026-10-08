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
import {
  classifyMatch,
  forfeitText,
  periodScores,
  scoreValue,
  visibleScore,
  winnerSide,
  type MatchState,
} from '../utils/matchStatus.ts'

const API_BASE = 'https://koripallo-api.torneopal.net/taso/rest'
const TASO_PROXY = 'https://taso-proxy.sakkoja.workers.dev/basket'
const BASKET_KEY = 'df8e84j9xtdz269euy3h'

/**
 * Thrown when Basket.fi could not be read (HTTP 403, proxy error envelope,
 * network error) or answered "not found". Pages must show "Haku epäonnistui"
 * for a failure — never "no games".
 */
export class BasketApiError extends Error {
  readonly path: string
  readonly notFound: boolean
  readonly attempts: string[]
  constructor(path: string, attempts: string[], notFound = false) {
    super(notFound ? `Basket.fi: not found (${path})` : `Basket.fi call failed (${path}): ${attempts.join('; ')}`)
    this.name = 'BasketApiError'
    this.path = path
    this.notFound = notFound
    this.attempts = attempts
  }
}

export function isNotFound(err: unknown): boolean {
  return err instanceof BasketApiError && err.notFound
}

/**
 * Order: direct Torneopal (the browser sends the page origin as Referer, which
 * Torneopal accepts), then a cache-busted direct call (Torneopal's CDN can
 * cache a 403 for a URL), then the shared taso-proxy. On 2026-10-08 the proxy
 * answered HTTP 200 with {"call":{"status":"error","http":403},"error":"upstream"}
 * for every basket call, so a 200 is never trusted without call.status "ok".
 */
export function basketUrls(path: string, now = Date.now()): string[] {
  return [
    `${API_BASE}/${path}`,
    `${API_BASE}/${path}${path.includes('?') ? '&' : '?'}_cb=${now}`,
    `${TASO_PROXY}/${path}`,
  ]
}

async function basketGet(path: string): Promise<Record<string, unknown>> {
  const attempts: string[] = []
  for (const url of basketUrls(path)) {
    const label = url.includes('taso-proxy') ? 'taso-proxy' : url.includes('_cb=') ? 'torneopal+cb' : 'torneopal'
    try {
      const res = await fetch(url, {
        headers: url.includes('taso-proxy') ? { Accept: 'application/json' } : { Accept: `json/${BASKET_KEY}` },
        referrerPolicy: 'strict-origin-when-cross-origin',
      })
      if (!res.ok) {
        attempts.push(`${label} HTTP ${res.status}`)
        continue
      }
      const body = await res.text()
      const at = body.indexOf('{"call"')
      const i = at >= 0 ? at : body.indexOf('{')
      if (i < 0) {
        attempts.push(`${label} empty body`)
        continue
      }
      const data = JSON.parse(body.slice(i)) as Record<string, unknown> & {
        call?: { status?: string; http?: number; error_message?: string }
        error?: string
      }
      const status = String(data?.call?.status || '').toLowerCase()
      if (status === 'ok') return data
      const message = String(data?.call?.error_message || data.error || status || 'no status')
      if (/not found/i.test(message)) throw new BasketApiError(path, [`${label} ${message}`], true)
      attempts.push(`${label} ${data?.call?.http ? `upstream ${data.call.http}` : message}`)
    } catch (err) {
      if (err instanceof BasketApiError) throw err
      attempts.push(`${label} ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  throw new BasketApiError(path, attempts)
}

type CacheEntry = { at: number; data: Record<string, unknown>; ttl: number }
const memCache = new Map<string, CacheEntry>()

async function basketGetCached(path: string, ttlMs = 5 * 60 * 1000): Promise<Record<string, unknown>> {
  const hit = memCache.get(path)
  if (hit && Date.now() - hit.at < hit.ttl) return hit.data
  const data = await basketGet(path)
  memCache.set(path, { at: Date.now(), data, ttl: ttlMs })
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

function decimal(v: unknown): number | undefined {
  const s = str(v)
  if (!/^-?\d+(\.\d+)?$/.test(s)) return undefined
  const x = Number(s)
  return x === 0 ? undefined : x
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

export interface LineupStatOptions {
  /** track_scorers=1 on the game: lineup points/fouls were recorded. */
  stats?: boolean
  /** track_assists=1 on the game. Basket.fi games seen so far have 0. */
  assists?: boolean
  /** Three-pointers per player_id, counted from scoring events. */
  threes?: Map<string, number> | null
}

function statOrNull(v: unknown, enabled: boolean | undefined): number | null {
  if (!enabled) return null
  const x = scoreValue(v)
  return x === undefined ? null : x
}

export function mapLineupPlayer(
  p: Record<string, unknown>,
  teamName: string,
  teamId?: string,
  opts: LineupStatOptions = {},
): BasketRosterPlayer {
  const first = str(p.first_name)
  const last = str(p.last_name)
  const full = `${first} ${last}`.trim() || str(p.player_name, 'Pelaaja')
  const playerId = str(p.player_id)
  const captain = str(p.captain).toUpperCase()
  return {
    playerId,
    fullName: full,
    shirtNumber: str(p.shirt_number),
    teamId: teamId || (p.team_id ? str(p.team_id) : undefined),
    teamName,
    points: statOrNull(p.points, opts.stats),
    assists: statOrNull(p.assists, opts.stats && opts.assists),
    fouls: statOrNull(p.fouls, opts.stats),
    threePointers: opts.stats && opts.threes ? (opts.threes.get(playerId) ?? 0) : null,
    isCaptain: captain === 'C' || captain === '1' || p.captain === true,
    starter: str(p.start) === '1' ? true : undefined,
    birthYear: p.birthyear && /^\d{4}$/.test(str(p.birthyear)) ? str(p.birthyear) : undefined,
  }
}

/**
 * Three-pointers per player from TASO scoring events: code "maali",
 * description "<points> <home>-<away>". Returns null when the game has no
 * scoring events with players (then 3P is unknown, not 0).
 */
export function threesFromEvents(events: unknown): Map<string, number> | null {
  if (!Array.isArray(events)) return null
  const out = new Map<string, number>()
  let scoring = 0
  for (const e of events as Record<string, unknown>[]) {
    if (str(e?.code) !== 'maali' || !str(e.player_id)) continue
    scoring++
    const pts = Number(str(e.description).split(/\s+/)[0])
    if (pts === 3) out.set(str(e.player_id), (out.get(str(e.player_id)) || 0) + 1)
  }
  return scoring > 0 ? out : null
}

export function extractMatchLineups(
  m: Record<string, unknown>,
  opts?: LineupStatOptions,
): { home: BasketRosterPlayer[]; away: BasketRosterPlayer[] } {
  const statOpts: LineupStatOptions = opts ?? {
    stats: str(m.track_scorers) === '1' || m.track_scorers === undefined,
    assists: str(m.track_assists) === '1',
    threes: threesFromEvents(m.events),
  }
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
    const mapped = mapLineupPlayer(p, which === 'home' ? homeName : awayName, tid || (which === 'home' ? homeId : awayId), statOpts)
    const key = mapped.playerId || `${which}:${mapped.fullName}:${mapped.shirtNumber}`
    if (seen.has(key)) return
    seen.add(key)
    ;(which === 'home' ? home : away).push(mapped)
  }

  if (Array.isArray(m.lineup_A)) (m.lineup_A as Record<string, unknown>[]).forEach((p) => push(p, 'home'))
  if (Array.isArray(m.lineup_B)) (m.lineup_B as Record<string, unknown>[]).forEach((p) => push(p, 'away'))
  if (Array.isArray(m.lineups)) (m.lineups as Record<string, unknown>[]).forEach((p) => push(p, ''))
  return { home, away }
}

function leadersFromRosters(home: BasketRosterPlayer[], away: BasketRosterPlayer[]): BasketPlayerLeader[] {
  return [...home, ...away]
    .filter((p) => p.points !== null)
    .map((p) => ({
      playerId: p.playerId || undefined,
      playerName: p.fullName,
      shirtNumber: p.shirtNumber,
      teamName: p.teamName,
      points: p.points as number,
      threePointers: p.threePointers,
      fouls: p.fouls,
    }))
    .sort((a, b) => b.points - a.points || (b.threePointers ?? 0) - (a.threePointers ?? 0))
}

/** Season roster from getTeam. TASO leaves every stat field blank here, so none are mapped. */
export function mapTeamRoster(t: Record<string, unknown>, fallbackTeamId = ''): BasketRosterPlayer[] {
  if (!Array.isArray(t.players)) return []
  const teamName = str(t.team_name)
  return (t.players as Record<string, unknown>[]).map((p) => mapLineupPlayer(p, teamName, str(t.team_id || fallbackTeamId)))
}

export async function fetchBasketTeamRoster(teamId: string): Promise<BasketRosterPlayer[]> {
  if (!teamId) return []
  const data = await basketGetCached(`getTeam?team_id=${encodeURIComponent(teamId)}`, 60 * 1000)
  const t = data?.team as Record<string, unknown> | undefined
  if (!t) return []
  return mapTeamRoster(t, teamId)
}

export function mapMatchFixture(m: Record<string, unknown>, selectedTeamId?: string, now = new Date()): BasketTeamFixture {
  const rawDate = str(m.date)
  const rawTime = str(m.time)
  const rawCat = str(m.category_name)
  const state: MatchState = classifyMatch(m, now)
  const shown = visibleScore(m, state)
  const homeId = str(m.team_A_id)
  const awayId = str(m.team_B_id)
  const isHome = selectedTeamId ? homeId === selectedTeamId || awayId !== selectedTeamId : true
  const homeName = str(m.team_A_name, 'Koti')
  const awayName = str(m.team_B_name, 'Vieras')
  const winner = state === 'played' || state === 'forfeit' ? winnerSide(m) : undefined
  let isWin: boolean | undefined
  let isLoss: boolean | undefined
  if (state === 'played' && shown) {
    const own = isHome ? shown.home : shown.away
    const opp = isHome ? shown.away : shown.home
    isWin = own > opp
    isLoss = own < opp
  } else if (state === 'forfeit' && winner && selectedTeamId) {
    isWin = (winner === 'home') === isHome
    isLoss = !isWin
  }

  return {
    matchId: str(m.match_id),
    date: rawDate,
    time: rawTime,
    homeTeam: homeName,
    awayTeam: awayName,
    homeTeamId: homeId || undefined,
    awayTeamId: awayId || undefined,
    status: str(m.status),
    state,
    forfeitText: state === 'forfeit' ? forfeitText(homeName, awayName, m) : undefined,
    winnerSide: winner,
    season: m.competition_season ? str(m.competition_season) : undefined,
    groupId: m.group_id ? str(m.group_id) : undefined,
    score: shown ? `${shown.home}–${shown.away}` : undefined,
    scoreHome: shown?.home,
    scoreAway: shown?.away,
    isHome,
    isWin,
    isDraw: undefined,
    isLoss,
    venueName: str(m.venue_name),
    categoryName: rawCat,
    competitionId: m.competition_id ? str(m.competition_id) : undefined,
    categoryId: m.category_id ? str(m.category_id) : undefined,
    seasonYear: getSeasonYear(rawDate),
    seasonHalf: determineSeasonHalf(rawDate, rawCat),
  }
}

/** All rows TASO returns. getMatches?team_id= lists every season oldest-first, so never slice the head. */
async function fetchMatchesByPath(
  path: string,
  selectedTeamId?: string,
  keep: (m: Record<string, unknown>) => boolean = () => true,
): Promise<BasketTeamFixture[]> {
  const data = await basketGet(path)
  if (!Array.isArray(data?.matches)) return []
  return (data.matches as Record<string, unknown>[]).filter(keep).map((m) => mapMatchFixture(m, selectedTeamId))
}

/** TASO can answer a filtered query with unrelated rows; keep only this team's games. */
export function isTeamMatch(m: Record<string, unknown>, teamId: string): boolean {
  return str(m.team_A_id) === teamId || str(m.team_B_id) === teamId
}

export function mapMatchDetail(m: Record<string, unknown>, fallbackId = '', now = new Date()): BasketMatchDetail {
  const state = classifyMatch(m, now)
  const shown = visibleScore(m, state)
  const showPeriods = state === 'played' || state === 'live'
  const quarters: BasketQuarterScore[] = showPeriods ? periodScores(m) : []
  const statsTracked = str(m.track_scorers) === '1'
  const lineups = extractMatchLineups(m, {
    stats: statsTracked,
    assists: str(m.track_assists) === '1',
    threes: threesFromEvents(m.events),
  })
  const leaders = state === 'played' || state === 'live' ? leadersFromRosters(lineups.home, lineups.away) : []
  const homeName = str(m.team_A_name, 'Koti')
  const awayName = str(m.team_B_name, 'Vieras')
  const forfeitA = scoreValue(m.fs_A)
  const forfeitB = scoreValue(m.fs_B)
  const live = state === 'live'
  const livePeriod = Number(str(m.live_period))

  return {
    matchId: str(m.match_id || fallbackId),
    matchNumber: m.match_number ? str(m.match_number) : undefined,
    competitionName: str(m.competition_name),
    categoryName: str(m.category_name),
    competitionId: m.competition_id ? str(m.competition_id) : undefined,
    categoryId: m.category_id ? str(m.category_id) : undefined,
    groupId: m.group_id ? str(m.group_id) : undefined,
    date: str(m.date),
    time: str(m.time).slice(0, 5),
    venueName: str(m.venue_name),
    venueLat: decimal(m.venue_lat),
    venueLon: decimal(m.venue_lon),
    homeTeamName: homeName,
    awayTeamName: awayName,
    homeTeamId: m.team_A_id ? str(m.team_A_id) : undefined,
    awayTeamId: m.team_B_id ? str(m.team_B_id) : undefined,
    scoreHome: shown ? shown.home : null,
    scoreAway: shown ? shown.away : null,
    isLive: live,
    phase: state,
    rawStatus: str(m.status),
    forfeitText: state === 'forfeit' ? forfeitText(homeName, awayName, m) : undefined,
    winnerSide: state === 'played' || state === 'forfeit' ? winnerSide(m) : undefined,
    forfeitScore:
      state === 'forfeit' && forfeitA !== undefined && forfeitB !== undefined && forfeitA + forfeitB > 0
        ? { home: forfeitA, away: forfeitB }
        : undefined,
    referee1: m.referee_1_name ? str(m.referee_1_name) : undefined,
    referee2: m.referee_2_name ? str(m.referee_2_name) : undefined,
    spectators: (scoreValue(m.attendance) ?? 0) > 0 ? scoreValue(m.attendance) : undefined,
    quarters,
    teamFoulsHome: live ? (scoreValue(m.live_fouls_A) ?? null) : null,
    teamFoulsAway: live ? (scoreValue(m.live_fouls_B) ?? null) : null,
    livePeriod: live && livePeriod > 0 ? livePeriod : undefined,
    statsTracked,
    leaders,
    homeRoster: lineups.home,
    awayRoster: lineups.away,
    homeSeasonRoster: [],
    awaySeasonRoster: [],
    lineupNotice: m.lineup_notice ? str(m.lineup_notice) : undefined,
  }
}

/** null = Basket.fi says the game does not exist. Throws BasketApiError when the call fails. */
export async function fetchBasketMatch(matchId: string): Promise<BasketMatchDetail | null> {
  let data: Record<string, unknown>
  try {
    data = await basketGet(`getMatch?match_id=${encodeURIComponent(matchId)}`)
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
  if (!data?.match || typeof data.match !== 'object') return null
  return mapMatchDetail(data.match as Record<string, unknown>, matchId)
}

export async function fetchBasketMatchesByTeam(teamId: string): Promise<BasketTeamFixture[]> {
  if (!teamId) return []
  return fetchMatchesByPath(`getMatches?team_id=${encodeURIComponent(teamId)}`, teamId, (m) => isTeamMatch(m, teamId))
}

export async function fetchBasketMatchesByGroup(
  competitionId: string,
  categoryId: string,
  groupId: string,
): Promise<BasketTeamFixture[]> {
  return fetchMatchesByPath(
    `getMatches?competition_id=${encodeURIComponent(competitionId)}&category_id=${encodeURIComponent(categoryId)}&group_id=${encodeURIComponent(groupId)}`,
    undefined,
    (m) => str(m.group_id) === groupId,
  )
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

/** The newest season's current group. No hardcoded season year. */
export function pickCurrentGroup(groups: BasketSeasonGroup[]): BasketSeasonGroup | null {
  if (!groups.length) return null
  const newest = groups.reduce((acc, g) => ((g.seasonId || '') > acc ? g.seasonId || '' : acc), '')
  const inNewest = groups.filter((g) => (g.seasonId || '') === newest)
  return (
    inNewest.find((g) => g.isCurrent && g.competitionStatus === 'published') ||
    inNewest.find((g) => g.isCurrent) ||
    inNewest.find((g) => g.competitionStatus === 'published') ||
    inNewest[0] ||
    groups[0]
  )
}

export function lastFormForTeam(teamId: string, matches: BasketGroupMatch[]): ('V' | 'T' | 'H')[] {
  const decided = (m: BasketGroupMatch) =>
    (m.state === 'played' && m.scoreHome != null && m.scoreAway != null) || (m.state === 'forfeit' && Boolean(m.winnerSide))
  return matches
    .filter((m) => decided(m) && (m.homeTeamId === teamId || m.awayTeamId === teamId))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
    .slice(0, 5)
    .map((m) => {
      const home = m.homeTeamId === teamId
      if (m.state === 'forfeit') return (m.winnerSide === 'home') === home ? ('V' as const) : ('H' as const)
      if (m.scoreHome === m.scoreAway) return 'T' as const
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

/** null = TASO has no such team. Throws BasketApiError when the call fails. */
export async function fetchBasketTeamProfile(teamId: string): Promise<BasketTeamProfile | null> {
  if (!teamId) return null
  const data = await basketGetCached(`getTeam?team_id=${encodeURIComponent(teamId)}`, 60 * 1000)
  const t = data?.team as Record<string, unknown> | undefined
  if (!t || !str(t.team_id)) return null

  const teamName = str(t.team_name) || `Joukkue #${teamId}`
  const players = mapTeamRoster(t, teamId)

  const rawGroups = Array.isArray(t.groups) ? (t.groups as Record<string, unknown>[]) : []
  const groups: BasketSeasonGroup[] = rawGroups.map((g) => ({
    competitionId: str(g.competition_id),
    competitionName: str(g.competition_name),
    categoryId: str(g.category_id),
    categoryName: str(g.category_name),
    groupId: str(g.group_id),
    groupName: str(g.group_name),
    seasonId: g.competition_season ? str(g.competition_season) : undefined,
    isCurrent: str(g.group_current) === '1',
    competitionStatus: g.competition_status ? str(g.competition_status) : undefined,
  }))

  const fixtures = await fetchBasketMatchesByTeam(teamId)
  const current = pickCurrentGroup(groups)
  const categoryName =
    current?.categoryName || str((t.primary_category as Record<string, unknown> | undefined)?.category_name)

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
  const state = classifyMatch(m)
  const shown = visibleScore(m, state)
  return {
    matchId: str(m.match_id),
    date: str(m.date),
    time: str(m.time),
    homeTeam: str(m.team_A_name, 'Koti'),
    awayTeam: str(m.team_B_name, 'Vieras'),
    homeTeamId: numericId(m.team_A_id),
    awayTeamId: numericId(m.team_B_id),
    scoreHome: shown?.home,
    scoreAway: shown?.away,
    status: str(m.status),
    state,
    winnerSide: state === 'played' || state === 'forfeit' ? winnerSide(m) : undefined,
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
  // getGroup carries no match list for basket; the group's games come from getMatches.
  let rawMatches = Array.isArray(g.matches) ? (g.matches as Record<string, unknown>[]) : []
  if (!rawMatches.length) {
    const list = await basketGetCached(
      `getMatches?competition_id=${encodeURIComponent(competitionId)}&category_id=${encodeURIComponent(categoryId)}&group_id=${encodeURIComponent(groupId)}`,
      3 * 60 * 1000,
    )
    rawMatches = Array.isArray(list?.matches)
      ? (list.matches as Record<string, unknown>[]).filter((m) => str(m.group_id) === groupId)
      : []
  }
  const matches = rawMatches.map(mapGroupMatch)
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

function mapPlayerMatch(m: Record<string, unknown>): BasketPlayerMatch {
  const state = classifyMatch(m)
  const shown = visibleScore(m, state)
  return {
    matchId: str(m.match_id),
    date: str(m.date),
    time: str(m.time),
    status: str(m.status),
    state,
    homeTeam: str(m.team_A_name, 'Koti'),
    awayTeam: str(m.team_B_name, 'Vieras'),
    homeTeamId: numericId(m.team_A_id),
    awayTeamId: numericId(m.team_B_id),
    teamId: numericId(m.team_id),
    scoreHome: shown?.home,
    scoreAway: shown?.away,
    categoryName: str(m.category_name),
    competitionName: str(m.competition_name),
    seasonId: m.season_id ? str(m.season_id) : undefined,
    venueName: m.venue_name ? str(m.venue_name) : undefined,
  }
}

/**
 * getPlayer: profile, teams with shirt numbers and `upcoming`. Its `matches`
 * list is empty for basketball (checked 2026-10-08), so no season stats are
 * derived from it.
 */
export async function fetchBasketPlayer(playerId: string): Promise<BasketPlayerProfile | null> {
  let data: Record<string, unknown>
  try {
    data = await basketGetCached(`getPlayer?player_id=${encodeURIComponent(playerId)}`, 5 * 60 * 1000)
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
  const p = data?.player as Record<string, unknown> | undefined
  if (!p || !str(p.player_id)) return null
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
    fullName: `${str(p.first_name)} ${str(p.last_name)}`.trim() || `Pelaaja #${playerId}`,
    birthYear: p.birthyear && /^\d{4}$/.test(str(p.birthyear)) ? str(p.birthyear) : undefined,
    age: scoreValue(p.age),
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
  const clubOrTeamHits = hits.filter((h) => h.kind === 'club' || h.kind === 'team').length
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

    const needDeepScan = clubOrTeamHits < 6
    if (needDeepScan) {
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
  }

  if (looksLikePerson || clubOrTeamHits < 6) {
    const playerTeamIds = [...seenTeams].slice(0, 4)
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
  }

  return hits.slice(0, 30)
}


