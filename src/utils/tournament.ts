/**
 * Tournaments (turnaukset) from Basket.fi TASO rows. Nothing is guessed:
 * every label below comes from a TASO field. Checked on real data 2026-10-17
 * (tests/fixtures/basket-tournament-*.json, docs/DATA_FIELDS.md).
 *
 * What TASO calls a tournament in basketball:
 * - A hosted round ("turnaus"): round_host_team_id is set. Juniors play a
 *   day of games at the host's hall; round_id groups them, round_name is the
 *   host. Example: etekp2627 / 10-v mikropojat II div, round 10 at Venom.
 * - A bracket group: group_type is not "group_stage" — knockout_final,
 *   knockout_bronze, knockout_full, double_elimination (SM-karsinnat
 *   weekend), additional_group_stage (jatkosarja). Placement games carry
 *   final_position_win / final_position_lost.
 *
 * Placeholders: a slot whose team is not known yet has team id "" or "0".
 * Its name/description says where the team comes from: "v863" = winner of
 * game number 863, "h3" = loser of game 3, "Alkusarja/I" = 1st of Alkusarja.
 * Such a slot is never a team and never gets a score.
 *
 * Tie headers: a two-leg tie has a row with aggregate_match === match_id and
 * no date; a best-of series has match_type "series". Their fs_A/fs_B are the
 * aggregate points or the series wins, not a game score.
 */
import { classifyMatch, scoreValue, visibleScore, winnerSide, type MatchState, type Side } from './matchStatus.ts'

type Row = Record<string, unknown>

function text(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

/** A TASO id that names a real record: digits, not "0". */
export function realId(v: unknown): string | undefined {
  const s = text(v)
  return /^\d+$/.test(s) && !/^0+$/.test(s) ? s : undefined
}

export type TieKind = 'series' | 'aggregate'

/** The row that sums up a two-leg tie or a best-of series. Not a game. */
export function tieKind(m: Row): TieKind | undefined {
  const id = text(m.match_id)
  if (!id) return undefined
  if (text(m.match_type).toLowerCase() === 'series') return 'series'
  if (text(m.best_of_match) === id && !text(m.date)) return 'series'
  if (text(m.aggregate_match) === id) return 'aggregate'
  return undefined
}

export function isTieHeader(m: Row): boolean {
  return tieKind(m) !== undefined
}

/**
 * Series wins / aggregate points of a tie row, only once TASO has decided it
 * (a winner is set). getMatches says status "Played", getMatch says "Best-Of".
 */
export function tieResult(m: Row): { home: number; away: number; winner: Side } | undefined {
  if (!isTieHeader(m)) return undefined
  const winner = winnerSide(m)
  const home = scoreValue(m.fs_A)
  const away = scoreValue(m.fs_B)
  if (!winner || home === undefined || away === undefined) return undefined
  return { home, away, winner }
}

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 }

export function romanToNumber(s: string): number | undefined {
  if (!/^[IVXL]+$/.test(s)) return undefined
  let total = 0
  for (let i = 0; i < s.length; i++) {
    const v = ROMAN[s[i]]
    const next = ROMAN[s[i + 1]] || 0
    total += v < next ? -v : v
  }
  return total || undefined
}

export interface SlotSource {
  /** "winner" / "loser" of TASO match_number, or "rank" in a named group. */
  kind: 'winner' | 'loser' | 'rank'
  matchNumber?: string
  group?: string
  rank?: number
}

/** Decodes where a placeholder team comes from. Unknown text gives undefined. */
export function parseSlotSource(raw: string): SlotSource | undefined {
  const s = raw.trim()
  const game = /^([vh])\s*(\d+)$/i.exec(s)
  if (game) return { kind: game[1].toLowerCase() === 'v' ? 'winner' : 'loser', matchNumber: game[2] }
  const rank = /^(.+?)\s*\/\s*([IVXL]+|\d+)$/.exec(s)
  if (rank) {
    const n = /^\d+$/.test(rank[2]) ? Number(rank[2]) : romanToNumber(rank[2])
    if (n) return { kind: 'rank', group: rank[1].trim(), rank: n }
  }
  return undefined
}

