/**
 * "Joukkueiden tausta" — pure logic for a basketball game's team background:
 * each team's current standing, earlier seasons (autumn + spring series),
 * the club's other teams in the same age, and linking a team to last season's
 * team when TASO gave it a new team_id.
 *
 * Every fact comes from TASO (koripallo-api.torneopal.net): getTeam groups[],
 * getGroup teams[] standings, getMatches for knockout placing, getTeams for
 * the club index. No player data (U15 and younger have no lineups).
 * Honesty labels: exact (same team_id) · vahvistettu (confirmed) · arvio (guess).
 */

export type Gender = 'tytöt' | 'pojat'

export interface ParsedCategory {
  /** Age number from "12-vuotiaat", null for Supermikro / adult series. */
  age: number | null
  gender: Gender | null
  /** Mikro (U10 and younger) and Supermikro series keep no standings. */
  noResults: boolean
  /** Short level label: "II div", "SM-sarja", "valtak. I div", "RP Cup", "Supermikro". */
  level: string
  /** Lower = higher level. 99 = unknown. */
  levelRank: number
  /** Short series text without the region: "12v tytöt II div". */
  short: string
}

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 }

export function parseCategoryName(raw: string): ParsedCategory {
  const name = String(raw || '').replace(/\s+/g, ' ').trim()
  const lower = name.toLowerCase()
  const ageHit = /^(\d{1,2})(?:-\d{1,2})?-vuotiaat/i.exec(name)
  const age = ageHit ? Number(ageHit[1]) : null
  const gender: Gender | null = /tyt(ö|o)t|tyttö|naiset/i.test(lower) ? 'tytöt' : /pojat|miehet/i.test(lower) ? 'pojat' : null
  const supermikro = /supermikro/i.test(lower)
  const mikro = supermikro || /mikro/i.test(lower)
  let level = ''
  let levelRank = 99
  if (/sm-sarja/i.test(lower)) {
    level = 'SM-sarja'
    levelRank = 0
  } else if (/sm-karsin/i.test(lower)) {
    level = 'SM-karsinta'
    levelRank = 1
  } else if (/valtakunn/i.test(lower)) {
    level = 'valtak. I div'
    levelRank = 2
  } else if (/robert petersen/i.test(lower)) {
    level = 'RP Cup'
    levelRank = 3
  } else {
    const div = /\b(I|II|III|IV|V|VI) divisioona/.exec(name)
    if (div) {
      level = `${div[1]} div`
      levelRank = 3 + ROMAN[div[1]]
    } else if (supermikro) {
      level = 'Supermikro'
    }
  }
  const genderWord = supermikro
    ? `supermikro${gender === 'pojat' ? 'pojat' : 'tytöt'}`
    : mikro
      ? `mikro${gender ?? ''}`
      : (gender ?? '')
  const short = supermikro
    ? genderWord
    : [age != null ? `${age}v` : '', genderWord, level].filter(Boolean).join(' ') || name.replace(/ Eteläinen alue$/i, '')
  return {
    age,
    gender,
    noResults: mikro || (age != null && age <= 10),
    level: supermikro ? 'Supermikro' : level,
    levelRank,
    short,
  }
}

/** "2025-2026" → "25–26". */
export function seasonLabel(season: string): string {
  const hit = /^(\d{4})-(\d{4})$/.exec(String(season || '').trim())
  return hit ? `${hit[1].slice(2)}–${hit[2].slice(2)}` : String(season || '')
}

/** Series part shown per row: Syksy / Kevät / the stage name as given. */
export function seriesLabel(groupName: string, groupType = ''): string {
  const g = String(groupName || '').trim()
  if (/^syk|^syys/i.test(g)) return 'Syksy'
  if (/^kev/i.test(g)) return 'Kevät'
  if (/aluefin/i.test(g)) return 'Aluefin.'
  if (!g && /knockout/.test(groupType)) return 'Pudotuspelit'
  return g
}

export interface TasoGroupRef {
  competition_id: string
  competition_season: string
  category_id: string
  category_name: string
  group_id: string
  group_name: string
  group_type: string
  group_current?: string
  competition_status?: string
}

/** Harjoitusottelut, eSCO koulutus/test rows and one-off games are not series. */
export function isSeriesGroup(g: TasoGroupRef): boolean {
  const comp = String(g.competition_id || '')
  if (!comp || comp === 'escokoulutus' || comp.startsWith('hark')) return false
  if (g.group_type === 'one_match') return false
  if (/^testisarja|^koulutus|^harjoitus/i.test(String(g.category_name || ''))) return false
  return Boolean(g.competition_season)
}

