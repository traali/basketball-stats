/**
 * Search over real Basket.fi (TASO) data. Nothing is invented: a hit is shown
 * only if the API returned it.
 *
 * TASO has no name search for basketball (getPlayers is "Unkown method",
 * getTeams needs a competition + category). So:
 *   clubs   getClubs (all ~200), matched on name / abbreviation / city
 *   teams   getClub → its teams (current season first), matched on the
 *           rest of the query (age group, category, team name)
 *   players getTeam rosters of the matched club's current teams (or of the
 *           saved favourite teams), matched on the rest of the query
 *   ids     looked up with getMatch / getTeam / getPlayer / getClub
 */
import type {
  BasketCategory,
  BasketClubDetail,
  BasketClubSummary,
  BasketClubTeam,
  BasketCompetition,
  BasketRosterPlayer,
  DiscoveryHit,
} from '../types/basketball'

export type ParsedQuery =
  | { kind: 'match' | 'team' | 'player' | 'club'; id: string }
  | { kind: 'text'; q: string }

export interface LookupHit {
  title: string
  subtitle: string
}

export interface SearchDeps {
  clubs: () => Promise<BasketClubSummary[]>
  club: (clubId: string) => Promise<BasketClubDetail | null>
  roster: (teamId: string) => Promise<BasketRosterPlayer[]>
  competitions: () => Promise<BasketCompetition[]>
  categories: (competitionId: string) => Promise<BasketCategory[]>
  match: (id: string) => Promise<LookupHit | null>
  team: (id: string) => Promise<LookupHit | null>
  player: (id: string) => Promise<LookupHit | null>
  clubById: (id: string) => Promise<LookupHit | null>
}

export interface SearchOptions {
  /** Saved favourite teams: their rosters are searched for a bare player name. */
  favoriteTeams?: Array<{ id: string; name: string }>
  /** Max rosters fetched for one player search. */
  maxRosters?: number
}

export interface SearchOutcome {
  hits: DiscoveryHit[]
  /** Basket.fi could not be reached: show "haku epäonnistui", not "no hits". */
  failed: boolean
  /** Short honest note, e.g. how to search for a player. */
  hint?: string
}

const MAX_CLUBS = 8
const EXPAND_CLUBS = 3
const MAX_TEAMS = 40
const MAX_PLAYERS = 30
const MAX_CATEGORIES = 15