export interface TeamSlot {
  name: string
  id?: string
  /** True when TASO has not set the team yet. Show as a placeholder, never as a team. */
  placeholder: boolean
  source?: SlotSource
}

export const PLACEHOLDER_TEXT = 'Joukkue vahvistuu'

/** Describes a source; `lookup` names the game a "v863" points to, when it is loaded. */
export function slotSourceText(src: SlotSource, lookup?: (matchNumber: string) => string | undefined): string {
  if (src.kind === 'rank') return `${src.group} ${src.rank}.`
  const game = src.matchNumber ? lookup?.(src.matchNumber) : undefined
  const who = src.kind === 'winner' ? 'voittaja' : 'häviäjä'
  return game ? `${game} ${who}` : `Ottelun ${src.matchNumber} ${who}`
}

/**
 * One side of a game. A real team needs a TASO team id. Without one the slot
 * is a placeholder: its TASO name ("Lohko A 1.", "v863") or description is
 * shown as where the team will come from.
 */
export function teamSlot(
  name: unknown,
  id: unknown,
  description?: unknown,
  lookup?: (matchNumber: string) => string | undefined,
): TeamSlot {
  const teamId = realId(id)
  const teamName = text(name)
  if (teamId && teamName) return { name: teamName, id: teamId, placeholder: false }
  for (const raw of [teamName, text(description)]) {
    if (!raw) continue
    const src = parseSlotSource(raw)
    if (src) return { name: slotSourceText(src, lookup), placeholder: true, source: src }
  }
  // A bare number is a draw position, not a source; a name without an id is TASO's own placeholder text.
  if (teamName && !/^\d+$/.test(teamName)) return { name: teamName, placeholder: true }
  return { name: PLACEHOLDER_TEXT, placeholder: true }
}

export const GROUP_TYPE_LABEL: Record<string, string> = {
  knockout_final: 'Pudotuspelit',
  knockout_bronze: 'Pudotuspelit ja pronssiottelu',
  knockout_full: 'Pudotuspelit, kaikki sijat',
  double_elimination: 'Tuplakarsinta',
  additional_group_stage: 'Jatkosarja',
}

export function isBracketGroupType(groupType: unknown): boolean {
  const t = text(groupType)
  return Boolean(t) && t !== 'group_stage'
}

export function groupTypeLabel(groupType: unknown): string | undefined {
  const t = text(groupType)
  return GROUP_TYPE_LABEL[t] || (isBracketGroupType(t) ? 'Jatkovaihe' : undefined)
}

/** "Voittaja sijalle 1 · häviäjä sijalle 2" from final_position_win/lost; "" when TASO has none. */
export function placementText(m: Row): string {
  const win = text(m.final_position_win)
  const lost = text(m.final_position_lost)
  const parts: string[] = []
  if (win) parts.push(`voittaja sijalle ${win}`)
  if (lost) parts.push(`häviäjä sijalle ${lost}`)
  const s = parts.join(' · ')
  return s ? s[0].toUpperCase() + s.slice(1) : ''
}

/* ------------------------------------------------------------------ keys */

export interface TournamentKey {
  competitionId: string
  categoryId: string
  groupId: string
  /** Set for a hosted round; absent for a bracket group. */
  roundId?: string
}

/** Days shown for "coming tournaments": today and the same weekday next week. */
export const TOURNAMENT_DAYS = 8

const KEY_RE = /^([A-Za-z0-9]+)\.(\d+)\.(\d+)(?:\.(\d+))?$/

export function tournamentKey(k: TournamentKey): string {
  return [k.competitionId, k.categoryId, k.groupId, k.roundId].filter(Boolean).join('.')
}