export interface GroupTeamRow {
  team_id: string
  team_name?: string
  current_standing?: number | string | null
  matches_played?: number | string | null
  matches_won?: number | string | null
  matches_lost?: number | string | null
  goals_for?: number | string | null
  goals_against?: number | string | null
}

export interface Standing {
  position: number | null
  teams: number
  played: number
  won: number
  lost: number
  pointsFor: number
  pointsAgainst: number
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const x = Number(v)
  return Number.isFinite(x) ? x : null
}

/** The team's row in one getGroup answer; null when the team is not in it. */
export function standingFor(teams: GroupTeamRow[] | undefined, teamId: string): Standing | null {
  const list = Array.isArray(teams) ? teams : []
  const row = list.find((t) => String(t.team_id) === String(teamId))
  if (!row) return null
  return {
    position: num(row.current_standing),
    teams: list.length,
    played: num(row.matches_played) ?? 0,
    won: num(row.matches_won) ?? 0,
    lost: num(row.matches_lost) ?? 0,
    pointsFor: num(row.goals_for) ?? 0,
    pointsAgainst: num(row.goals_against) ?? 0,
  }
}

export interface KnockoutMatch {
  match_id?: string
  team_A_id: string
  team_B_id: string
  status: string
  round_id?: string | number
  winner_id?: string | null
}

/**
 * Placing in a knockout stage (aluefinaalit), derived from its games:
 * the last round is the final (between earlier-round winners) plus the bronze game.
 * "1."…"4." when decided, "kesken" when games are still to play, "" when unknown.
 */
export function knockoutPlacing(matches: KnockoutMatch[], teamId: string): string {
  const id = String(teamId)
  const mine = matches.filter((m) => String(m.team_A_id) === id || String(m.team_B_id) === id)
  if (!mine.length) return ''
  if (mine.some((m) => !/^played$/i.test(String(m.status)))) return 'kesken'
  const round = (m: KnockoutMatch) => Number(m.round_id) || 0
  const lastRound = Math.max(...matches.map(round))
  const sorted = [...mine].sort((a, b) => round(a) - round(b))
  const last = sorted[sorted.length - 1]
  const won = (m: KnockoutMatch) => String(m.winner_id || '') === id
  if (round(last) !== lastRound) return won(last) ? '' : 'pudotettiin'
  if (sorted.length === 1) return won(last) ? '1.' : '2.'
  const prev = sorted[sorted.length - 2]
  const inFinal = won(prev)
  if (inFinal) return won(last) ? '1.' : '2.'
  return won(last) ? '3.' : '4.'
}

export type RowResult =
  | { kind: 'standing'; standing: Standing; withdrew: boolean }
  | { kind: 'knockout'; placing: string }
  | { kind: 'noResults' }
  | { kind: 'missing' }

export interface HistoryRow {
  season: string
  seasonLabel: string
  competitionId: string
  categoryId: string
  groupId: string
  groupType: string
  series: string
  category: ParsedCategory
  categoryName: string
  result: RowResult
}

export interface SeasonBlock {
  season: string
  label: string
  /** Same category for every row → shown once; otherwise per row (mid-season division change). */
  category: string
  rows: HistoryRow[]
  /** Every row is a mikro year: show one line "pelasi … (ei tuloksia)". */
  noResults: boolean
}

/** TASO group order: autumn first, then spring stages, then knockouts. */
function stageOrder(g: TasoGroupRef): number {
  const s = seriesLabel(g.group_name, g.group_type)
  if (s === 'Syksy') return 0
  if (/knockout/.test(g.group_type)) return 3
  if (s === 'Kevät') return 1
  return 2
}

export interface GroupLookup {
  /** getGroup teams for comp/cat/group, undefined when not loaded. */
  teams(competitionId: string, categoryId: string, groupId: string): GroupTeamRow[] | undefined
  /** getMatches rows for a knockout group, undefined when not loaded. */
  matches(competitionId: string, categoryId: string, groupId: string): KnockoutMatch[] | undefined
}

