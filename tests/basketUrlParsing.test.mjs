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
    const player = parseBasketResourceFromLocation('https://basketball-stats-byu.pages.dev/?player=9835')
    assert.deepEqual(team, { kind: 'team', id: '20053' })
    assert.deepEqual(player, { kind: 'player', id: '9835' })
  })

  it('parses pasted tulospalvelu URL from url= query', () => {
    const encoded = encodeURIComponent('https://tulospalvelu.basket.fi/team/?team_id=20053')
    const parsed = parseBasketResourceFromLocation(`https://basketball-stats-byu.pages.dev/?url=${encoded}`)
    assert.deepEqual(parsed, { kind: 'team', id: '20053' })
  })

  it('parses hash-router match, team and player paths', () => {
    const match = parseBasketResourceFromLocation('https://basketball-stats-byu.pages.dev/#/match/1012345')
    const team = parseBasketResourceFromLocation('https://basketball-stats-byu.pages.dev/#/team/20053')
    const player = parseBasketResourceFromLocation('https://basketball-stats-byu.pages.dev/#/player/9835')
    assert.deepEqual(match, { kind: 'match', id: '1012345' })
    assert.deepEqual(team, { kind: 'team', id: '20053' })
    assert.deepEqual(player, { kind: 'player', id: '9835' })
  })

  it('parses snake_case query aliases from hash', () => {
    const match = parseBasketResourceFromLocation('https://basketball-stats-byu.pages.dev/#/?match_id=1012345')
    const team = parseBasketResourceFromLocation('https://basketball-stats-byu.pages.dev/#/?team_id=20053')
    const player = parseBasketResourceFromLocation('https://basketball-stats-byu.pages.dev/#/?player_id=9835')
    assert.deepEqual(match, { kind: 'match', id: '1012345' })
    assert.deepEqual(team, { kind: 'team', id: '20053' })
    assert.deepEqual(player, { kind: 'player', id: '9835' })
  })
})

describe('Pelipäivä deep link #/match/<TASO match_id>', () => {
  it('resolves the hash route to the TASO match_id (not the printed game number)', () => {
    assert.deepEqual(parseBasketResourceFromLocation('https://basketball-stats-byu.pages.dev/#/match/1009819'), {
      kind: 'match',
      id: '1009819',
    })
    assert.deepEqual(parseBasketResourceFromLocation('https://basketball-stats-byu.pages.dev/#/match/1009819?embed=true'), {
      kind: 'match',
      id: '1009819',
    })
  })

  it('the router serves /match/:matchId and MatchPage loads getMatch?match_id=', async () => {
    const { readFileSync } = await import('node:fs')
    const routes = readFileSync(new URL('../src/routes.tsx', import.meta.url), 'utf8')
    assert.match(routes, /path: '\/match\/:matchId', element: <MatchPage \/>/)
    const api = readFileSync(new URL('../src/services/basketApi.ts', import.meta.url), 'utf8')
    assert.match(api, /getMatch\?match_id=\$\{encodeURIComponent\(matchId\)\}/)
  })
})
