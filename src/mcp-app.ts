/**
 * Basketball WebMCP tools for native Chrome and ChatGPT Desktop/Sites.
 * Registers on document.modelContext.registerTool — never overwrites the host getter.
 */

import {
  fetchBasketMatch,
  fetchBasketGroup,
  fetchBasketTeamProfile,
  fetchBasketPlayer,
  pickCurrentGroup,
  mapGroupTeamsToStandings,
  searchDiscovery,
} from './services/basketApi'
import { buildBasketballStatsContract } from './types/contracts'
import {
  connectModelContext,
  detectWebMcpConsumer,
  publishWebMcpStatus,
  type ModelContextTool,
} from './webmcp'

function textResult(text: string, extra?: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text }],
    summary: text,
    ...extra,
  }
}

async function getBasketballGameCardTool(args: Record<string, unknown>) {
  const matchId = String(args.matchId || '').trim()
  if (!matchId) {
    return textResult('matchId is required (Basket.fi match id). Do not invent one.')
  }

  const match = await fetchBasketMatch(matchId)
  if (!match) {
    return textResult(`Match ${matchId} was not found on Basket.fi.`)
  }

  const contract = buildBasketballStatsContract({
    matchId: match.matchId,
    homeTeamName: match.homeTeamName,
    awayTeamName: match.awayTeamName,
    scoreHome: match.scoreHome,
    scoreAway: match.scoreAway,
    quarters: match.quarters,
    teamFoulsHome: match.teamFoulsHome,
    teamFoulsAway: match.teamFoulsAway,
    leaders: match.leaders,
  })

  const qScores = match.quarters.map((q) => `Q${q.quarter}: ${q.scoreHome}–${q.scoreAway}`).join(', ')
  const summary =
    match.phase === 'upcoming'
      ? `${match.homeTeamName} vs ${match.awayTeamName} (${match.competitionName}) — upcoming ${match.date} ${match.time}.`
      : `${match.homeTeamName} ${match.scoreHome}–${match.scoreAway} ${match.awayTeamName} (${match.competitionName}). Quarters: ${qScores}. Top scorer: ${match.leaders[0]?.playerName || 'n/a'} (${match.leaders[0]?.points || 0} pts).`

  return {
    content: [{ type: 'text' as const, text: summary }],
    summary,
    match: {
      matchId: match.matchId,
      phase: match.phase,
      homeTeamName: match.homeTeamName,
      awayTeamName: match.awayTeamName,
      scoreHome: match.scoreHome,
      scoreAway: match.scoreAway,
      quarters: match.quarters,
      teamFoulsHome: match.teamFoulsHome,
      teamFoulsAway: match.teamFoulsAway,
      venueName: match.venueName,
      date: match.date,
      time: match.time,
    },
    contract,
  }
}

async function getBasketballStandingsTool(args: Record<string, unknown>) {
  const teamId = String(args.teamId || '').trim()
  const competitionId = String(args.competitionId || '').trim()
  const categoryId = String(args.categoryId || '').trim()
  const groupId = String(args.groupId || '').trim()

  let group = null
  if (competitionId && categoryId && groupId) {
    group = await fetchBasketGroup(competitionId, categoryId, groupId)
  } else if (teamId) {
    const profile = await fetchBasketTeamProfile(teamId)
    const current = profile ? pickCurrentGroup(profile.groups) : null
    if (current) {
      group = await fetchBasketGroup(current.competitionId, current.categoryId, current.groupId)
    }
  }

  if (!group) {
    return textResult('Need teamId or competitionId+categoryId+groupId. Dummy tables are not allowed.')
  }

  const standings = mapGroupTeamsToStandings(group.teams, group.matches)
  const summary = `${group.competitionName} · ${group.categoryName} · ${group.groupName}: ${standings.length} teams.`
  return {
    content: [{ type: 'text' as const, text: summary }],
    summary,
    group: {
      groupId: group.groupId,
      groupName: group.groupName,
      competitionName: group.competitionName,
      categoryName: group.categoryName,
    },
    teams: standings,
    pointsRule: '2 points for a win, 1 for a loss (Basket.fi)',
  }
}

async function searchBasketballTool(args: Record<string, unknown>) {
  const query = String(args.query || args.q || '').trim()
  if (query.length < 2) {
    return textResult('query is required (club, team, player, competition, or a basket.fi URL).')
  }
  const hits = await searchDiscovery(query)
  const summary =
    hits.length === 0
      ? `No Basket.fi hits for «${query}».`
      : hits
          .slice(0, 12)
          .map((h) => `${h.kind} ${h.title}${h.subtitle ? ` — ${h.subtitle}` : ''} (${h.id})`)
          .join('\n')
  return {
    content: [{ type: 'text' as const, text: summary }],
    summary,
    hits: hits.slice(0, 20),
  }
}

async function getBasketballTeamTool(args: Record<string, unknown>) {
  const teamId = String(args.teamId || '').trim()
  if (!teamId) return textResult('teamId is required.')
  const profile = await fetchBasketTeamProfile(teamId)
  if (!profile) return textResult(`Team ${teamId} was not found.`)
  const summary = `${profile.teamName} · ${profile.categoryName || ''} · ${profile.fixtures.length} fixtures.`
  return {
    content: [{ type: 'text' as const, text: summary }],
    summary,
    team: {
      teamId: profile.teamId,
      teamName: profile.teamName,
      categoryName: profile.categoryName,
      clubName: profile.clubName,
      groups: profile.groups,
    },
  }
}

