/**
 * Basketball Stats WebMCP tools.
 * Registers on native document.modelContext when present; otherwise the spec polyfill.
 */

import {
  fetchBasketMatch,
  fetchBasketGroup,
  fetchBasketTeamProfile,
  pickCurrentGroup,
  mapGroupTeamsToStandings,
} from './services/basketApi'
import { buildBasketballStatsContract } from './types/contracts'
import { installModelContext, type ModelContextTool } from './webmcp'

function textResult(text: string, extra?: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text }],
    ...extra,
  }
}

async function getBasketballGameCardTool(args: Record<string, unknown>) {
  const matchId = String(args.matchId || '').trim()
  if (!matchId) {
    return textResult('Anna matchId (Basket.fi ottelutunnus). Ei kovakoodattua ottelua.')
  }

  const match = await fetchBasketMatch(matchId)
  if (!match) {
    return textResult(`Ottelua ${matchId} ei löytynyt Basket.fi -palvelusta.`)
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
      ? `${match.homeTeamName} vs ${match.awayTeamName} (${match.competitionName}) — tuleva ottelu ${match.date} ${match.time}.`
      : `${match.homeTeamName} ${match.scoreHome}–${match.scoreAway} ${match.awayTeamName} (${match.competitionName}). Neljännekset: ${qScores}. Pistehai: ${match.leaders[0]?.playerName || 'Ei tilastoitu'} (${match.leaders[0]?.points || 0}p).`

  return {
    content: [
      { type: 'text' as const, text: summary },
      {
        type: 'resource' as const,
        resource: {
          uri: 'data://basketball/stats.json',
          mimeType: 'application/json',
          text: JSON.stringify(contract),
        },
      },
    ],
    _meta: {
      ui: {
        resourceUri: `ui://basketball/game-card?matchId=${encodeURIComponent(match.matchId)}`,
      },
    },
    match,
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
    return textResult(
      'Anna teamId tai competitionId + categoryId + groupId. Dummy-sarjataulukot ovat kiellettyjä.',
    )
  }

  const standings = mapGroupTeamsToStandings(group.teams, group.matches)
  const summary = `${group.competitionName} · ${group.categoryName} · ${group.groupName}: ${standings.length} joukkuetta.`
  return {
    content: [{ type: 'text' as const, text: summary }],
    group: {
      groupId: group.groupId,
      groupName: group.groupName,
      competitionName: group.competitionName,
      categoryName: group.categoryName,
    },
    teams: standings,
    pointsRule: '2 pistettä voitosta, 1 tappiosta (Basket.fi)',
  }
}

const TOOLS: ModelContextTool[] = [
  {
    name: 'get_basketball_game_card',
    title: 'Koripallo-ottelu',
    description:
      'Hakee Basket.fi-ottelun neljännespisteet, joukkuevirheet ja pistetilaston. Vaadi matchId; ei kovakoodattua ottelua.',
    inputSchema: {
      type: 'object',
      properties: {
        matchId: { type: 'string', description: 'Basket.fi match ID' },
      },
      required: ['matchId'],
    },
    annotations: { readOnlyHint: true },
    execute: getBasketballGameCardTool,
  },
  {
    name: 'get_basketball_standings',
    title: 'Koripallon sarjataulukko',
    description:
      'Hakee live Basket.fi -sarjataulukon lohkolle. Anna teamId tai competitionId+categoryId+groupId.',
    inputSchema: {
      type: 'object',
      properties: {
        teamId: { type: 'string', description: 'Joukkueen TASO-tunnus' },
        competitionId: { type: 'string' },
        categoryId: { type: 'string' },
        groupId: { type: 'string' },
      },
    },
    annotations: { readOnlyHint: true },
    execute: getBasketballStandingsTool,
  },
]

export async function registerBasketballWebMCP() {
  const mc = installModelContext()
  if (!mc) return undefined
  for (const tool of TOOLS) {
    try {
      await mc.registerTool(tool)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!/already registered/i.test(message)) {
        console.warn('[WebMCP] registerTool failed:', tool.name, message)
      }
    }
  }
  return mc
}
