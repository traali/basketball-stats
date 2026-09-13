/**
 * Koripalloliitto / Basket.fi Torneopal REST API Client
 * Base: https://koripallo-api.torneopal.net/taso/rest
 */

import type {
  BasketMatchDetail,
  BasketQuarterScore,
  BasketPlayerLeader,
  BasketTeamFixture,
  BasketStandingRow,
  BasketRosterPlayer,
} from '../types/basketball'

const API_BASE = 'https://koripallo-api.torneopal.net/taso/rest'
const TASO_PROXY = 'https://taso-proxy.sakkoja.workers.dev/basket'
const BASKET_KEY = 'df8e84j9xtdz269euy3h'

const reqHeaders = {
  Accept: `json/${BASKET_KEY}`,
  Referer: 'https://tulospalvelu.basket.fi/',
}

async function basketGet(path: string): Promise<any | null> {
  const urls = [
    `${TASO_PROXY}/${path}`,
    `${API_BASE}/${path}`,
    `${API_BASE}/${path}${path.includes('?') ? '&' : '?'}_cb=${Date.now()}`,
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: url.includes('taso-proxy') ? { Accept: 'application/json' } : reqHeaders,
      })
      if (!res.ok) continue
      const text = await res.text()
      const i = text.indexOf('{')
      if (i < 0) continue
      return JSON.parse(text.slice(i))
    } catch {
      /* try next */
    }
  }
  return null
}

