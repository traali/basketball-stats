/**
 * Cross-Repo Contract Adapter for Basketball-Stats
 * Canonical Contracts v1.0.0 — keep required SportStats fields; basketball extras are optional.
 */

export const CONTRACT_VERSION = '1.0.0' as const

export type SupportedSport = 'football' | 'volleyball' | 'floorball' | 'basketball' | 'weather' | 'other'

export interface MatchdayContextContract {
  eventId: string
  sport: SupportedSport
  startTime: string
  warmupTime?: string
  homeTeam: string
  awayTeam: string
  venueName: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  association?: 'palloliitto' | 'salibandy' | 'basket' | 'torneopal' | 'fmi' | 'other'
  externalId?: string
}

export interface ParkingRiskContract {
  venueSlug: string
  riskRating: number
  safetyCategory: 'safe' | 'moderate' | 'trap'
  parkingZone?: string
  walkDistanceMeters?: number
  walkTimeMinutes?: number
  deepLinkUrl: string
  advisoryNote?: string
  updatedAt?: string
}

export interface SportStatsContract {
  sport: SupportedSport
  matchOrTeamId: string
  matchId?: string
  teamId?: string
  recentForm?: string[]
  standingsSummary?: {
    rank: number
    totalTeams: number
    points: number
    playedMatches: number
  }
  headToHead?: {
    wins: number
    draws: number
    losses: number
    lastResult?: string
  }
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
  }
  topScorers?: Array<{
    playerName: string
    team: string
    goalsOrPoints: number
    assists?: number
  }>
  keyMetrics?: Record<string, string | number>
  deepLinkUrl: string
  updatedAt?: string
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

export interface WeatherForecastContract {
  venueId?: string
  venueName?: string
  coordinates: { latitude: number; longitude: number }
  kickoffTime: string
  temperatureC: number
  feelsLikeC: number
  windSpeedMs: number
  windGustMs: number
  precipitationMmh: number
  turfCondition: 'dry' | 'slick' | 'frozen' | 'snowy'
  turfConditionLabelFi: string
  lightningRiskStatus: 'clear' | 'watch' | 'danger'
  suspendMatchRecommended: boolean
  deepLinkUrl: string
  isCacheFallback: boolean
  updatedAt?: string
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

/**
 * SportStatsContract from Basket.fi data only. Scores are omitted unless the
 * game is played (or live today); a period is included only when TASO filled
 * both sides; fouls only when TASO sends live team fouls. No bonus guess.
 */
export function buildBasketballStatsContract(detail: {
  matchId: string
  homeTeamName: string
  awayTeamName: string
  scoreHome: number | null
  scoreAway: number | null
  quarters: Array<{ quarter: number; scoreHome: number | null; scoreAway: number | null }>
  teamFoulsHome: number | null
  teamFoulsAway: number | null
  leaders: Array<{ playerName: string; teamName: string; points: number }>
  phase?: string
}): SportStatsContract {
  const periods = detail.quarters.filter(
    (q): q is { quarter: number; scoreHome: number; scoreAway: number } => q.scoreHome !== null && q.scoreAway !== null,
  )
  const fouls = detail.teamFoulsHome !== null && detail.teamFoulsAway !== null
  const keyMetrics: Record<string, string | number> = { quarters: periods.length }
  if (detail.phase) keyMetrics.state = detail.phase
  return {
    sport: 'basketball',
    matchOrTeamId: detail.matchId,
    matchId: detail.matchId,
    homeTeamName: detail.homeTeamName,
    awayTeamName: detail.awayTeamName,
    ...(detail.scoreHome !== null && detail.scoreAway !== null
      ? { homeScore: detail.scoreHome, awayScore: detail.scoreAway }
      : {}),
    periodScores: periods.map((q) => ({ period: q.quarter, scoreHome: q.scoreHome, scoreAway: q.scoreAway })),
    ...(fouls ? { specialStats: { foulsHome: detail.teamFoulsHome as number, foulsAway: detail.teamFoulsAway as number } } : {}),
    topScorers: detail.leaders.map((l) => ({
      playerName: l.playerName,
      team: l.teamName,
      goalsOrPoints: l.points,
    })),
    keyMetrics,
    deepLinkUrl: `https://basketball-stats-byu.pages.dev/#/match/${encodeURIComponent(detail.matchId)}?embed=true`,
    updatedAt: new Date().toISOString(),
  }
}