export function parseTournamentKey(raw: string): TournamentKey | undefined {
  const hit = KEY_RE.exec(String(raw || '').trim())
  if (!hit) return undefined
  return { competitionId: hit[1], categoryId: hit[2], groupId: hit[3], ...(hit[4] ? { roundId: hit[4] } : {}) }
}

export function isTournamentKey(raw: string): boolean {
  return parseTournamentKey(raw) !== undefined
}

/* ------------------------------------------------------- finding them */

export interface TournamentRef {
  key: string
  kind: 'round' | 'bracket'
  competitionId: string
  competitionName: string
  categoryId: string
  categoryName: string
  groupId: string
  groupName: string
  groupType: string
  roundId?: string
  hostTeamName?: string
  hostClubName?: string
  /** Helsinki dates (YYYY-MM-DD) that have games, sorted. */
  dates: string[]
  venues: string[]
  gameCount: number
}

function hostId(m: Row): string | undefined {
  return realId(m.round_host_team_id)
}

/** Tournaments in a list of TASO game rows: hosted rounds and bracket groups. */
export function findTournaments(rows: Row[]): TournamentRef[] {
  const map = new Map<string, TournamentRef>()
  for (const m of rows) {
    const competitionId = text(m.competition_id)
    const categoryId = text(m.category_id)
    const groupId = text(m.group_id)
    if (!competitionId || !/^\d+$/.test(categoryId) || !/^\d+$/.test(groupId)) continue
    const bracket = isBracketGroupType(m.group_type)
    const host = hostId(m)
    if (!bracket && !host) continue
    const roundId = !bracket && host && /^\d+$/.test(text(m.round_id)) ? text(m.round_id) : undefined
    if (!bracket && !roundId) continue
    const key = tournamentKey({ competitionId, categoryId, groupId, roundId })
    let ref = map.get(key)
    if (!ref) {
      ref = {
        key,
        kind: bracket ? 'bracket' : 'round',
        competitionId,
        competitionName: text(m.competition_name),
        categoryId,
        categoryName: text(m.category_name),
        groupId,
        groupName: text(m.group_name),
        groupType: text(m.group_type),
        ...(roundId ? { roundId } : {}),
        ...(!bracket && text(m.round_host_team_name) ? { hostTeamName: text(m.round_host_team_name) } : {}),
        ...(!bracket && text(m.round_club_name) ? { hostClubName: text(m.round_club_name) } : {}),
        dates: [],
        venues: [],
        gameCount: 0,
      }
      map.set(key, ref)
    }
    if (isTieHeader(m)) continue
    ref.gameCount++
    const date = text(m.date)
    if (date && !ref.dates.includes(date)) ref.dates.push(date)
    const venue = text(m.venue_name)
    if (venue && !ref.venues.includes(venue)) ref.venues.push(venue)
  }
  const out = [...map.values()].filter((r) => r.gameCount > 0)
  for (const r of out) r.dates.sort()
  return out.sort(
    (a, b) =>
      (a.dates[0] || '9999').localeCompare(b.dates[0] || '9999') ||
      a.categoryName.localeCompare(b.categoryName, 'fi') ||
      (a.hostTeamName || '').localeCompare(b.hostTeamName || '', 'fi'),
  )
}

/** Rows that belong to one tournament (same group, and same round for a hosted round). */
export function rowsOfTournament(rows: Row[], key: TournamentKey): Row[] {
  return rows.filter(
    (m) =>
      text(m.competition_id) === key.competitionId &&
      text(m.category_id) === key.categoryId &&
      text(m.group_id) === key.groupId &&
      (!key.roundId || text(m.round_id) === key.roundId),
  )
}

export function tournamentTitle(r: Pick<TournamentRef, 'kind' | 'categoryName' | 'hostTeamName' | 'groupName'>): string {
  return r.categoryName || r.groupName || 'Turnaus'
}

