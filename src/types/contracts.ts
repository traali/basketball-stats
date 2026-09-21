/**
 * Cross-Repo Contract Adapter for Basketball-Stats
 * Canonical Contracts v1.0.0
 */

export const CONTRACT_VERSION = '1.0.0' as const

export type SupportedSport = 'football' | 'volleyball' | 'floorball' | 'basketball' | 'weather' | 'other'

export interface SportStatsContract {
  sport: SupportedSport
  matchId?: string
  teamId?: string
  homeTeamName?: string
  awayTeamName?: string
  homeScore?: number
  awayScore?: number
  periodScores?: Array<{
    period: number
    scoreHome: number
    scoreAway: number
  }>
  specialStats?: {
    foulsHome?: number
    foulsAway?: number
    bonusFreeThrows?: boolean
    savePercentageHome?: string
    savePercentageAway?: string
    powerplayConversionHome?: string
    powerplayConversionAway?: string
    overtimeScore?: string
  }
  topScorers?: Array<{
    playerName: string
    team: string
    goalsOrPoints: number
    assists?: number
  }>
  deepLinkUrl: string
  updatedAt: string
}

export interface CrossRepoQueryContract {
  theme?: string
  embed?: boolean
  parentOrigin?: string
  targetId?: string
  matchId?: string
  teamId?: string
  playerId?: string
}

export function parseIncomingCrossRepoQuery(searchParams: URLSearchParams): CrossRepoQueryContract {
  const matchId =
    searchParams.get('match') ||
    searchParams.get('matchId') ||
    searchParams.get('match_id') ||
    searchParams.get('game') ||
    searchParams.get('gameId') ||
    searchParams.get('game_id') ||
    undefined
  const teamId =
    searchParams.get('team') ||
    searchParams.get('teamId') ||
    searchParams.get('team_id') ||
    searchParams.get('joukkue') ||
    undefined
  const playerId =
    searchParams.get('player') ||
    searchParams.get('playerId') ||
    searchParams.get('player_id') ||
    undefined

  return {
    theme: searchParams.get('theme') || undefined,
    embed: searchParams.get('embed') === 'true',
    parentOrigin: searchParams.get('parentOrigin') || undefined,
    targetId: searchParams.get('targetId') || matchId || teamId || playerId || undefined,
    matchId,
    teamId,
    playerId,
  }
}

export function buildBasketballStatsContract(detail: {
  matchId: string
  homeTeamName: string
  awayTeamName: string
  scoreHome: number
  scoreAway: number
  quarters: Array<{ quarter: number; scoreHome: number; scoreAway: number }>
  teamFoulsHome: number
  teamFoulsAway: number
  leaders: Array<{ playerName: string; teamName: string; points: number }>
}): SportStatsContract {
  return {
    sport: 'basketball',
    matchId: detail.matchId,
    homeTeamName: detail.homeTeamName,
    awayTeamName: detail.awayTeamName,
    homeScore: detail.scoreHome,
    awayScore: detail.scoreAway,
    periodScores: detail.quarters.map((q) => ({
      period: q.quarter,
      scoreHome: q.scoreHome,
      scoreAway: q.scoreAway,
    })),
    specialStats: {
      foulsHome: detail.teamFoulsHome,
      foulsAway: detail.teamFoulsAway,
      bonusFreeThrows: detail.teamFoulsHome >= 5 || detail.teamFoulsAway >= 5,
    },
    topScorers: detail.leaders.map((l) => ({
      playerName: l.playerName,
      team: l.teamName,
      goalsOrPoints: l.points,
    })),
    deepLinkUrl: `https://basketball-stats-byu.pages.dev/match/${encodeURIComponent(detail.matchId)}?embed=true`,
    updatedAt: new Date().toISOString(),
  }
}
