/**
 * Loads "Joukkueiden tausta" for one team in one game. Signed TASO calls,
 * cached on the phone (localStorage) with the TTLs of the design:
 * finished seasons forever, current standings 6 h (refetched after a played
 * game of the group), getTeam 24 h, club team index 24 h (previous season 7 d).
 * A failed call falls back to the last saved copy and marks it stale.
 */
import { fetchTasoRaw } from './basketApi.ts'
import {
  buildClubIndex,
  clubSiblings,
  confirmedPredecessor,
  createTtlCache,
  earlierGroups,
  FOREVER,
  historyRow,
  HOUR,
  isSeriesGroup,
  nationalCompetitionId,
  parseCategoryName,
  parsePredecessorChoices,
  pickGuess,
  PREDECESSORS_KEY,
  previousCompetitionId,
  previousSeason,
  scoreCandidates,
  seasonBlocks,
  seriesLabel,
  standingFor,
  type CachedValue,
  type ClubIndex,
  type ClubTeamRow,
  type GroupTeamRow,
  type KnockoutMatch,
  type LinkSource,
  type Official,
  type ParsedCategory,
  type ScoredCandidate,
  type SeasonBlock,
  type Sibling,
  type Standing,
  type StorageLike,
  type TasoGroupRef,
} from '../utils/teamHistory.ts'

export interface SlimTeam {
  teamId: string
  teamName: string
  clubId: string
  clubName: string
  primaryCategory: string
  officials: Official[]
  groups: TasoGroupRef[]
}

export interface GameContext {
  competitionId: string
  categoryId: string
  groupId: string
  /** "2026-2027" — derived from the team's current group when missing. */
  season?: string
  /** Kickoff ms when the game is already played: standings older than that are refetched. */
  playedAt?: number
}

export interface CurrentRow {
  short: string
  series: string
  standing: Standing | null
  competitionId: string
  categoryId: string
  groupId: string
  /** Autumn series and no spring group drawn yet this season. */
  springPending: boolean
}

export interface SiblingRow extends Sibling {
  standing: Standing | null
  series: string
  groupRef?: { competitionId: string; categoryId: string; groupId: string }
}

export interface TeamBackground {
  teamId: string
  teamName: string
  clubId: string
  clubName: string
  current: CurrentRow | null
  link: {
    source: LinkSource
    teamIds: string[]
    teamNames: string[]
    reasons: string[]
  }
  seasons: SeasonBlock[]
  siblings: { sameAge: SiblingRow[]; olderAge: SiblingRow[] }
  updatedAt: number
  stale: boolean
  errors: string[]
}

function safeStorage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

const cache = createTtlCache(safeStorage())

type Tracker = { oldest: number; stale: boolean; errors: string[] }

function track<T>(t: Tracker, v: CachedValue<T>): T {
  if (v.at < t.oldest) t.oldest = v.at
  if (v.stale) t.stale = true
  return v.data
}

