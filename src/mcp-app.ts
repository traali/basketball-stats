/**
 * Basketball Stats MCP App Tool Handler
 * Standard: @modelcontextprotocol/ext-apps (2026 UI Capabilities Standard)
 * Reference: https://modelcontextprotocol.info/blog/mcp-apps-ui-capabilities/
 */

import { fetchBasketMatch } from './services/basketApi'
import { buildBasketballStatsContract } from './types/contracts'
import type { SportStatsContract } from './types/contracts'

export interface McpToolResponse {
  content: Array<{
    type: 'text' | 'resource'
    text?: string
    resource?: {
      uri: string
      mimeType: string
      text?: string
    }
  }>
  _meta?: {
    ui?: {
      resourceUri: string
    }
  }
}

/**
 * MCP App Tool: get_basketball_game_card
 */
export async function getBasketballGameCardTool(args: {
  matchId: string
}): Promise<McpToolResponse> {
  const match = await fetchBasketMatch(args.matchId || '1011397')

  if (!match) {
    return {
      content: [{ type: 'text', text: `Ottelua ${args.matchId} ei löytynyt Basket.fi -palvelusta.` }],
    }
  }

  const contract: SportStatsContract = buildBasketballStatsContract({
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
  const summary = `🏀 ${contract.homeTeamName} ${contract.homeScore} – ${contract.awayScore} ${contract.awayTeamName} (${match.competitionName}). Neljännekset: ${qScores}. Pistehai: ${match.leaders[0]?.playerName} (${match.leaders[0]?.points}p).`

  return {
    content: [
      {
        type: 'text',
        text: summary,
      },
    ],
    _meta: {
      ui: {
        resourceUri: `ui://basketball/game-card?matchId=${encodeURIComponent(match.matchId)}`,
      },
    },
  }
}
