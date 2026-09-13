import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseBasketTeamId,
  isTorneopalTeamId,
  normalizeFavoriteTeams,
  getTeamIdFromSearch,
  buildSearchWithIds,
} from '../src/utils/favoriteTeams.ts'

test('parseBasketTeamId extracts numeric id from common formats', () => {
  assert.equal(parseBasketTeamId('20053'), '20053')
  assert.equal(parseBasketTeamId('https://tulospalvelu.basket.fi/team/20053'), '20053')
  assert.equal(parseBasketTeamId('https://tulospalvelu.basket.fi/?team_id=20053'), '20053')
  assert.equal(parseBasketTeamId('?team=20053'), '20053')
  assert.equal(parseBasketTeamId('honka-u14'), '')
})

test('isTorneopalTeamId validates only numeric ids', () => {
  assert.equal(isTorneopalTeamId('20053'), true)
  assert.equal(isTorneopalTeamId('honka-u14'), false)
  assert.equal(isTorneopalTeamId(''), false)
})

test('normalizeFavoriteTeams keeps only unique valid id+name items', () => {
  const normalized = normalizeFavoriteTeams([
    { id: '20053', name: 'Honka' },
    { id: 'honka-u14', name: 'Legacy slug' },
    { id: '20053', name: 'Duplicate' },
    { id: '', name: 'No id' },
    { id: '20111', name: 'PuHu' },
  ])
  assert.deepEqual(normalized, [
    { id: '20053', name: 'Honka' },
    { id: '20111', name: 'PuHu' },
  ])
})

test('getTeamIdFromSearch reads team id from url params', () => {
  assert.equal(getTeamIdFromSearch('?team=20053'), '20053')
  assert.equal(getTeamIdFromSearch('?team_id=20053'), '20053')
  assert.equal(getTeamIdFromSearch('?teamId=20053'), '20053')
})

test('buildSearchWithIds updates and clears id params predictably', () => {
  assert.equal(buildSearchWithIds('?foo=1', { teamId: '20053', matchId: '1011397', playerId: '9835' }), 'foo=1&team=20053&matchId=1011397&playerId=9835')
  assert.equal(buildSearchWithIds('?team=20053&matchId=1011397', { teamId: null, matchId: '2000000' }), 'matchId=2000000')
})