function s(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

async function getTeam(teamId: string, t: Tracker): Promise<SlimTeam | null> {
  const v = await cache.get<SlimTeam | null>(`team:${teamId}`, 24 * HOUR, async () => {
    const data = await fetchTasoRaw(`getTeam?team_id=${encodeURIComponent(teamId)}`)
    const raw = data.team as Record<string, unknown> | undefined
    if (!raw || !s(raw.team_id)) return null
    const groups = Array.isArray(raw.groups) ? (raw.groups as Record<string, unknown>[]) : []
    const officials = Array.isArray(raw.officials) ? (raw.officials as Record<string, unknown>[]) : []
    return {
      teamId: s(raw.team_id),
      teamName: s(raw.team_name),
      clubId: s(raw.club_id),
      clubName: s(raw.club_name),
      primaryCategory: s((raw.primary_category as Record<string, unknown> | undefined)?.category_name),
      officials: officials.map((o) => ({ first_name: s(o.first_name), last_name: s(o.last_name), official_role: s(o.official_role) })),
      groups: groups.map((g) => ({
        competition_id: s(g.competition_id),
        competition_season: s(g.competition_season),
        category_id: s(g.category_id),
        category_name: s(g.category_name),
        group_id: s(g.group_id),
        group_name: s(g.group_name),
        group_type: s(g.group_type),
        group_current: s(g.group_current),
        competition_status: s(g.competition_status),
      })),
    }
  })
  return track(t, v)
}

const TEAM_ROW_KEYS = ['team_id', 'team_name', 'current_standing', 'matches_played', 'matches_won', 'matches_lost', 'goals_for', 'goals_against'] as const

async function getGroupTeams(
  comp: string,
  cat: string,
  group: string,
  finished: boolean,
  t: Tracker,
  notBefore = 0,
): Promise<GroupTeamRow[]> {
  const v = await cache.get<GroupTeamRow[]>(
    `grp:${comp}:${cat}:${group}`,
    finished ? FOREVER : 6 * HOUR,
    async () => {
      const data = await fetchTasoRaw(
        `getGroup?competition_id=${encodeURIComponent(comp)}&category_id=${encodeURIComponent(cat)}&group_id=${encodeURIComponent(group)}`,
      )
      const g = data.group as Record<string, unknown> | undefined
      const teams = Array.isArray(g?.teams) ? (g!.teams as Record<string, unknown>[]) : []
      return teams.map((row) => {
        const out: Record<string, unknown> = {}
        for (const k of TEAM_ROW_KEYS) out[k] = row[k] ?? null
        return out as unknown as GroupTeamRow
      })
    },
    { notBefore: finished ? 0 : notBefore },
  )
  return track(t, v)
}

async function getKnockoutMatches(comp: string, cat: string, group: string, finished: boolean, t: Tracker): Promise<KnockoutMatch[]> {
  const v = await cache.get<KnockoutMatch[]>(`ko:${comp}:${cat}:${group}`, finished ? FOREVER : 6 * HOUR, async () => {
    const data = await fetchTasoRaw(
      `getMatches?competition_id=${encodeURIComponent(comp)}&category_id=${encodeURIComponent(cat)}&group_id=${encodeURIComponent(group)}`,
    )
    const ms = Array.isArray(data.matches) ? (data.matches as Record<string, unknown>[]) : []
    return ms.map((m) => ({
      match_id: s(m.match_id),
      team_A_id: s(m.team_A_id),
      team_B_id: s(m.team_B_id),
      status: s(m.status),
      round_id: s(m.round_id),
      winner_id: s(m.winner_id),
    }))
  })
  return track(t, v)
}

/** Club index of one competition. The full TASO list (~450 KB) is slimmed to 5 fields per team before saving. */
async function getClubIndex(comp: string, ttl: number, t: Tracker): Promise<ClubIndex> {
  const v = await cache.get<ClubIndex>(`clubidx:${comp}`, ttl, async () => {
    const data = await fetchTasoRaw(`getTeams?competition_id=${encodeURIComponent(comp)}`)
    const rows = Array.isArray(data.teams) ? (data.teams as Array<Partial<ClubTeamRow>>) : []
    return buildClubIndex(rows, comp)
  })
  return track(t, v)
}

export function loadPredecessorChoices(): Record<string, string[]> {
  return parsePredecessorChoices(safeStorage()?.getItem(PREDECESSORS_KEY) ?? null)
}

export function savePredecessorChoice(teamId: string, predecessorId: string | null): void {
  const st = safeStorage()
  if (!st) return
  const all = loadPredecessorChoices()
  if (predecessorId) all[teamId] = [predecessorId]
  else delete all[teamId]
  try {
    st.setItem(PREDECESSORS_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

function currentGroupOf(team: SlimTeam, ctx: GameContext): TasoGroupRef | undefined {
  return (
    team.groups.find((g) => g.competition_id === ctx.competitionId && g.category_id === ctx.categoryId && g.group_id === ctx.groupId) ||
    team.groups.find((g) => isSeriesGroup(g) && g.group_current === '1' && g.competition_status !== 'archived')
  )
}

function isFinishedSeason(season: string, currentSeason: string): boolean {
  return Boolean(season) && season < currentSeason
}

/** Last season's same-club candidates (for the guess and the "Valitse" picker). */
export async function loadCandidates(teamId: string, ctx: GameContext): Promise<ScoredCandidate[]> {
  const t: Tracker = { oldest: Date.now(), stale: false, errors: [] }
  const team = await getTeam(teamId, t)
  if (!team) return []
  return candidatesFor(team, ctx, t)
}

async function candidatesFor(team: SlimTeam, ctx: GameContext, t: Tracker): Promise<ScoredCandidate[]> {
  const cur = currentGroupOf(team, ctx)
  const comp = cur?.competition_id || ctx.competitionId
  const prevComps = [previousCompetitionId(comp), previousCompetitionId(nationalCompetitionId(comp))].filter(
    (c, i, a) => c && a.indexOf(c) === i,
  )
  const rows: ClubTeamRow[] = []
  for (const pc of prevComps) {
    try {
      const idx = await getClubIndex(pc, 7 * 24 * HOUR, t)
      rows.push(...(idx[team.clubId] || []))
    } catch (err) {
      t.errors.push(err instanceof Error ? err.message : String(err))
    }
  }
  const me = parseCategoryName(cur?.category_name || team.primaryCategory)
  const pre = rows.filter((r) => {
    const c = parseCategoryName(r.category_name)
    return c.gender === me.gender && c.age != null && me.age != null && (c.age === me.age || c.age === me.age - 1)
  })
  const unique = [...new Map(pre.map((r) => [r.team_id, r])).values()].slice(0, 8)
  const detailed = await Promise.all(
    unique.map(async (r) => {
      const ct = await getTeam(r.team_id, t).catch(() => null)
      return { teamId: r.team_id, teamName: r.team_name, categoryName: r.category_name, officials: ct?.officials || [] }
    }),
  )
  return scoreCandidates(
    { teamId: team.teamId, teamName: team.teamName, categoryName: cur?.category_name || team.primaryCategory, officials: team.officials },
    detailed,
  )
}

export async function loadTeamBackground(teamId: string, ctx: GameContext): Promise<TeamBackground> {
  const t: Tracker = { oldest: Date.now(), stale: false, errors: [] }
  const team = await getTeam(teamId, t)
  if (!team) throw new Error(`Basket.fi: ei joukkuetta ${teamId}`)
  const curGroup = currentGroupOf(team, ctx)
  const currentSeason = ctx.season || curGroup?.competition_season || ''

  // Current standing
  let current: CurrentRow | null = null
  if (curGroup) {
    const cat = parseCategoryName(curGroup.category_name)
    let standing: Standing | null = null
    if (!cat.noResults) {
      try {
        const teams = await getGroupTeams(curGroup.competition_id, curGroup.category_id, curGroup.group_id, false, t, ctx.playedAt ?? 0)
        standing = standingFor(teams, teamId)
      } catch (err) {
        t.errors.push(err instanceof Error ? err.message : String(err))
      }
    }
    current = {
      short: cat.short,
      series: seriesLabel(curGroup.group_name, curGroup.group_type),
      standing,
      competitionId: curGroup.competition_id,
      categoryId: curGroup.category_id,
      groupId: curGroup.group_id,
      springPending:
        seriesLabel(curGroup.group_name, curGroup.group_type) === 'Syksy' &&
        !team.groups.some((g) => g.competition_season === currentSeason && isSeriesGroup(g) && seriesLabel(g.group_name, g.group_type) !== 'Syksy'),
    }
  }

  // Which team's earlier groups to show
  let source: LinkSource = 'none'
  let linkIds: string[] = []
  let reasons: string[] = []
  const historyTeams: SlimTeam[] = []
  let earlier = earlierGroups(team.groups, currentSeason)
  if (earlier.length) {
    source = 'exact'
    linkIds = [team.teamId]
    historyTeams.push(team)
  } else {
    const confirmed = confirmedPredecessor(teamId, loadPredecessorChoices())
    if (confirmed) {
      source = confirmed.source
      linkIds = confirmed.teamIds
    } else {
      try {
        const scored = await candidatesFor(team, ctx, t)
        const guess = pickGuess(scored)
        if (guess) {
          source = 'guess'
          linkIds = [guess.teamId]
          reasons = guess.reasons
        }
      } catch (err) {
        t.errors.push(err instanceof Error ? err.message : String(err))
      }
    }
    for (const id of linkIds) {
      const p = await getTeam(id, t).catch(() => null)
      if (p) historyTeams.push(p)
    }
    // Follow one more step if the predecessor itself was confirmed onward (max 3 levels).
    let hop = 0
    while (hop < 2 && historyTeams.length) {
      const last = historyTeams[historyTeams.length - 1]
      const lastSeason = earlierGroups(last.groups, currentSeason).at(-1)?.competition_season || ''
      const onward = confirmedPredecessor(last.teamId, loadPredecessorChoices())
      if (!onward || !lastSeason) break
      const p = await getTeam(onward.teamIds[0], t).catch(() => null)
      if (!p || historyTeams.some((h) => h.teamId === p.teamId)) break
      historyTeams.push(p)
      hop++
    }
    earlier = []
    let ceiling = currentSeason
    for (const h of historyTeams) {
      const gs = earlierGroups(h.groups, ceiling)
      earlier.push(...gs.map((g) => ({ ...g, _team: h.teamId }) as TasoGroupRef))
      const oldest = gs.at(-1)?.competition_season
      if (oldest) ceiling = oldest
    }
  }

  // Load series rows (mikro rows need no call)
  const teamsCache = new Map<string, GroupTeamRow[]>()
  const koCache = new Map<string, KnockoutMatch[]>()
  await Promise.all(
    earlier.map(async (g) => {
      if (parseCategoryName(g.category_name).noResults) return
      const key = `${g.competition_id}:${g.category_id}:${g.group_id}`
      const finished = isFinishedSeason(g.competition_season, currentSeason)
      try {
        if (/knockout/.test(g.group_type)) koCache.set(key, await getKnockoutMatches(g.competition_id, g.category_id, g.group_id, finished, t))
        else teamsCache.set(key, await getGroupTeams(g.competition_id, g.category_id, g.group_id, finished, t))
      } catch (err) {
        t.errors.push(err instanceof Error ? err.message : String(err))
      }
    }),
  )
  const lookup = {
    teams: (c: string, k: string, gr: string) => teamsCache.get(`${c}:${k}:${gr}`),
    matches: (c: string, k: string, gr: string) => koCache.get(`${c}:${k}:${gr}`),
  }
  const rows = earlier.map((g) => {
    const owner = (g as TasoGroupRef & { _team?: string })._team || team.teamId
    return historyRow(g, owner, lookup, isFinishedSeason(g.competition_season, currentSeason))
  })
  const seasons = seasonBlocks(rows)

  // Club siblings (same age; age +1 collapsed)
  const siblings: TeamBackground['siblings'] = { sameAge: [], olderAge: [] }
  if (curGroup && team.clubId) {
    const comps = [
      ...new Set(
        [curGroup.competition_id, nationalCompetitionId(curGroup.competition_id), ...team.groups.filter((g) => g.competition_season === currentSeason && isSeriesGroup(g)).map((g) => g.competition_id)].filter(Boolean),
      ),
    ]
    const clubRows: ClubTeamRow[] = []
    for (const c of comps) {
      try {
        const idx = await getClubIndex(c, 24 * HOUR, t)
        clubRows.push(...(idx[team.clubId] || []))
      } catch (err) {
        t.errors.push(err instanceof Error ? err.message : String(err))
      }
    }
    const sib = clubSiblings(clubRows, curGroup.category_name, [team.teamId])
    const withStanding = async (x: Sibling): Promise<SiblingRow> => {
      const st = await getTeam(x.team_id, t).catch(() => null)
      const gs = (st?.groups || []).filter(
        (g) => g.competition_id === x.competition_id && g.category_id === x.category_id && isSeriesGroup(g),
      )
      const g = gs.find((y) => y.group_current === '1') || gs.at(-1)
      if (!g || x.category.noResults) return { ...x, standing: null, series: g ? seriesLabel(g.group_name, g.group_type) : '' }
      let standing: Standing | null = null
      try {
        if (!/knockout/.test(g.group_type)) standing = standingFor(await getGroupTeams(g.competition_id, g.category_id, g.group_id, false, t), x.team_id)
      } catch (err) {
        t.errors.push(err instanceof Error ? err.message : String(err))
      }
      return {
        ...x,
        standing,
        series: seriesLabel(g.group_name, g.group_type),
        groupRef: { competitionId: g.competition_id, categoryId: g.category_id, groupId: g.group_id },
      }
    }
    siblings.sameAge = await Promise.all(sib.sameAge.map(withStanding))
    siblings.olderAge = await Promise.all(sib.olderAge.map(withStanding))
  }

  return {
    teamId: team.teamId,
    teamName: team.teamName,
    clubId: team.clubId,
    clubName: team.clubName,
    current,
    link: {
      source,
      teamIds: linkIds,
      teamNames: historyTeams.filter((h) => h.teamId !== team.teamId).map((h) => {
        const g = earlierGroups(h.groups, currentSeason)[0]
        return `${h.teamName}${g ? ` ${parseCategoryName(g.category_name).short} (${previousSeason(currentSeason) === g.competition_season ? 'viime kausi' : g.competition_season})` : ''}`
      }),
      reasons,
    },
    seasons,
    siblings,
    updatedAt: t.oldest,
    stale: t.stale,
    errors: t.errors,
  }
}

export type { ParsedCategory, ScoredCandidate, SeasonBlock, Standing }
