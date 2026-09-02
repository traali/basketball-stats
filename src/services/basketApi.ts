/**
 * Koripalloliitto / Basket.fi Torneopal REST API Client
 * Base: https://koripallo-api.torneopal.net/taso/rest
 */

import type {
  BasketMatchDetail,
  BasketQuarterScore,
  BasketPlayerLeader,
  BasketTeamFixture,
} from '../types/basketball'

const API_BASE = 'https://koripallo-api.torneopal.net/taso/rest'
const BASKET_KEY = 'df8e84j9xtdz269euy3h'

const reqHeaders = {
  Accept: `json/${BASKET_KEY}`,
  Referer: 'https://tulospalvelu.basket.fi/',
}

export async function fetchBasketMatch(matchId: string): Promise<BasketMatchDetail | null> {
  try {
    const url = `${API_BASE}/getMatch?match_id=${encodeURIComponent(matchId)}`
    const res = await fetch(url, { headers: reqHeaders })

    if (!res.ok) return null
    const data = await res.json()
    if (data.call?.status !== 'ok' || !data.match) return null

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

    const teamFoulsHome = Number(m.live_fouls_A || 2)
    const teamFoulsAway = Number(m.live_fouls_B || 3)

    // Parse player points leaders from match lineups/events
    const leaders: BasketPlayerLeader[] = []
    if (Array.isArray(m.lineup_A)) {
      for (const p of m.lineup_A) {
        if (p.points && Number(p.points) > 0) {
          leaders.push({
            playerName: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            shirtNumber: String(p.shirt_number || ''),
            teamName: String(m.team_A_name || 'Koti'),
            points: Number(p.points || 0),
            threePointers: Number(p.three_pointers || 0),
            fouls: Number(p.fouls || 0),
          })
        }
      }
    }

    if (Array.isArray(m.lineup_B)) {
      for (const p of m.lineup_B) {
        if (p.points && Number(p.points) > 0) {
          leaders.push({
            playerName: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            shirtNumber: String(p.shirt_number || ''),
            teamName: String(m.team_B_name || 'Vieras'),
            points: Number(p.points || 0),
            threePointers: Number(p.three_pointers || 0),
            fouls: Number(p.fouls || 0),
          })
        }
      }
    }

    leaders.sort((a, b) => b.points - a.points)

    const scoreHome = Number(m.fs_A || quarters.reduce((acc, q) => acc + q.scoreHome, 0) || 0)
    const scoreAway = Number(m.fs_B || quarters.reduce((acc, q) => acc + q.scoreAway, 0) || 0)

    return {
      matchId: String(m.match_id || matchId),
      matchNumber: m.match_number,
      competitionName: String(m.competition_name || 'Koripalloliitto / Eteläinen alue'),
      categoryName: String(m.category_name || ''),
      date: String(m.date || ''),
      time: String(m.time || ''),
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
    }
  } catch (err) {
    console.error('[BASKET_API]', err)
    return null
  }
}

export async function fetchBasketTeamFixtures(competitionId: string): Promise<BasketTeamFixture[]> {
  try {
    const url = `${API_BASE}/getMatches?competition_id=${encodeURIComponent(competitionId)}&limit=15`
    const res = await fetch(url, { headers: reqHeaders })
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data.matches)) return []

    return data.matches.map((m: any) => {
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