async function getBasketballPlayerTool(args: Record<string, unknown>) {
  const playerId = String(args.playerId || '').trim()
  if (!playerId) return textResult('playerId is required.')
  const player = await fetchBasketPlayer(playerId)
  if (!player) return textResult(`Player ${playerId} was not found.`)
  const summary = `${player.fullName} · ${player.teams.map((t) => t.teamName).join(', ') || 'no team'}`
  return {
    content: [{ type: 'text' as const, text: summary }],
    summary,
    player,
  }
}

async function openBasketballResourceTool(args: Record<string, unknown>) {
  const kind = String(args.kind || '').trim()
  const id = String(args.id || args.query || '').trim()
  const allowed = new Set(['match', 'team', 'player', 'club', 'search', 'browse', 'favorites'])
  if (!allowed.has(kind)) {
    return textResult('kind must be match, team, player, club, search, browse, or favorites.')
  }
  if (typeof window === 'undefined') return textResult('No window to navigate.')
  const path =
    kind === 'search'
      ? id
        ? `#/search?q=${encodeURIComponent(id)}`
        : '#/search'
      : kind === 'browse' || kind === 'favorites'
        ? `#/${kind}`
        : `#/${kind}/${encodeURIComponent(id)}`
  if ((kind === 'match' || kind === 'team' || kind === 'player' || kind === 'club') && !id) {
    return textResult(`${kind} needs id.`)
  }
  window.location.hash = path
  const summary = `Opened ${path}`
  return { content: [{ type: 'text' as const, text: summary }], summary, path }
}

const TOOLS: ModelContextTool[] = [
  {
    name: 'search_basketball',
    title: 'Search Basket.fi',
    description:
      'Search Finnish basketball on Basket.fi / Koripalloliitto. Pass a club or team name (Honka, ETEK, HNMKY), an age group (U14), a player, or a tulospalvelu.basket.fi URL.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Name, age group, or Basket.fi URL' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: searchBasketballTool,
  },
  {
    name: 'get_basketball_game_card',
    title: 'Basketball match',
    description:
      'Fetch a live Basket.fi match: quarter scores, team fouls (bonus at 5), and top scorers. Requires matchId. Never invent an id.',
    inputSchema: {
      type: 'object',
      properties: {
        matchId: { type: 'string', description: 'Basket.fi match id' },
      },
      required: ['matchId'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: getBasketballGameCardTool,
  },
  {
    name: 'get_basketball_standings',
    title: 'Basketball standings',
    description:
      'Live Basket.fi standings for a group. Pass teamId, or competitionId+categoryId+groupId. 2 points for a win, 1 for a loss.',
    inputSchema: {
      type: 'object',
      properties: {
        teamId: { type: 'string', description: 'TASO team id' },
        competitionId: { type: 'string' },
        categoryId: { type: 'string' },
        groupId: { type: 'string' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: getBasketballStandingsTool,
  },
  {
    name: 'get_basketball_team',
    title: 'Basketball team',
    description: 'Fetch a Basket.fi team profile: name, category, groups, and fixture count. Requires teamId.',
    inputSchema: {
      type: 'object',
      properties: {
        teamId: { type: 'string', description: 'TASO team id' },
      },
      required: ['teamId'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: getBasketballTeamTool,
  },
  {
    name: 'get_basketball_player',
    title: 'Basketball player',
    description: 'Fetch a Basket.fi player profile. Requires playerId.',
    inputSchema: {
      type: 'object',
      properties: {
        playerId: { type: 'string', description: 'TASO player id' },
      },
      required: ['playerId'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: getBasketballPlayerTool,
  },
  {
    name: 'open_basketball_resource',
    title: 'Open in app',
    description:
      'Navigate this page to a match, team, player, club, search, browse, or favorites view. Use after search_basketball.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', description: 'match | team | player | club | search | browse | favorites' },
        id: { type: 'string', description: 'Resource id or search query' },
      },
      required: ['kind'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, consequentialHint: true },
    execute: openBasketballResourceTool,
  },
]

let session: AbortController | null = null

export async function registerBasketballWebMCP() {
  if (typeof window === 'undefined') return undefined
  session?.abort()
  session = new AbortController()
  const { mode, mc } = connectModelContext()
  const consumer = detectWebMcpConsumer()
  const registered: string[] = []
  let error: string | undefined

  for (const tool of TOOLS) {
    try {
      await mc.registerTool(tool, { signal: session.signal })
      registered.push(tool.name)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (/already registered/i.test(message) || /InvalidStateError/i.test(message)) {
        registered.push(tool.name)
      } else {
        error = `${tool.name}: ${message}`
        console.warn('[WebMCP] registerTool failed', tool.name, message)
      }
    }
  }

  publishWebMcpStatus({ mode, consumer, tools: registered, error })
  return { mode, mc, tools: registered }
}