export function normalizeSearch(q: string): string {
  return q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function words(text: string): string[] {
  return normalizeSearch(text).split(' ').filter(Boolean)
}

/** A query token matches a word prefix; "u16" also matches "16-vuotiaat". */
export function tokenMatches(token: string, hayWords: string[]): boolean {
  if (hayWords.some((w) => w.startsWith(token))) return true
  const age = token.match(/^u(\d{1,2})$/)
  if (age) return hayWords.includes(age[1])
  return false
}

function allMatch(tokens: string[], hayWords: string[]): boolean {
  return tokens.every((t) => tokenMatches(t, hayWords))
}

function clubWords(c: BasketClubSummary): string[] {
  return words(`${c.name} ${c.abbreviation} ${c.cityName}`)
}

export function teamWords(t: BasketClubTeam): string[] {
  return words(`${t.teamName} ${t.categoryName} ${t.ageGroup || ''} ${t.gender || ''}`)
}

function looksLikeName(tokens: string[]): boolean {
  // Letters (digits allowed after a letter), but not an age group like "u16".
  return tokens.length > 0 && tokens.every((t) => /^[a-z][a-z0-9]+$/.test(t) && !/^u\d{1,2}$/.test(t))
}

/** Teams playing this season; archived/older teams only if there are none. */
export function currentTeams(club: BasketClubDetail): BasketClubTeam[] {
  const active = club.teams.filter((t) => t.status === 'active')
  const current = active.filter((t) => t.current)
  return current.length ? current : active
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      try {
        out[i] = { status: 'fulfilled', value: await fn(items[i]) }
      } catch (reason) {
        out[i] = { status: 'rejected', reason }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

interface RosterSource {
  teamId: string
  label: string
}

async function scanRosters(
  sources: RosterSource[],
  nameTokens: string[],
  deps: SearchDeps,
  limit: number,
): Promise<{ hits: DiscoveryHit[]; failed: boolean }> {
  const picked = sources.slice(0, limit)
  const results = await mapLimit(picked, 6, (s) => deps.roster(s.teamId))
  const failed = picked.length > 0 && results.every((r) => r.status === 'rejected')
  const seen = new Set<string>()
  const hits: DiscoveryHit[] = []
  results.forEach((r, i) => {
    if (r.status !== 'fulfilled') return
    for (const p of r.value) {
      if (!p.playerId || seen.has(p.playerId)) continue
      if (!allMatch(nameTokens, words(p.fullName))) continue
      seen.add(p.playerId)
      hits.push({
        kind: 'player',
        id: p.playerId,
        title: p.fullName,
        subtitle: [p.shirtNumber ? `#${p.shirtNumber}` : '', picked[i].label].filter(Boolean).join(' · '),
      })
    }
  })
  return { hits: hits.slice(0, MAX_PLAYERS), failed }
}

async function lookupIds(id: string, kinds: Array<'match' | 'team' | 'player' | 'club'>, deps: SearchDeps): Promise<SearchOutcome> {
  const fns = { match: deps.match, team: deps.team, player: deps.player, club: deps.clubById }
  const results = await Promise.allSettled(kinds.map((k) => fns[k](id)))
  const hits: DiscoveryHit[] = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) hits.push({ kind: kinds[i], id, ...r.value })
  })
  if (hits.length) return { hits, failed: false }
  if (results.every((r) => r.status === 'rejected')) return { hits, failed: true }
  return { hits, failed: false, hint: `Basket.fi ei tunne tunnusta ${id}.` }
}

export async function searchBasket(parsed: ParsedQuery, deps: SearchDeps, opts: SearchOptions = {}): Promise<SearchOutcome> {
  if (parsed.kind !== 'text') {
    // A bare number may be a game, team or player id; a URL names its kind.
    return lookupIds(parsed.id, [parsed.kind], deps)
  }
  return searchText(parsed.q, deps, opts)
}

/** A bare 4-8 digit number: try it as a game, team and player id. */
export async function searchNumber(id: string, deps: SearchDeps): Promise<SearchOutcome> {
  return lookupIds(id, ['match', 'team', 'player'], deps)
}

