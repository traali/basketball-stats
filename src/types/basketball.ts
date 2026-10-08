/**
 * Koripallo / Basket.fi Torneopal Data Types
 *
 * Rule: a number is only a number when TASO sent it. Anything TASO left blank
 * is null/undefined here and is shown blank in the UI — never 0.
 */
import type { MatchState, Side } from '../utils/matchStatus.ts'

export type { MatchState, Side }

export interface BasketQuarterScore {
  /** 1–4 quarters, 5 overtime. */
  quarter: number
  scoreHome: number | null
  scoreAway: number | null
  winner?: Side
}

export interface BasketPlayerLeader {
  playerId?: string
  playerName: string
  shirtNumber: string
  teamName: string
  points: number
  /** Counted from the game's scoring events ("3 x-y"); null when there are no events. */
  threePointers: number | null
  fouls: number | null
}

export interface BasketRosterPlayer {
  playerId: string
  fullName: string
  shirtNumber: string
  teamId?: string
  teamName: string
  /** Game stats exist only on a game lineup with track_scorers=1. Season rosters have none. */
  points: number | null
  assists: number | null
  fouls: number | null
  threePointers: number | null
  isCaptain?: boolean
  starter?: boolean
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
  /** Only set for played games and today's live games. */
  scoreHome: number | null
  scoreAway: number | null
  isLive: boolean
  phase: MatchState
  rawStatus: string
  /** e.g. "Spartan Basket luovutti" */
  forfeitText?: string
  winnerSide?: Side
  /** The result TASO books for a walkover (e.g. 40–0). Not a played score. */
  forfeitScore?: { home: number; away: number }
  referee1?: string
  referee2?: string
  spectators?: number
  quarters: BasketQuarterScore[]
  /** Live team fouls (TASO live_fouls_*); null unless the game is live today. */
  teamFoulsHome: number | null
  teamFoulsAway: number | null
  livePeriod?: number
  /** track_scorers=1: lineup points/fouls are recorded. */
  statsTracked: boolean
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
  state: MatchState
  forfeitText?: string
  winnerSide?: Side
  /** Season label from TASO competition_season, e.g. "2026-2027". */
  season?: string
  groupId?: string
  /** Only set when a score may be shown (played / live today). */
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
  state: MatchState
  winnerSide?: Side
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
  state: MatchState
  categoryName: string
  competitionName: string
  seasonId?: string
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
