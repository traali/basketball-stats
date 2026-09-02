/**
 * Koripallo / Basket.fi Torneopal Data Types
 */

export interface BasketQuarterScore {
  quarter: number
  scoreHome: number
  scoreAway: number
}

export interface BasketPlayerLeader {
  playerName: string
  shirtNumber: string
  teamName: string
  points: number
  threePointers: number
  fouls: number
}

export interface BasketMatchDetail {
  matchId: string
  matchNumber?: string
  competitionName: string
  categoryName: string
  date: string
  time: string
  venueName: string
  venueLat?: number
  venueLon?: number
  homeTeamName: string
  awayTeamName: string
  homeTeamId?: string
  awayTeamId?: string
  scoreHome: number
  scoreAway: number
  isLive: boolean
  referee1?: string
  referee2?: string
  spectators?: number
  playingTimeMin?: number
  quarters: BasketQuarterScore[]
  overtimeScore?: { scoreHome: number; scoreAway: number }
  teamFoulsHome: number
  teamFoulsAway: number
  isHomeBonusFreeThrow: boolean
  isAwayBonusFreeThrow: boolean
  leaders: BasketPlayerLeader[]
}

export interface BasketTeamFixture {
  matchId: string
  date: string
  time: string
  homeTeam: string
  awayTeam: string
  score?: string
  isHome: boolean
  isWin?: boolean
  isDraw?: boolean
  isLoss?: boolean
  venueName: string
  categoryName: string
}
