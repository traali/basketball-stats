import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseBasketResourceFromLocation } from '../src/services/basketApi.ts'

describe('basket URL resource parsing', () => {
  it('parses path-based match ids', () => {
    const parsed = parseBasketResourceFromLocation('https://basketball-stats-byu.pages.dev/match/1012345')
    assert.deepEqual(parsed, { kind: 'match', id: '1012345' })
  })

  it('prefers match before team and player from query params', () => {
    const parsed = parseBasketResourceFromLocation('https://basketball-stats-byu.pages.dev/?teamId=20053&playerId=9835&matchId=1019999')
    assert.deepEqual(parsed, { kind: 'match', id: '1019999' })
  })

  it('parses team and player query aliases', () => {
    const team = parseBasketResourceFromLocation('https://basketball-stats-byu.pages.dev/?team=20053')
    const teamSnake = parseBasketResourceFromLocation('https://basketball-stats-byu.pages.dev/?team_id=20053')
    const player = parseBasketResourceFromLocation('https://basketball-stats-byu.pages.dev/?player=9835')
    const playerSnake = parseBasketResourceFromLocation('https://basketball-stats-byu.pages.dev/?player_id=9835')
    assert.deepEqual(team, { kind: 'team', id: '20053' })
    assert.deepEqual(teamSnake, { kind: 'team', id: '20053' })
    assert.deepEqual(player, { kind: 'player', id: '9835' })
    assert.deepEqual(playerSnake, { kind: 'player', id: '9835' })
  })

  it('parses pasted tulospalvelu URL from url= query', () => {
    const encoded = encodeURIComponent('https://tulospalvelu.basket.fi/team/?team_id=20053')
    const parsed = parseBasketResourceFromLocation(`https://basketball-stats-byu.pages.dev/?url=${encoded}`)
    assert.deepEqual(parsed, { kind: 'team', id: '20053' })
  })
})
