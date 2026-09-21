/**
 * Koripallo / Basket.fi Torneopal Data Types
 */

export interface BasketQuarterScore {
  quarter: number
  scoreHome: number
  scoreAway: number
}

export interface BasketPlayerLeader {
  playerId?: string
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
  competitionId?: string
  categoryId?: string
  groupId?: string
  scoreHome: number
  scoreAway: number
  isLive: boolean
  phase: 'live' | 'upcoming' | 'played'
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
  homeTeamId?: string
  awayTeamId?: string
  status?: string
  score?: string
  scoreHome?: number
  scoreAway?: number
  isHome: boolean
  isWin?: boolean
  isDraw?: boolean
  isLoss?: boolean
  venueName: string
  categoryName: string
  competitionId?: string
  categoryId?: string
  seasonYear?: string
  seasonHalf?: 'syksy' | 'kevat' | 'all'
}

export interface BasketStandingRow {
  rank: number
  teamId: string
  teamName: string
  matchesPlayed: number
  wins: number
  draws?: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  diff: number
  totalPoints: number
  form: ('V' | 'T' | 'H')[]
}

export interface CustomBasketTeam {
  id: string
  name: string
  category: string
  addedAt: string
}

export interface BasketSeasonGroup {
  competitionId: string
  competitionName: string
  categoryId: string
  categoryName: string
  groupId: string
  groupName: string
  seasonId?: string
  isCurrent?: boolean
  competitionStatus?: string
}

export interface BasketTeamProfile {
  teamId: string
  teamName: string
  clubName?: string
  clubId?: string
  clubCrest?: string
  categoryName?: string
  players: BasketRosterPlayer[]
  fixtures: BasketTeamFixture[]
  groups: BasketSeasonGroup[]
}

export interface BasketClubSummary {
  clubId: string
  name: string
  abbreviation: string
  cityName: string
  crest?: string
  region?: string
}

export interface BasketClubTeam {
  teamId: string
  teamName: string
  status: string
  categoryName: string
  competitionName: string
  competitionId?: string
  categoryId?: string
  groupId?: string
  season?: string
  venueName?: string
}

export interface BasketClubDetail {
  clubId: string
  name: string
  abbreviation: string
  cityName: string
  crest?: string
  www?: string
  districtName?: string
  venueName?: string
  teams: BasketClubTeam[]
}

export interface BasketCompetition {
  competitionId: string
  competitionName: string
  seasonId: string
  status: string
  startDate?: string
  endDate?: string
  organiser?: string
  locationName?: string
}

export interface BasketCategory {
  categoryId: string
  categoryName: string
  competitionId: string
  competitionName: string
  groupCount?: number
  teamCount?: number
  ageGroup?: string
  gender?: string
}

export interface BasketGroupSummary {
  groupId: string
  groupName: string
  competitionId: string
  competitionName: string
  categoryId: string
  categoryName: string
  teamCount: number
}

export interface BasketGroupTeam {
  teamId: string
  teamName: string
  clubId?: string
  crest?: string
  rank: number
  points: number
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  diff: number
}

export interface BasketGroupMatch {
  matchId: string
  date: string
  time: string
  homeTeam: string
  awayTeam: string
  homeTeamId?: string
  awayTeamId?: string
  scoreHome?: number
  scoreAway?: number
  status: string
  venueName?: string
}

export interface BasketGroupDetail {
  groupId: string
  groupName: string
  competitionId: string
  competitionName: string
  categoryId: string
  categoryName: string
  teams: BasketGroupTeam[]
  matches: BasketGroupMatch[]
}

export interface BasketPlayerTeam {
  teamId: string
  teamName: string
  clubName?: string
  categoryName?: string
  competitionName?: string
  shirtNumber?: string
}

export interface BasketPlayerMatch {
  matchId: string
  date: string
  time: string
  status: string
  homeTeam: string
  awayTeam: string
  homeTeamId?: string
  awayTeamId?: string
  teamId?: string
  scoreHome?: number
  scoreAway?: number
  categoryName: string
  competitionName: string
  seasonId?: string
  points: number
  assists: number
  fouls: number
  threePointers: number
  venueName?: string
}

export interface BasketPlayerProfile {
  playerId: string
  firstName: string
  lastName: string
  fullName: string
  birthYear?: string
  age?: number
  clubId?: string
  clubName?: string
  imageUrl?: string
  ageGroup?: string
  teams: BasketPlayerTeam[]
  matches: BasketPlayerMatch[]
  upcoming: BasketPlayerMatch[]
}

export interface DiscoveryHit {
  kind: 'club' | 'team' | 'match' | 'player' | 'competition' | 'category'
  id: string
  title: string
  subtitle: string
  crest?: string
}