export function historyRow(g: TasoGroupRef, teamId: string, lookup: GroupLookup, seasonOver: boolean): HistoryRow {
  const category = parseCategoryName(g.category_name)
  let result: RowResult = { kind: 'missing' }
  if (category.noResults) {
    result = { kind: 'noResults' }
  } else if (/knockout/.test(g.group_type)) {
    const ms = lookup.matches(g.competition_id, g.category_id, g.group_id)
    if (ms) result = { kind: 'knockout', placing: knockoutPlacing(ms, teamId) }
  } else {
    const teams = lookup.teams(g.competition_id, g.category_id, g.group_id)
    const st = teams ? standingFor(teams, teamId) : null
    if (st) {
      if (st.position == null && st.played === 0 && st.won === 0) result = { kind: 'noResults' }
      else result = { kind: 'standing', standing: st, withdrew: seasonOver && st.played === 0 }
    }
  }
  return {
    season: g.competition_season,
    seasonLabel: seasonLabel(g.competition_season),
    competitionId: g.competition_id,
    categoryId: g.category_id,
    groupId: g.group_id,
    groupType: g.group_type,
    series: seriesLabel(g.group_name, g.group_type),
    category,
    categoryName: g.category_name,
    result,
  }
}

/** Earlier-season series of a team, newest season first, stages in play order. */
export function earlierGroups(groups: TasoGroupRef[], currentSeason: string): TasoGroupRef[] {
  return groups
    .filter((g) => isSeriesGroup(g) && g.competition_season < currentSeason)
    .sort((a, b) => (a.competition_season === b.competition_season ? stageOrder(a) - stageOrder(b) : a.competition_season < b.competition_season ? 1 : -1))
}

export function seasonBlocks(rows: HistoryRow[]): SeasonBlock[] {
  const out: SeasonBlock[] = []
  for (const r of rows) {
    let b = out.find((x) => x.season === r.season)
    if (!b) {
      b = { season: r.season, label: r.seasonLabel, category: '', rows: [], noResults: true }
      out.push(b)
    }
    b.rows.push(r)
    if (r.result.kind !== 'noResults') b.noResults = false
  }
  for (const b of out) {
    const names = new Set(b.rows.map((r) => r.category.short))
    b.category = names.size === 1 ? b.rows[0].category.short : ''
  }
  return out
}

/** "2026-2027" → "2025-2026". */
export function previousSeason(season: string): string {
  const hit = /^(\d{4})-(\d{4})$/.exec(season)
  return hit ? `${Number(hit[1]) - 1}-${Number(hit[2]) - 1}` : ''
}

/** "etekp2627" → "etekp2526"; "vk2627" → "vk2526". */
export function previousCompetitionId(comp: string): string {
  const hit = /^([a-z]+)(\d{2})(\d{2})$/i.exec(comp)
  if (!hit) return ''
  const a = Number(hit[2]) - 1
  const b = Number(hit[3]) - 1
  return `${hit[1]}${String((a + 100) % 100).padStart(2, '0')}${String((b + 100) % 100).padStart(2, '0')}`
}

/** National competition id for the season of a regional one: "etekp2627" → "vk2627". */
export function nationalCompetitionId(comp: string): string {
  const hit = /(\d{4})$/.exec(comp)
  return hit ? `vk${hit[1]}` : ''
}

// ── Linking a new team_id to last season ───────────────────────────────────

/**
 * Predecessors confirmed by the family (Arto, 14.11.2026): Lilli's TOPOLA
 * 12v tytöt II div (5756346) was ToPoLa 11v tytöt II div (5752640) in 2025-26.
 */
export const CONFIRMED_PREDECESSORS: Readonly<Record<string, readonly string[]>> = {
  '5756346': ['5752640'],
}

export interface Official {
  first_name?: string
  last_name?: string
  official_role?: string
}

export interface CandidateTeam {
  teamId: string
  teamName: string
  categoryName: string
  officials: Official[]
}

export interface ScoredCandidate extends CandidateTeam {
  score: number
  sharedCoaches: string[]
  reasons: string[]
  category: ParsedCategory
}

const COLOR_TOKENS = ['liila', 'keltainen', 'oranssi', 'sininen', 'valkoinen', 'musta', 'punainen', 'vihreä', 'harmaa', 'white', 'black', 'blue', 'red', 'green', 'gold', 'akatemia']

/** Name key that survives first/last swapped in TASO ("Koskinen Kaj" = "Kaj Koskinen"). */
function officialKey(o: Official): string {
  return `${String(o.first_name || '')} ${String(o.last_name || '')}`
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ')
}

function officialNames(list: Official[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const o of list || []) {
    const key = officialKey(o)
    if (key) out.set(key, `${String(o.first_name || '').trim()} ${String(o.last_name || '').trim()}`.trim())
  }
  return out
}

function nameTokens(name: string): string[] {
  const lower = String(name || '').toLowerCase()
  return COLOR_TOKENS.filter((t) => lower.includes(t))
}

/**
 * Score last season's teams of the same club and gender, age label −1 or equal:
 * shared officials ×3, same division ×1, colour/name token ×2, age −1 ×1.
 */
