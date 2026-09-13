import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { extractMatchLineups, mapLineupPlayer } from '../src/services/basketApi.ts'

describe('basketball match lineups', () => {
  it('reads TASO lineups[] split by team_id, including 0-point Ennakko', () => {
    const { home, away } = extractMatchLineups({
      team_A_id: '20053',
      team_B_id: '99',
      team_A_name: 'Visa Platinum',
      team_B_name: 'ToPoLa',
      lineups: [
        { player_id: '9835', first_name: 'Elina', last_name: 'Helin', shirt_number: '5', team_id: '20053', points: 0, fouls: 0, assists: 0 },
        { player_id: '1', first_name: 'Ada', last_name: 'Away', shirt_number: '7', team_id: '99', points: 12, fouls: 2, assists: 3 },
      ],
    })
    assert.equal(home.length, 1)
    assert.equal(home[0].fullName, 'Elina Helin')
    assert.equal(home[0].points, 0)
    assert.equal(away[0].points, 12)
    assert.equal(away[0].assists, 3)
  })

  it('skips “Ei pelaajia” placeholders', () => {
    const { home, away } = extractMatchLineups({
      team_A_id: '1',
      team_B_id: '2',
      team_A_name: 'A',
      team_B_name: 'B',
      lineups: [{ player_name: 'Ei pelaajia', player_id: '' }],
    })
    assert.equal(home.length, 0)
    assert.equal(away.length, 0)
  })

  it('maps getTeam roster fields', () => {
    const p = mapLineupPlayer(
      { player_id: '10073', first_name: 'Henna', last_name: 'Perttilahti', shirt_number: '3', birthyear: '1998', points: 0 },
      'Visa Platinum',
      '20053',
    )
    assert.equal(p.fullName, 'Henna Perttilahti')
    assert.equal(p.birthYear, '1998')
  })
})