export function tournamentSubtitle(r: Pick<TournamentRef, 'kind' | 'hostTeamName' | 'groupName' | 'groupType' | 'venues'>): string {
  if (r.kind === 'round') {
    return [r.hostTeamName ? `Isäntä ${r.hostTeamName}` : '', r.venues.join(', ')].filter(Boolean).join(' · ')
  }
  return [r.groupName, groupTypeLabel(r.groupType)].filter(Boolean).join(' · ')
}

/** Words a search can match: category, group, host, venue, plus "turnaus". */
export function tournamentSearchText(r: TournamentRef): string {
  return [
    'turnaus turnaukset',
    r.categoryName,
    r.competitionName,
    r.groupName,
    r.hostTeamName,
    r.hostClubName,
    r.venues.join(' '),
    groupTypeLabel(r.groupType),
  ]
    .filter(Boolean)
    .join(' ')
}

/* -------------------------------------------------------- the view */

export interface TournamentGame {
  matchId: string
  matchNumber?: string
  date: string
  time: string
  venue: string
  roundName?: string
  groupName?: string
  home: TeamSlot
  away: TeamSlot
  state: MatchState
  /** Only for played games and TASO-live games of today. */
  scoreHome?: number
  scoreAway?: number
  winnerSide?: Side
  placement?: string
  /** "Ottelusarja, peli 2" / "Ottelupari" when the game is a leg of a tie. */
  tieNote?: string
}

export interface TournamentTie {
  matchId: string
  kind: TieKind
  home: TeamSlot
  away: TeamSlot
  /** Series wins or aggregate points, only when TASO marks the tie Played. */
  resultHome?: number
  resultAway?: number
  winnerSide?: Side
  bestOf?: number
  legs: string[]
}

export interface TournamentPlacement {
  position: string
  team: TeamSlot
  fromMatchId: string
}

export interface TournamentCourt {
  venue: string
  games: TournamentGame[]
}

export interface TournamentDay {
  date: string
  courts: TournamentCourt[]
}

export interface TournamentView {
  days: TournamentDay[]
  undated: TournamentGame[]
  ties: TournamentTie[]
  placements: TournamentPlacement[]
  /** Games TASO marks live today. More than one only when TASO says so. */
  liveCount: number
}

function numberLookup(rows: Row[]): (matchNumber: string) => string | undefined {
  const byNumber = new Map<string, Row>()
  for (const m of rows) {
    const no = text(m.match_number)
    if (no && !byNumber.has(no)) byNumber.set(no, m)
  }
  return (no) => {
    const m = byNumber.get(no)
    if (!m) return undefined
    const a = teamSlot(m.team_A_name, m.team_A_id, m.team_A_description)
    const b = teamSlot(m.team_B_name, m.team_B_id, m.team_B_description)
    if (a.placeholder || b.placeholder) return `Ottelun ${no}`
    return `${a.name}–${b.name}`
  }
}

function sortTime(a: TournamentGame, b: TournamentGame): number {
  return (a.time || '99').localeCompare(b.time || '99') || a.matchId.localeCompare(b.matchId)
}

