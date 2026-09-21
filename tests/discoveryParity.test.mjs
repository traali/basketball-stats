import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseBasketQuery,
  normalizeSearch,
  determineSeasonHalf,
  getSeasonYear,
  lastFormForTeam,
  mapGroupTeamsToStandings,
  mapMatchFixture,
} from '../src/services/basketApi.ts'

describe('discovery query parsing', () => {
  it('parses Basket.fi team, match and player URLs', () => {
    assert.deepEqual(parseBasketQuery('https://tulospalvelu.basket.fi/team/?team_id=20053'), {
      kind: 'team',
      id: '20053',
    })
    assert.deepEqual(parseBasketQuery('https://tulospalvelu.basket.fi/ottelu/?match_id=1012345'), {
      kind: 'match',
      id: '1012345',
    })
    assert.deepEqual(parseBasketQuery('https://tulospalvelu.basket.fi/player/?player_id=9835'), {
      kind: 'player',
      id: '9835',
    })
  })

  it('treats 4-8 digit ids as match first, then text for names', () => {
    assert.deepEqual(parseBasketQuery('20053'), { kind: 'match', id: '20053' })
    assert.equal(parseBasketQuery('Honka U14').kind, 'text')
  })

  it('normalizes Finnish accents', () => {
    assert.equal(normalizeSearch('Erä'), normalizeSearch('Era'))
    assert.equal(normalizeSearch('Tytöt'), 'tytot')
  })
})

describe('season helpers', () => {
  it('maps autumn and spring from date and category', () => {
    assert.equal(determineSeasonHalf('2026-09-12', 'U14'), 'syksy')
    assert.equal(determineSeasonHalf('2026-03-02', 'U14'), 'kevat')
    assert.equal(determineSeasonHalf('2026-01-01', 'Syksy'), 'syksy')
    assert.equal(getSeasonYear('2026-09-12'), '2026')
  })
})

describe('form letters V/T/H', () => {
  it('computes Finnish form from group matches', () => {
    const form = lastFormForTeam('20053', [
      { matchId: '1', date: '2026-09-01', time: '18:00', homeTeam: 'A', awayTeam: 'B', homeTeamId: '20053', awayTeamId: '9', scoreHome: 70, scoreAway: 60, status: 'played' },
      { matchId: '2', date: '2026-09-08', time: '18:00', homeTeam: 'A', awayTeam: 'B', homeTeamId: '8', awayTeamId: '20053', scoreHome: 80, scoreAway: 70, status: 'played' },
      { matchId: '3', date: '2026-09-15', time: '18:00', homeTeam: 'A', awayTeam: 'B', homeTeamId: '20053', awayTeamId: '7', scoreHome: 64, scoreAway: 64, status: 'played' },
    ])
    assert.deepEqual(form, ['V', 'H', 'T'])
  })

  it('attaches form to standings rows', () => {
    const rows = mapGroupTeamsToStandings(
      [{ teamId: '20053', teamName: 'Honka', rank: 1, points: 4, played: 2, wins: 2, draws: 0, losses: 0, goalsFor: 140, goalsAgainst: 110, diff: 30 }],
      [{ matchId: '1', date: '2026-09-01', time: '18:00', homeTeam: 'Honka', awayTeam: 'ToPo', homeTeamId: '20053', awayTeamId: '1', scoreHome: 80, scoreAway: 50, status: 'played' }],
    )
    assert.equal(rows[0].form[0], 'V')
    assert.equal(rows[0].pointsFor, 140)
  })
})

describe('upcoming 0-0 fixtures', () => {
  it('does not treat future 0-0 as a final score', () => {
    const future = mapMatchFixture({
      match_id: '1010001',
      date: '2099-12-01',
      time: '18:00',
      team_A_name: 'Honka',
      team_B_name: 'ToPo',
      team_A_id: '20053',
      team_B_id: '1',
      fs_A: 0,
      fs_B: 0,
      status: 'fixture',
      venue_name: 'Tapiola',
      category_name: 'U14',
    }, '20053')
    assert.equal(future.score, undefined)
    assert.equal(future.scoreHome, undefined)
    assert.equal(future.isWin, undefined)
  })

  it('keeps a played 0-0 as a real score', () => {
    const played = mapMatchFixture({
      match_id: '1010002',
      date: '2020-01-01',
      time: '18:00',
      team_A_name: 'Honka',
      team_B_name: 'ToPo',
      team_A_id: '20053',
      team_B_id: '1',
      fs_A: 0,
      fs_B: 0,
      status: 'played',
      venue_name: 'Tapiola',
      category_name: 'U14',
    }, '20053')
    assert.equal(played.score, '0–0')
    assert.equal(played.isDraw, true)
  })
})