export function scoreCandidates(target: CandidateTeam, candidates: CandidateTeam[]): ScoredCandidate[] {
  const tc = parseCategoryName(target.categoryName)
  const mine = officialNames(target.officials)
  const myTokens = nameTokens(target.teamName)
  const out: ScoredCandidate[] = []
  for (const c of candidates) {
    if (c.teamId === target.teamId) continue
    const cc = parseCategoryName(c.categoryName)
    if (tc.gender && cc.gender && tc.gender !== cc.gender) continue
    if (tc.age != null && cc.age != null && !(cc.age === tc.age || cc.age === tc.age - 1)) continue
    const shared = [...officialNames(c.officials).keys()].filter((k) => mine.has(k))
    const reasons: string[] = []
    let score = 0
    if (shared.length) {
      score += 3 * shared.length
      reasons.push(shared.length === 1 ? 'sama valmentaja' : `${shared.length} samaa valmentajaa`)
    }
    if (tc.levelRank !== 99 && tc.levelRank === cc.levelRank) {
      score += 1
      reasons.push('sama taso')
    }
    const tokens = nameTokens(c.teamName).filter((t) => myTokens.includes(t))
    if (tokens.length) {
      score += 2
      reasons.push('sama nimi')
    }
    if (tc.age != null && cc.age === tc.age - 1) {
      score += 1
      reasons.push('ikäluokka nuorempi')
    }
    const sharedCoaches = shared.map((k) => mine.get(k) || k)
    out.push({ ...c, score, sharedCoaches, reasons, category: cc })
  }
  return out.sort((a, b) => b.score - a.score || a.teamId.localeCompare(b.teamId))
}

/** The top candidate only when it beats the runner-up by 2 or more (and has evidence). */
export function pickGuess(scored: ScoredCandidate[]): ScoredCandidate | null {
  if (!scored.length || scored[0].score <= 0) return null
  if (scored.length > 1 && scored[0].score - scored[1].score < 2) return null
  return scored[0]
}

export type LinkSource = 'exact' | 'confirmed-family' | 'confirmed-user' | 'guess' | 'none'

export interface PredecessorChoice {
  source: LinkSource
  teamIds: string[]
}

/** Which earlier team to use: built-in family confirmation, then the phone's own choice. */
export function confirmedPredecessor(teamId: string, userChoices: Record<string, string[]>): PredecessorChoice | null {
  const user = userChoices[teamId]
  if (user && user.length) return { source: 'confirmed-user', teamIds: [...user] }
  const fam = CONFIRMED_PREDECESSORS[teamId]
  if (fam && fam.length) return { source: 'confirmed-family', teamIds: [...fam] }
  return null
}

// ── Club siblings ──────────────────────────────────────────────────────────

export interface ClubTeamRow {
  team_id: string
  team_name: string
  club_id: string
  category_id: string
  category_name: string
  competition_id?: string
}

export type ClubIndex = Record<string, ClubTeamRow[]>

/** getTeams rows → {club_id: rows}. Keeps only the fields the card needs. */
export function buildClubIndex(rows: Array<Partial<ClubTeamRow>>, competitionId: string): ClubIndex {
  const idx: ClubIndex = {}
  for (const r of rows) {
    const club = String(r.club_id || '')
    const team = String(r.team_id || '')
    if (!club || !team) continue
    ;(idx[club] ||= []).push({
      team_id: team,
      team_name: String(r.team_name || ''),
      club_id: club,
      category_id: String(r.category_id || ''),
      category_name: String(r.category_name || ''),
      competition_id: competitionId,
    })
  }
  return idx
}

export type Relation = 'ylempi taso' | 'sama taso' | 'alempi taso'

export interface Sibling extends ClubTeamRow {
  category: ParsedCategory
  relation: Relation
}

export interface Siblings {
  sameAge: Sibling[]
  olderAge: Sibling[]
}

/** Same club, same gender, same age (and age +1, shown collapsed), ordered by level. */
export function clubSiblings(rows: ClubTeamRow[], categoryName: string, excludeTeamIds: string[]): Siblings {
  const me = parseCategoryName(categoryName)
  const sameAge: Sibling[] = []
  const olderAge: Sibling[] = []
  if (me.age == null || !me.gender) return { sameAge, olderAge }
  const seen = new Set<string>()
  for (const r of rows) {
    if (excludeTeamIds.includes(r.team_id)) continue
    const c = parseCategoryName(r.category_name)
    if (c.gender !== me.gender || c.age == null) continue
    const key = `${r.team_id}:${r.category_id}`
    if (seen.has(key)) continue
    seen.add(key)
    const relation: Relation = c.levelRank < me.levelRank ? 'ylempi taso' : c.levelRank > me.levelRank ? 'alempi taso' : 'sama taso'
    const s: Sibling = { ...r, category: c, relation }
    if (c.age === me.age) sameAge.push(s)
    else if (c.age === me.age + 1) olderAge.push(s)
  }
  const byLevel = (a: Sibling, b: Sibling) => a.category.levelRank - b.category.levelRank || a.team_name.localeCompare(b.team_name, 'fi')
  return { sameAge: sameAge.sort(byLevel), olderAge: olderAge.sort(byLevel) }
}

