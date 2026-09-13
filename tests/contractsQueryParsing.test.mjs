import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseIncomingCrossRepoQuery } from '../src/types/contracts.ts'

describe('cross-repo query parsing', () => {
  it('keeps explicit targetId precedence', () => {
    const query = parseIncomingCrossRepoQuery(new URLSearchParams('targetId=999&matchId=123&teamId=456&playerId=789'))
    assert.equal(query.targetId, '999')
    assert.equal(query.matchId, '123')
    assert.equal(query.teamId, '456')
    assert.equal(query.playerId, '789')
  })

  it('uses match/game aliases before team/player for targetId fallback', () => {
    const query = parseIncomingCrossRepoQuery(new URLSearchParams('teamId=456&playerId=789&gameId=123'))
    assert.equal(query.targetId, '123')
    assert.equal(query.matchId, '123')
  })

  it('falls back to team and then player when match is missing', () => {
    const teamQuery = parseIncomingCrossRepoQuery(new URLSearchParams('team=456&player=789'))
    const playerQuery = parseIncomingCrossRepoQuery(new URLSearchParams('player=789'))

    assert.equal(teamQuery.targetId, '456')
    assert.equal(teamQuery.teamId, '456')
    assert.equal(playerQuery.targetId, '789')
    assert.equal(playerQuery.playerId, '789')
  })

  it('supports snake_case basket identifiers', () => {
    const query = parseIncomingCrossRepoQuery(new URLSearchParams('team_id=20053&player_id=9835&match_id=1019999'))
    assert.equal(query.matchId, '1019999')
    assert.equal(query.teamId, '20053')
    assert.equal(query.playerId, '9835')
    assert.equal(query.targetId, '1019999')
  })
})