export function buildTournamentView(rows: Row[], now = new Date()): TournamentView {
  const lookup = numberLookup(rows)
  const headers = rows.filter(isTieHeader)
  const headerIds = new Set(headers.map((h) => text(h.match_id)))
  const games: TournamentGame[] = []
  const ties: TournamentTie[] = headers.map((h) => {
    const id = text(h.match_id)
    const kind = tieKind(h) as TieKind
    const result = tieResult(h)
    const legs = rows
      .filter((m) => !isTieHeader(m) && (text(m.aggregate_match) === id || text(m.best_of_match) === id))
      .map((m) => text(m.match_id))
    const bestOf = Number(text(h.best_of_count))
    return {
      matchId: id,
      kind,
      home: teamSlot(h.team_A_name, h.team_A_id, h.team_A_description, lookup),
      away: teamSlot(h.team_B_name, h.team_B_id, h.team_B_description, lookup),
      ...(result ? { resultHome: result.home, resultAway: result.away } : {}),
      winnerSide: result?.winner,
      ...(kind === 'series' && Number.isFinite(bestOf) && bestOf > 1 ? { bestOf } : {}),
      legs,
    }
  })

  for (const m of rows) {
    if (isTieHeader(m)) continue
    const state = classifyMatch(m, now)
    const home = teamSlot(m.team_A_name, m.team_A_id, m.team_A_description, lookup)
    const away = teamSlot(m.team_B_name, m.team_B_id, m.team_B_description, lookup)
    // A placeholder slot has no team: there is nothing to score.
    const shown = home.placeholder || away.placeholder ? undefined : visibleScore(m, state)
    const agg = text(m.aggregate_match)
    const series = text(m.best_of_match)
    let tieNote: string | undefined
    if (series && series !== '0' && headerIds.has(series)) {
      const seq = text(m.best_of_sequence)
      tieNote = seq ? `Ottelusarja, peli ${seq}` : 'Ottelusarja'
    } else if (agg && agg !== '0' && headerIds.has(agg)) tieNote = 'Ottelupari (yhteispisteet)'
    games.push({
      matchId: text(m.match_id),
      matchNumber: text(m.match_number) || undefined,
      date: text(m.date),
      time: text(m.time),
      venue: text(m.venue_name),
      // For a hosted round TASO's round_name is the host's name, already in the header.
      roundName: text(m.round_name) && text(m.round_name) !== text(m.round_host_team_name) ? text(m.round_name) : undefined,
      groupName: text(m.group_name) || undefined,
      home,
      away,
      state,
      ...(shown ? { scoreHome: shown.home, scoreAway: shown.away } : {}),
      winnerSide: state === 'played' || state === 'forfeit' ? winnerSide(m) : undefined,
      placement: placementText(m) || undefined,
      tieNote,
    })
  }

  const byDay = new Map<string, Map<string, TournamentGame[]>>()
  const undated: TournamentGame[] = []
  for (const g of games) {
    if (!g.date) {
      undated.push(g)
      continue
    }
    const courts = byDay.get(g.date) ?? new Map<string, TournamentGame[]>()
    byDay.set(g.date, courts)
    const venue = g.venue || 'Paikka avoin'
    courts.set(venue, [...(courts.get(venue) ?? []), g])
  }
  const days: TournamentDay[] = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, courts]) => ({
      date,
      courts: [...courts.entries()]
        .map(([venue, list]) => ({ venue, games: list.sort(sortTime) }))
        .sort((a, b) => sortTime(a.games[0], b.games[0]) || a.venue.localeCompare(b.venue, 'fi')),
    }))
  undated.sort((a, b) => (a.matchNumber || '').localeCompare(b.matchNumber || '', 'fi', { numeric: true }))

  const placements: TournamentPlacement[] = []
  for (const g of games) {
    if (!g.winnerSide) continue
    const raw = rows.find((m) => text(m.match_id) === g.matchId) as Row
    const win = text(raw.final_position_win)
    const lost = text(raw.final_position_lost)
    const winner = g.winnerSide === 'home' ? g.home : g.away
    const loser = g.winnerSide === 'home' ? g.away : g.home
    if (win && !winner.placeholder) placements.push({ position: win, team: winner, fromMatchId: g.matchId })
    if (lost && !loser.placeholder) placements.push({ position: lost, team: loser, fromMatchId: g.matchId })
  }
  placements.sort((a, b) => a.position.localeCompare(b.position, 'fi', { numeric: true }))

  return { days, undated, ties, placements, liveCount: games.filter((g) => g.state === 'live').length }
}

/** TASO publishes a table for this group only when it ranks the teams. */
export function hasTasoStandings(teams: Row[]): boolean {
  return teams.some((t) => /^\d+$/.test(text(t.current_standing)) && Number(text(t.current_standing)) > 0)
}