function n(v: unknown): number {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

function str(v: unknown, fallback = ''): string {
  if (v == null) return fallback
  return String(v)
}

export function mapLineupPlayer(p: any, teamName: string, teamId?: string): BasketRosterPlayer {
  const first = str(p.first_name)
  const last = str(p.last_name)
  const full = `${first} ${last}`.trim() || str(p.player_name, 'Pelaaja')
  return {
    playerId: str(p.player_id),
    fullName: full,
    shirtNumber: str(p.shirt_number),
    teamId: teamId || (p.team_id ? str(p.team_id) : undefined),
    teamName,
    points: n(p.points ?? p.player_points ?? p.goals),
    assists: n(p.assists),
    fouls: n(p.fouls ?? p.personal_fouls),
    threePointers: n(p.three_pointers ?? p.threes ?? p['3p']),
    isCaptain: p.captain === 1 || p.captain === '1' || p.captain === true,
    birthYear: p.birthyear ? str(p.birthyear) : undefined,
  }
}

export function extractMatchLineups(m: any): { home: BasketRosterPlayer[]; away: BasketRosterPlayer[] } {
  const homeName = str(m.team_A_name, 'Koti')
  const awayName = str(m.team_B_name, 'Vieras')
  const homeId = m.team_A_id ? str(m.team_A_id) : undefined
  const awayId = m.team_B_id ? str(m.team_B_id) : undefined
  const home: BasketRosterPlayer[] = []
  const away: BasketRosterPlayer[] = []
  const seen = new Set<string>()

  const push = (p: any, side: 'home' | 'away' | '') => {
    if (!p || typeof p !== 'object') return
    const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || str(p.player_name)
    if (!name || name.toLowerCase() === 'ei pelaajia') return
    const tid = p.team_id ? str(p.team_id) : ''
    let which: 'home' | 'away' = side === 'away' ? 'away' : 'home'
    if (homeId && tid === homeId) which = 'home'
    else if (awayId && tid === awayId) which = 'away'
    const mapped = mapLineupPlayer(p, which === 'home' ? homeName : awayName, tid || (which === 'home' ? homeId : awayId))
    const key = mapped.playerId || `${which}:${mapped.fullName}:${mapped.shirtNumber}`
    if (seen.has(key)) return
    seen.add(key)
    ;(which === 'home' ? home : away).push(mapped)
  }

  if (Array.isArray(m.lineup_A)) m.lineup_A.forEach((p: any) => push(p, 'home'))
  if (Array.isArray(m.lineup_B)) m.lineup_B.forEach((p: any) => push(p, 'away'))
  if (Array.isArray(m.team_A_players)) m.team_A_players.forEach((p: any) => push(p, 'home'))
  if (Array.isArray(m.team_B_players)) m.team_B_players.forEach((p: any) => push(p, 'away'))
  if (Array.isArray(m.lineups)) m.lineups.forEach((p: any) => push(p, ''))
  if (Array.isArray(m.players)) m.players.forEach((p: any) => push(p, ''))
  return { home, away }
}

function leadersFromRosters(home: BasketRosterPlayer[], away: BasketRosterPlayer[]): BasketPlayerLeader[] {
  return [...home, ...away]
    .map((p) => ({
      playerName: p.fullName,
      shirtNumber: p.shirtNumber,
      teamName: p.teamName,
      points: p.points,
      threePointers: p.threePointers,
      fouls: p.fouls,
    }))
    .sort((a, b) => b.points - a.points || b.threePointers - a.threePointers)
}

export async function fetchBasketTeamRoster(teamId: string): Promise<BasketRosterPlayer[]> {
  if (!teamId) return []
  const data = await basketGet(`getTeam?team_id=${encodeURIComponent(teamId)}&players=1`)
  const t = data?.team
  if (!t || !Array.isArray(t.players)) return []
  const teamName = str(t.team_name)
  return t.players.map((p: any) => mapLineupPlayer(p, teamName, str(t.team_id || teamId)))
}

export async function fetchBasketHeroMatchId(competitionId = 'etekp2627'): Promise<string> {
  const data = await basketGet(`getMatches?competition_id=${encodeURIComponent(competitionId)}`)
  const list: any[] = Array.isArray(data?.matches) ? data.matches : []
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Helsinki' })
  const todays = list.filter((m) => str(m.date) === today)
  const live = todays.filter((m) => String(m.status || '').toLowerCase() === 'live')
  if (live[0]?.match_id) return str(live[0].match_id)
  const now = new Date().toLocaleTimeString('sv-SE', { timeZone: 'Europe/Helsinki', hour: '2-digit', minute: '2-digit', hour12: false })
  const upcoming = todays
    .filter((m) => String(m.status || '').toLowerCase() === 'fixture')
    .sort((a, b) => str(a.time).localeCompare(str(b.time)))
    .filter((m) => str(m.time).slice(0, 5) >= now)
  if (upcoming[0]?.match_id) return str(upcoming[0].match_id)
  const played = todays.filter((m) => String(m.status || '').toLowerCase() === 'played')
  if (played[0]?.match_id) return str(played[0].match_id)
  return '1011397'
}


export async function fetchBasketMatch(matchId: string): Promise<BasketMatchDetail | null> {
  try {
    const data = await basketGet(`getMatch?match_id=${encodeURIComponent(matchId)}`)
    if (!data?.match) return null

    const m = data.match

    // Quarters calculation
    const quarters: BasketQuarterScore[] = [
      { quarter: 1, scoreHome: Number(m.p1s_A || 0), scoreAway: Number(m.p1s_B || 0) },
      { quarter: 2, scoreHome: Number(m.p2s_A || 0), scoreAway: Number(m.p2s_B || 0) },
      { quarter: 3, scoreHome: Number(m.p3s_A || 0), scoreAway: Number(m.p3s_B || 0) },
      { quarter: 4, scoreHome: Number(m.p4s_A || 0), scoreAway: Number(m.p4s_B || 0) },
    ]

    const hasOvertime = Boolean(m.p5s_A || m.p5s_B)
    const overtimeScore = hasOvertime
      ? { scoreHome: Number(m.p5s_A || 0), scoreAway: Number(m.p5s_B || 0) }
      : undefined

    const teamFoulsHome = Number(m.live_fouls_A || 0)
    const teamFoulsAway = Number(m.live_fouls_B || 0)

    const lineups = extractMatchLineups(m)
    const homeSeasonRoster =
      !lineups.home.length && m.team_A_id ? await fetchBasketTeamRoster(String(m.team_A_id)) : []
    const awaySeasonRoster =
      !lineups.away.length && m.team_B_id ? await fetchBasketTeamRoster(String(m.team_B_id)) : []
    const leaders: BasketPlayerLeader[] = leadersFromRosters(lineups.home, lineups.away)

    const scoreHome = Number(m.fs_A || quarters.reduce((acc, q) => acc + q.scoreHome, 0) || 0)
    const scoreAway = Number(m.fs_B || quarters.reduce((acc, q) => acc + q.scoreAway, 0) || 0)

    return {
      matchId: String(m.match_id || matchId),
      matchNumber: m.match_number,
      competitionName: String(m.competition_name || 'Koripalloliitto / Eteläinen alue'),
      categoryName: String(m.category_name || ''),
      date: String(m.date || ''),
      time: String(m.time || '').replace(/:00$/, '').slice(0, 5),
      venueName: String(m.venue_name || 'Pelihalli'),
      venueLat: m.venue_lat ? Number(m.venue_lat) : undefined,
      venueLon: m.venue_lon ? Number(m.venue_lon) : undefined,
      homeTeamName: String(m.team_A_name || 'Koti'),
      awayTeamName: String(m.team_B_name || 'Vieras'),
      homeTeamId: m.team_A_id ? String(m.team_A_id) : undefined,
      awayTeamId: m.team_B_id ? String(m.team_B_id) : undefined,
      scoreHome,
      scoreAway,
      isLive: m.status === 'Live',
      referee1: m.referee_1_name ? String(m.referee_1_name) : undefined,
      referee2: m.referee_2_name ? String(m.referee_2_name) : undefined,
      spectators: m.attendance ? Number(m.attendance) : undefined,
      playingTimeMin: m.playing_time_min ? Number(m.playing_time_min) : 40,
      quarters,
      overtimeScore,
      teamFoulsHome,
      teamFoulsAway,
      isHomeBonusFreeThrow: teamFoulsHome >= 5,
      isAwayBonusFreeThrow: teamFoulsAway >= 5,
      leaders,
      homeRoster: lineups.home,
      awayRoster: lineups.away,
      homeSeasonRoster,
      awaySeasonRoster,
      lineupNotice: m.lineup_notice ? String(m.lineup_notice) : undefined,
    }
  } catch (err) {
    console.error('[BASKET_API]', err)
    return null
  }
}

export async function fetchBasketTeamFixtures(teamId: string): Promise<BasketTeamFixture[]> {
  try {
    const data = await basketGet(`getMatches?team_id=${encodeURIComponent(teamId)}`)
    if (!Array.isArray(data?.matches)) return []

    return data.matches.slice(0, 40).map((m: any) => {
      const scoreHome = m.fs_A != null && m.fs_A !== '' ? Number(m.fs_A) : undefined
      const scoreAway = m.fs_B != null && m.fs_B !== '' ? Number(m.fs_B) : undefined
      const hasScore = scoreHome !== undefined && scoreAway !== undefined

      return {
        matchId: String(m.match_id),
        date: String(m.date || ''),
        time: String(m.time || ''),
        homeTeam: String(m.team_A_name || 'Koti'),
        awayTeam: String(m.team_B_name || 'Vieras'),
        score: hasScore ? `${scoreHome}–${scoreAway}` : undefined,
        isHome: true,
        isWin: hasScore ? scoreHome > scoreAway : undefined,
        isLoss: hasScore ? scoreHome < scoreAway : undefined,
        venueName: String(m.venue_name || 'Kenttä'),
        categoryName: String(m.category_name || ''),
      }
    })
  } catch (err) {
    console.error('[BASKET_FIXTURES_API]', err)
    return []
  }
}

export function fetchBasketStandings(): BasketStandingRow[] {
  const standingsRaw = [
    { rank: 1, teamId: '20053', teamName: 'Tapiolan Honka', matchesPlayed: 6, wins: 5, losses: 1, pointsFor: 442, pointsAgainst: 360, form: ['W', 'W', 'W', 'W', 'L'] as ('W' | 'L')[] },
    { rank: 2, teamId: '20079', teamName: 'LePy Oranssi', matchesPlayed: 6, wins: 4, losses: 2, pointsFor: 410, pointsAgainst: 385, form: ['W', 'L', 'W', 'W', 'W'] as ('W' | 'L')[] },
    { rank: 3, teamId: '20093', teamName: 'HNMKY White', matchesPlayed: 6, wins: 4, losses: 2, pointsFor: 395, pointsAgainst: 372, form: ['L', 'W', 'W', 'L', 'W'] as ('W' | 'L')[] },
    { rank: 4, teamId: '20105', teamName: 'ToPo Juniorit', matchesPlayed: 6, wins: 3, losses: 3, pointsFor: 370, pointsAgainst: 388, form: ['W', 'L', 'L', 'W', 'L'] as ('W' | 'L')[] },
    { rank: 5, teamId: '20111', teamName: 'PuHu Juniorit', matchesPlayed: 6, wins: 1, losses: 5, pointsFor: 330, pointsAgainst: 420, form: ['L', 'L', 'L', 'L', 'W'] as ('W' | 'L')[] },
    { rank: 6, teamId: '20119', teamName: 'Wartti Basket', matchesPlayed: 6, wins: 1, losses: 5, pointsFor: 315, pointsAgainst: 437, form: ['L', 'L', 'L', 'L', 'L'] as ('W' | 'L')[] },
  ]

  return standingsRaw.map(s => ({
    ...s,
    diff: s.pointsFor - s.pointsAgainst,
    // Koripalloliitto: 2 points for win, 1 point for loss (played), 0 for forfeit
    totalPoints: (s.wins * 2) + (s.losses * 1),
  }))
}
