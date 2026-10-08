/**
 * Tests built from real koripallo-api.torneopal.net answers (2026-10-08).
 * Fixtures: tests/fixtures/*.json (player names anonymised).
 */
import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  fetchBasketMatch,
  fetchBasketMatchesByTeam,
  mapMatchDetail,
  mapMatchFixture,
  mapTeamRoster,
  pickCurrentGroup,
  threesFromEvents,
  scoringEvents,
  finalScore,
} from '../src/services/basketApi.ts'
import { classifyMatch, periodScores } from '../src/utils/matchStatus.ts'
import { splitFixtures, teamSeasons } from '../src/utils/fixtureGroups.ts'
import { buildBasketballStatsContract } from '../src/types/contracts.ts'

const load = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))
const LIST = load('basket-list-matches.json').matches
const SINGLE = load('basket-get-match.json').matches
const NOW = new Date('2026-10-08T04:00:00Z') // 07:00 Helsinki

describe('status: only Played carries a score', () => {
  it('played list row shows the final score and quarters', () => {
    const f = mapMatchFixture(LIST.played, '5000253', NOW)
    assert.equal(f.state, 'played')
    assert.equal(f.score, '76–38')
    assert.equal(f.isWin, true)
  })

  it('upcoming game: single call sends "0","0", list sends "" — neither prints 0–0', () => {
    assert.equal(SINGLE.upcoming.fs_A, '0')
    assert.equal(LIST.upcoming.fs_A, '')
    for (const raw of [SINGLE.upcoming, LIST.upcoming]) {
      const f = mapMatchFixture(raw, undefined, NOW)
      assert.equal(f.state, 'upcoming')
      assert.equal(f.score, undefined)
      assert.equal(f.scoreHome, undefined)
    }
    const d = mapMatchDetail(SINGLE.upcoming, '', NOW)
    assert.equal(d.phase, 'upcoming')
    assert.equal(d.scoreHome, null)
    assert.equal(d.scoreAway, null)
    assert.deepEqual(d.quarters, [])
  })

  it('past-dated Fixture (even with fs "0","0") is "Ei tulosta", never upcoming or 0–0', () => {
    for (const raw of [LIST.pastFixtureZeroZero, LIST.pastFixtureBlank, SINGLE.pastFixtureBlank]) {
      const f = mapMatchFixture(raw, undefined, NOW)
      assert.equal(f.state, 'unreported', raw.match_id)
      assert.equal(f.score, undefined)
    }
  })

  it('a Live/Break status left on an old game is "unconfirmed", not live, and shows no score', () => {
    assert.equal(LIST.staleBreak.status, 'Break')
    assert.equal(SINGLE.staleBreak.status, 'Live')
    const d = mapMatchDetail(SINGLE.staleBreak, '', NOW)
    assert.equal(d.phase, 'unconfirmed')
    assert.equal(d.scoreHome, null)
    assert.equal(d.teamFoulsHome, null)
    assert.equal(mapMatchDetail(SINGLE.pastFixtureZeroZero, '', NOW).phase, 'unconfirmed')
  })

  it('the same Live row on its own day is live with the live score and live fouls', () => {
    const sameDay = new Date('2026-09-25T17:30:00Z')
    const d = mapMatchDetail(SINGLE.staleBreak, '', sameDay)
    assert.equal(d.phase, 'live')
    assert.equal(d.scoreHome, 82)
    assert.equal(d.teamFoulsHome, 7)
    assert.equal(d.teamFoulsAway, 3)
  })

  it('Planned with no date is "Aika avoin"; Reschedule is "Siirretty"', () => {
    assert.equal(classifyMatch(LIST.plannedNoDate, NOW), 'unscheduled')
    assert.equal(classifyMatch(SINGLE.plannedNoDate, NOW), 'unscheduled')
    assert.equal(mapMatchFixture(SINGLE.plannedNoDate, undefined, NOW).score, undefined)
    assert.equal(classifyMatch(LIST.reschedule, NOW), 'postponed')
  })
})

describe('walkovers', () => {
  it('list status "Forfeited" and single "Played"+walkover=1 are both luovutus, never 0–0 or upcoming', () => {
    assert.equal(LIST.forfeited.status, 'Forfeited')
    assert.equal(SINGLE.forfeited.status, 'Played')
    assert.equal(SINGLE.forfeited.walkover, 1)
    for (const raw of [LIST.forfeited, SINGLE.forfeited]) {
      const f = mapMatchFixture(raw, '5755272', NOW)
      assert.equal(f.state, 'forfeit')
      assert.equal(f.score, undefined)
      assert.equal(f.forfeitText, 'Spartan Basket luovutti')
      assert.equal(f.isWin, true)
    }
    const d = mapMatchDetail(SINGLE.forfeited, '', NOW)
    assert.equal(d.phase, 'forfeit')
    assert.equal(d.scoreHome, null)
    assert.deepEqual(d.forfeitScore, { home: 40, away: 0 })
    assert.deepEqual(d.quarters, [])
    assert.deepEqual(d.leaders, [])
  })
})