async function searchText(raw: string, deps: SearchDeps, opts: SearchOptions): Promise<SearchOutcome> {
  const q = normalizeSearch(raw)
  const tokens = q.split(' ').filter(Boolean)
  if (q.length < 2) return { hits: [], failed: false }
  const maxRosters = opts.maxRosters ?? 60

  let clubs: BasketClubSummary[]
  try {
    clubs = await deps.clubs()
  } catch {
    return { hits: [], failed: true }
  }

  const scored = clubs
    .map((c) => {
      const hay = clubWords(c)
      const matched = tokens.filter((t) => tokenMatches(t, hay))
      const abbr = normalizeSearch(c.abbreviation)
      return { club: c, matched, exact: abbr === q || normalizeSearch(c.name) === q }
    })
    .filter((s) => s.matched.length > 0)
  const best = scored.reduce((m, s) => Math.max(m, s.matched.length), 0)
  const topClubs = scored
    .filter((s) => s.matched.length === best)
    .sort((a, b) => Number(b.exact) - Number(a.exact) || a.club.name.localeCompare(b.club.name, 'fi'))
    .slice(0, MAX_CLUBS)

  const hits: DiscoveryHit[] = topClubs.map(({ club }) => ({
    kind: 'club',
    id: club.clubId,
    title: club.name,
    subtitle: [club.abbreviation !== club.name ? club.abbreviation : '', club.cityName].filter(Boolean).join(' · '),
    crest: club.crest,
  }))

  let failed = false
  let hint: string | undefined

  if (topClubs.length) {
    const expand = topClubs.slice(0, EXPAND_CLUBS)
    const details = await Promise.allSettled(expand.map((s) => deps.club(s.club.clubId)))
    if (details.every((d) => d.status === 'rejected')) failed = true

    const teamHits: DiscoveryHit[] = []
    const rosterSources: RosterSource[] = []
    let restForPlayers: string[] = []
    const scannedClubs: string[] = []
    details.forEach((d, i) => {
      if (d.status !== 'fulfilled' || !d.value) return
      const club = d.value
      const rest = tokens.filter((t) => !expand[i].matched.includes(t))
      const teams = currentTeams(club)
      const matching = rest.length ? teams.filter((t) => allMatch(rest, teamWords(t))) : teams
      for (const t of matching) {
        teamHits.push({
          kind: 'team',
          id: t.teamId,
          title: t.teamName,
          subtitle: [t.categoryName, t.season].filter(Boolean).join(' · ') || club.name,
        })
      }
      if (rest.length && matching.length === 0 && looksLikeName(rest)) {
        restForPlayers = rest
        scannedClubs.push(club.abbreviation || club.name)
        for (const t of teams) {
          rosterSources.push({ teamId: t.teamId, label: [t.teamName, t.categoryName].filter(Boolean).join(' · ') })
        }
      }
    })
    hits.push(...dedupe(teamHits).slice(0, MAX_TEAMS))

    if (rosterSources.length) {
      const scan = await scanRosters(rosterSources, restForPlayers, deps, maxRosters)
      hits.push(...scan.hits)
      if (scan.failed) failed = true
      else if (!scan.hits.length) {
        hint = `Ei pelaajaa «${restForPlayers.join(' ')}» seurojen ${scannedClubs.join(', ')} tämän kauden kokoonpanoissa.`
      }
    }
  } else {
    // No club in the query: favourite teams' rosters, then competitions and age groups.
    const favTeams = (opts.favoriteTeams || []).filter((t) => t.id)
    if (looksLikeName(tokens) && favTeams.length) {
      const scan = await scanRosters(
        favTeams.map((t) => ({ teamId: t.id, label: t.name })),
        tokens,
        deps,
        maxRosters,
      )
      hits.push(...scan.hits)
    }

    const comps = await deps.competitions().catch(() => [] as BasketCompetition[])
    for (const c of comps) {
      if (allMatch(tokens, words(`${c.competitionName} ${c.organiser || ''}`))) {
        hits.push({ kind: 'competition', id: c.competitionId, title: c.competitionName, subtitle: c.seasonId })
      }
    }

    const newest = comps.reduce((m, c) => (c.seasonId > m ? c.seasonId : m), '')
    const catSources = comps.filter((c) => c.seasonId === newest)
    const lists = await Promise.allSettled(catSources.map((c) => deps.categories(c.competitionId)))
    const catHits: DiscoveryHit[] = []
    for (const l of lists) {
      if (l.status !== 'fulfilled') continue
      for (const cat of l.value) {
        if (!allMatch(tokens, words(`${cat.categoryName} ${cat.ageGroup || ''}`))) continue
        catHits.push({
          kind: 'category',
          id: `${cat.competitionId}::${cat.categoryId}`,
          title: cat.categoryName,
          subtitle: cat.competitionName,
        })
      }
    }
    hits.push(...catHits.slice(0, MAX_CATEGORIES))

    if (!hits.some((h) => h.kind === 'player') && looksLikeName(tokens)) {
      hint = `Basket.fi ei tarjoa pelaajien nimihakua${favTeams.length ? ' (suosikkijoukkueiden kokoonpanot katsottu)' : ''}. Kirjoita seura ja nimi, esim. «Pyrintö Virtanen».`
    }
  }

  return { hits: dedupe(hits), failed: failed && hits.length === 0, hint }
}

function dedupe(hits: DiscoveryHit[]): DiscoveryHit[] {
  const seen = new Set<string>()
  return hits.filter((h) => {
    const key = `${h.kind}:${h.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
