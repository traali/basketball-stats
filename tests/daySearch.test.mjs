/** Bare player name: found via today's team rosters and game lineups (TASO has no name search). */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { searchBasket, scanDayPlayers } from '../src/services/basketSearch.ts'
import { mapDayGames } from '../src/services/basketApi.ts'

const games = [
  { matchId: '900', time: '12:40', homeId: '1', homeName: 'BC Nokia', awayId: '2', awayName: 'Pyrintö', score: '51–68' },
  { matchId: '901', time: '14:00', homeId: '3', homeName: 'Honka', awayId: '4', awayName: 'ToPo', score: '40–42' },
]
const p = (id, name, teamName = '') => ({ playerId: id, fullName: name, shirtNumber: '7', teamName })
const base = {
  clubs: async () => [],
  club: async () => null,
  competitions: async () => [],
  categories: async () => [],
  match: async () => null,
  team: async () => null,
  player: async () => null,
  clubById: async () => null,
}

describe('day player search', () => {
  it('finds a player in a team roster of a game today, with team and game', async () => {
    const deps = { ...base, dayGames: async () => games, roster: async (id) => (id === '2' ? [p('11', 'Lilli Testinen')] : []), matchPlayers: async () => [] }
    const out = await searchBasket({ kind: 'text', q: 'Lilli Testinen' }, deps)
    const hit = out.hits.find((h) => h.kind === 'player')
    assert.equal(hit.id, '11')
    assert.match(hit.subtitle, /Pyrintö/)
    assert.match(hit.subtitle, /12:40 BC Nokia – Pyrintö 51–68/)
    assert.ok(out.hits.some((h) => h.kind === 'match' && h.id === '900'))
  })

  it('falls back to the game lineup when the rosters are empty', async () => {
    let lineupCalls = 0
    const deps = { ...base, dayGames: async () => games, roster: async () => [], matchPlayers: async (m) => (lineupCalls++, m === '901' ? [p('12', 'Aino Esim', 'ToPo')] : []) }
    const out = await searchBasket({ kind: 'text', q: 'aino' }, deps)
    assert.equal(out.hits.find((h) => h.kind === 'player').id, '12')
    assert.equal(lineupCalls, 2)
  })

  it('says honestly when the name is not in today\'s games', async () => {
    const deps = { ...base, dayGames: async () => games, roster: async () => [p('1', 'Joku Muu')], matchPlayers: async () => [] }
    const out = await searchBasket({ kind: 'text', q: 'Lilli Oinonen' }, deps)
    assert.equal(out.hits.length, 0)
    assert.match(out.hint, /tämän päivän 2 pelin/)
  })

  it('stops at the timeout and reports how far it got', async () => {
    const deps = { ...base, dayGames: async () => games, roster: () => new Promise(() => {}), matchPlayers: async () => [] }
    const scan = await scanDayPlayers(['lilli'], deps, 50)
    assert.equal(scan.timedOut, true)
    assert.equal(scan.checked, 0)
  })

  it('maps getMatches rows to day games (real 2026-10-24 row)', () => {
    const rows = [{ match_id: '1007047', date: '2026-10-24', time: '12:40:00', team_A_id: '5755043', team_A_name: 'BC Nokia', team_B_id: '5754652', team_B_name: 'Tampereen Pyrintö', fs_A: '51', fs_B: '68', status: 'Played' },
      { match_id: '1', date: '2026-10-24', time: '18:00:00', team_A_id: '0', team_A_name: 'A', team_B_id: '5', team_B_name: 'B', fs_A: '', fs_B: '', status: 'Fixture' }]
    const g = mapDayGames(rows, '2026-10-24')
    assert.deepEqual(g[0], { matchId: '1007047', time: '12:40', homeId: '5755043', homeName: 'BC Nokia', awayId: '5754652', awayName: 'Tampereen Pyrintö', score: '51–68', upcoming: false })
    assert.equal(g[1].homeId, '')
    assert.equal(g[1].upcoming, true)
  })
})