describe('quarters: blank stays blank', () => {
  it('reads p1..p4 with the per-period winner from the single call', () => {
    const q = periodScores(SINGLE.played)
    assert.deepEqual(q.map((x) => [x.quarter, x.scoreHome, x.scoreAway, x.winner]), [
      [1, 13, 7, 'home'],
      [2, 15, 4, 'home'],
      [3, 19, 7, 'home'],
      [4, 29, 20, 'home'],
    ])
  })

  it('overtime is period 5', () => {
    const q = periodScores(SINGLE.playedOvertime)
    assert.equal(q.length, 5)
    assert.deepEqual([q[4].scoreHome, q[4].scoreAway, q[4].winner], [24, 20, 'home'])
  })

  it('a played game with no quarter data has no quarters (not 0–0 rows)', () => {
    const d = mapMatchDetail(SINGLE.playedNoQuarters, '', NOW)
    assert.equal(d.phase, 'played')
    assert.equal(d.scoreHome, 56)
    assert.deepEqual(d.quarters, [])
  })

  it('one blank side stays null instead of 0', () => {
    const q = periodScores({ p1s_A: '12', p1s_B: '', p2s_A: '', p2s_B: '' })
    assert.deepEqual(q, [{ quarter: 1, scoreHome: 12, scoreAway: null, winner: undefined }])
  })

  it('contract output leaves out incomplete periods and unplayed scores', () => {
    const c = buildBasketballStatsContract({
      matchId: '1',
      homeTeamName: 'A',
      awayTeamName: 'B',
      scoreHome: null,
      scoreAway: null,
      quarters: [{ quarter: 1, scoreHome: 12, scoreAway: null }],
      teamFoulsHome: null,
      teamFoulsAway: null,
      leaders: [],
    })
    assert.equal('homeScore' in c, false)
    assert.deepEqual(c.periodScores, [])
    assert.equal(c.specialStats, undefined)
  })
})

describe('player stats only where TASO records them', () => {
  it('lineup points/fouls come from the game; 3P is counted from scoring events and matches the points', () => {
    const d = mapMatchDetail(SINGLE.playedOvertime, '', NOW)
    assert.equal(d.statsTracked, true)
    assert.equal(d.homeRoster.length + d.awayRoster.length, 22)
    const top = d.leaders[0]
    assert.equal(top.points, 30)
    assert.equal(top.threePointers, 2)
    const threes = threesFromEvents(SINGLE.playedOvertime)
    assert.equal([...threes.values()].reduce((a, b) => a + b, 0), 14)
    // assists are not tracked (track_assists=0) → null, never 0
    assert.ok(d.homeRoster.every((p) => p.assists === null))
    // captain is "C" in TASO
    assert.ok(d.homeRoster.concat(d.awayRoster).some((p) => p.isCaptain))
  })

  it('no events → 3P unknown (null), not 0', () => {
    assert.equal(threesFromEvents({ fs_A: '0', fs_B: '0', events: [] }), null)
  })

  it('season roster from getTeam has no stats at all (TASO leaves them blank)', () => {
    const roster = mapTeamRoster(load('basket-get-team.json').team)
    assert.ok(roster.length > 0)
    for (const p of roster) {
      assert.equal(p.points, null)
      assert.equal(p.assists, null)
      assert.equal(p.fouls, null)
      assert.equal(p.threePointers, null)
    }
  })
})

describe('team games', () => {
  it('getMatches?team_id lists every season oldest-first: nothing is cut off and seasons come from TASO', async () => {
    const body = load('basket-team-matches.json')
    const foreign = { ...body.matches[0], match_id: '1', team_A_id: '1', team_B_id: '2' }
    const fetchMock = mock.method(globalThis, 'fetch', async () =>
      new Response(JSON.stringify({ ...body, matches: [...body.matches, foreign] }), { status: 200 }),
    )
    try {
      const list = await fetchBasketMatchesByTeam('5751397')
      assert.equal(list.length, body.matches.length, 'foreign rows are dropped, own rows kept')
      assert.deepEqual(teamSeasons(list).slice(0, 2), ['2026-2027', '2022-2023'])
      const current = list.filter((f) => f.season === '2026-2027')
      const split = splitFixtures(current)
      assert.ok(split.upcoming.length > 0)
      assert.ok(split.upcoming.every((f) => f.score === undefined))
    } finally {
      fetchMock.mock.restore()
    }
  })

  it('picks the newest season group without a hardcoded year', () => {
    const team = load('basket-get-team.json').team
    const groups = team.groups.map((g) => ({
      competitionId: g.competition_id,
      competitionName: g.competition_name,
      categoryId: g.category_id,
      categoryName: g.category_name,
      groupId: g.group_id,
      groupName: g.group_name,
      seasonId: g.competition_season,
      isCurrent: g.group_current === '1',
      competitionStatus: g.competition_status,
    }))
    assert.equal(pickCurrentGroup(groups).seasonId, '2026-2027')
  })
})

