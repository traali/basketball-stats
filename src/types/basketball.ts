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

export interface BasketRosterPlayer {
  playerId: string
  fullName: string
  shirtNumber: string
  teamId?: string
  teamName: string
  points: number
  assists: number
  fouls: number
  threePointers: number
  isCaptain?: boolean
  birthYear?: string
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
  homeRoster: BasketRosterPlayer[]
  awayRoster: BasketRosterPlayer[]
  /** Season team list — not this match’s lineup (juniors often have none). */
  homeSeasonRoster?: BasketRosterPlayer[]
  awaySeasonRoster?: BasketRosterPlayer[]
  lineupNotice?: string
}

export interface BasketTeamFixture {
  matchId: string
  date: string
  time: string
  homeTeam: string
  awayTeam: string
  status?: string
  score?: string
  isHome: boolean
  isWin?: boolean
  isDraw?: boolean
  isLoss?: boolean
  venueName: string
  categoryName: string
}

export interface BasketStandingRow {
  rank: number
  teamId: string
  teamName: string
  matchesPlayed: number
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  diff: number
  totalPoints: number
  form: ('W' | 'L')[]
}

export interface CustomBasketTeam {
  id: string
  name: string
  category: string
  addedAt: string
}
