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
    matchOrTeamId: detail.matchId,
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
    keyMetrics: {
      quarters: detail.quarters.length,
      foulsHome: detail.teamFoulsHome,
      foulsAway: detail.teamFoulsAway,
    },
    deepLinkUrl: `https://basketball-stats-byu.pages.dev/#/match/${encodeURIComponent(detail.matchId)}?embed=true`,
    updatedAt: new Date().toISOString(),
  }
}