describe('fetchBasketMatch', () => {
  it('"Match not found" is null (not a failure); a 403 everywhere throws', async () => {
    let fetchMock = mock.method(globalThis, 'fetch', async () =>
      new Response(JSON.stringify({ call: { status: 'error', error_message: 'Match not found or published 3' } }), { status: 200 }),
    )
    try {
      assert.equal(await fetchBasketMatch('99999999'), null)
    } finally {
      fetchMock.mock.restore()
    }
    fetchMock = mock.method(globalThis, 'fetch', async () => new Response('', { status: 403 }))
    try {
      await assert.rejects(fetchBasketMatch('1009819'))
    } finally {
      fetchMock.mock.restore()
    }
  })
})

describe('play-by-play: both Torneopal score formats, checked against the final score', () => {
  const OT = SINGLE.playedOvertime // game 1009819, 89–85 after overtime
  const sumBy = (rows, side) => rows.filter((r) => r.side === side).reduce((a, r) => a + r.points, 0)
  const quarterSum = (m, side) => periodScores(m).reduce((a, q) => a + ((side === 'home' ? q.scoreHome : q.scoreAway) ?? 0), 0)

  it('running-total format (real 1009819): baskets add up to the final score and to the quarter totals', () => {
    const rows = scoringEvents(OT)
    assert.ok(rows)
    assert.equal(sumBy(rows, 'home'), 89)
    assert.equal(sumBy(rows, 'away'), 85)
    assert.equal(quarterSum(OT, 'home'), 89)
    assert.equal(quarterSum(OT, 'away'), 85)
  })

  // Same real game rewritten into the other format: score restarts every period,
  // a "0 0-0" row opens each period and the last basket of a period is repeated.
  const perPeriod = (() => {
    const out = []
    let p = null
    let base = { h: 0, a: 0 }
    let last = null
    for (const e of OT.events) {
      if (e.code !== 'maali') { out.push(e); continue }
      const [pts, score] = String(e.description).split(' ')
      const [h, a] = score.split('-').map(Number)
      if (e.period !== p) {
        if (last) out.push({ ...last, event_id: `${last.event_id}-dup`, period: e.period })
        base = last ? { h: Number(last.description.split(' ')[1].split('-')[0]) + base.h, a: Number(last.description.split(' ')[1].split('-')[1]) + base.a } : base
        out.push({ ...e, event_id: `${e.event_id}-start`, description: '0 0-0', player_id: '' })
        p = e.period
      }
      const row = { ...e, description: `${pts} ${h - base.h}-${a - base.a}` }
      out.push(row)
      last = row
    }
    return out
  })()

  it('per-period format with 0-0 and duplicate rows gives the same baskets and the same 3P', () => {
    const a = scoringEvents(OT)
    const b = scoringEvents({ ...OT, events: perPeriod })
    assert.ok(b, 'per-period format accepted')
    assert.deepEqual(b.map((r) => [r.side, r.points, r.playerId]), a.map((r) => [r.side, r.points, r.playerId]))
    assert.deepEqual([...threesFromEvents({ ...OT, events: perPeriod })], [...threesFromEvents(OT)])
  })

  it('events that do not add up to the final score give no 3P (real 970996: duplicate event_id, last basket missing)', () => {
    const g = load('basket-events-970996.json').match
    assert.equal(finalScore(g).home, 59)
    assert.equal(quarterSum(g, 'home'), 59) // quarters agree with the final score…
    assert.equal(scoringEvents(g), null) // …the play-by-play stops at 57–35
    assert.equal(threesFromEvents(g), null)
  })

  it('a basket whose points do not match the score change makes the whole log untrusted', () => {
    const bad = OT.events.map((e, i) => (i === OT.events.findIndex((x) => x.code === 'maali') ? { ...e, description: '3 0-2' } : e))
    assert.equal(scoringEvents({ ...OT, events: bad }), null)
  })

  it('no final score (game not played) → no play-by-play figures', () => {
    assert.equal(scoringEvents({ ...OT, fs_A: '', fs_B: '' }), null)
  })
})