// ── Formatting ─────────────────────────────────────────────────────────────

/** "3./11 · 4–3 · 294–231" */
export function formatStanding(s: Standing): string {
  const pos = s.position != null ? `${s.position}./${s.teams}` : `–/${s.teams}`
  return `${pos} · ${s.won}–${s.lost} · ${s.pointsFor}–${s.pointsAgainst}`
}

/** "päivitetty 14.11. klo 16.50" (Helsinki). */
export function formatUpdated(at: number): string {
  if (!Number.isFinite(at) || at <= 0) return ''
  const fmt = new Intl.DateTimeFormat('fi-FI', {
    timeZone: 'Europe/Helsinki',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const p = Object.fromEntries(fmt.formatToParts(new Date(at)).map((x) => [x.type, x.value]))
  return `päivitetty ${p.day}.${p.month}. klo ${p.hour}.${p.minute}`
}

// ── Cache on the phone (TTL, stale copy kept for failures) ─────────────────

export interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem?: (key: string) => void
}

export const FOREVER = Number.POSITIVE_INFINITY
export const HOUR = 60 * 60 * 1000

interface Stored<T> {
  at: number
  ttl: number | null
  data: T
}

export interface CachedValue<T> {
  data: T
  at: number
  stale: boolean
}

export function createTtlCache(storage: StorageLike | null, prefix = 'bb:') {
  const mem = new Map<string, Stored<unknown>>()
  function read<T>(key: string): Stored<T> | null {
    const k = prefix + key
    const m = mem.get(k)
    if (m) return m as Stored<T>
    if (!storage) return null
    try {
      const raw = storage.getItem(k)
      if (!raw) return null
      const parsed = JSON.parse(raw) as Stored<T>
      if (!parsed || typeof parsed.at !== 'number' || !('data' in parsed)) return null
      mem.set(k, parsed)
      return parsed
    } catch {
      return null
    }
  }
  function write<T>(key: string, data: T, ttl: number, at: number) {
    const k = prefix + key
    const entry: Stored<T> = { at, ttl: Number.isFinite(ttl) ? ttl : null, data }
    mem.set(k, entry)
    if (!storage) return
    try {
      storage.setItem(k, JSON.stringify(entry))
    } catch {
      /* storage full: keep the in-memory copy only */
    }
  }
  function fresh(e: Stored<unknown>, now: number, notBefore = 0): boolean {
    if (e.at < notBefore) return false
    return e.ttl === null || now - e.at < e.ttl
  }
  return {
    peek<T>(key: string): CachedValue<T> | null {
      const e = read<T>(key)
      return e ? { data: e.data, at: e.at, stale: !fresh(e, Date.now()) } : null
    },
    /**
     * Fresh copy if there is one; otherwise fetch. A failed fetch falls back to the
     * last saved copy (stale: true) and only throws when nothing was ever saved.
     */
    async get<T>(key: string, ttl: number, fetcher: () => Promise<T>, opts: { notBefore?: number; now?: () => number } = {}): Promise<CachedValue<T>> {
      const now = opts.now ? opts.now() : Date.now()
      const e = read<T>(key)
      if (e && fresh(e, now, opts.notBefore)) return { data: e.data, at: e.at, stale: false }
      try {
        const data = await fetcher()
        write(key, data, ttl, now)
        return { data, at: now, stale: false }
      } catch (err) {
        if (e) return { data: e.data, at: e.at, stale: true }
        throw err
      }
    },
  }
}

export const PREDECESSORS_KEY = 'basket.predecessors.v1'

/** Phone-saved "last season's team" choices: {teamId: [teamId]} with digits-only ids. */
export function parsePredecessorChoices(raw: string | null): Record<string, string[]> {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, string[]> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!/^\d+$/.test(k) || !Array.isArray(v)) continue
      const ids = v.map(String).filter((x) => /^\d+$/.test(x) && x !== k)
      if (ids.length) out[k] = ids.slice(0, 3)
    }
    return out
  } catch {
    return {}
  }
}
