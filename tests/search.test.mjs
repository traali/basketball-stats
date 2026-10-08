/**
 * Search uses only what Basket.fi (TASO) returns. Fixtures are real answers
 * (2026-10-08, player names anonymised): getClubs, getClub 1447, getTeam 5751397.
 */
import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { searchBasketData, parseBasketQuery } from '../src/services/basketApi.ts'
import { searchBasket, searchNumber, tokenMatches, currentTeams } from '../src/services/basketSearch.ts'

const fx = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))
const CLUBS = fx('basket-get-clubs.json')
const CLUB = fx('basket-get-club.json')
const TEAM = fx('basket-get-team.json')
const MATCH = { call: { status: 'ok' }, match: fx('basket-get-match.json').matches.played }
const json = (body) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
const ok = (extra) => json({ call: { status: 'ok' }, ...extra })
const notFound = (msg) => json({ call: { status: 'error', error_message: msg } })

function tasoMock(input) {
  const url = new URL(String(input))
  const method = url.pathname.split('/').pop()
  const p = url.searchParams
  if (method === 'getClubs') return CLUBS
  if (method === 'getClub') return p.get('club_id') === '1447' ? CLUB : { call: { status: 'error', error_message: 'Club not found' } }
  if (method === 'getTeam') return p.get('team_id') === '5751397' ? TEAM : 'PHP dump'
  if (method === 'getMatch') return p.get('match_id') === MATCH.match.match_id ? MATCH : { call: { status: 'error', error_message: 'Match not found or published 3' } }
  if (method === 'getPlayer') return { call: { status: 'error', error_message: 'Player not found' } }
  if (method === 'getCompetitions') return { call: { status: 'ok' }, competitions: [] }
  return { call: { status: 'ok' } }
}

async function withTaso(fn) {
  const m = mock.method(globalThis, 'fetch', async (input) => {
    const body = tasoMock(input)
    return typeof body === 'string' ? new Response(body, { status: 200 }) : json(body)
  })
  try {
    return await fn(m)
  } finally {
    m.mock.restore()
  }
}

const byKind = (hits, kind) => hits.filter((h) => h.kind === kind)

describe('team search: getClubs, then getClub teams', () => {
  it('«LePy 16» finds the club and only its current-season 16-year teams', () =>
    withTaso(async () => {
      const res = await searchBasketData('LePy 16')
      assert.equal(res.failed, false)
      assert.deepEqual(byKind(res.hits, 'club').map((h) => h.id), ['1447'])
      const teams = byKind(res.hits, 'team')
      assert.deepEqual(teams.map((t) => t.id), ['5751397'])
      assert.match(teams[0].subtitle, /16-vuotiaat pojat I divisioona/)
    }))

  it('«Pyrintö U16» maps U16 to "16-vuotiaat"', () =>
    withTaso(async () => {
      const res = await searchBasketData('Pyrintö U16')
      assert.ok(byKind(res.hits, 'team').some((t) => t.id === '5751397'))
      // an older-season team and archived teams are not offered
      assert.ok(!res.hits.some((h) => ['5750422', '5753363', '5754845'].includes(h.id)))
    }))
})

describe('player search: club + name, via getTeam rosters', () => {
  it('«LePy Suku639» finds the player from the roster', () =>
    withTaso(async () => {
      const res = await searchBasketData('LePy Suku639')
      const players = byKind(res.hits, 'player')
      assert.deepEqual(players.map((p) => p.id), ['16639'])
      assert.equal(players[0].title, 'Etu639 Suku639')
      assert.match(players[0].subtitle, /#4 · LePy/)
    }))

  it('an unknown name in a known club says so instead of inventing a hit', () =>
    withTaso(async () => {
      const res = await searchBasketData('LePy Eiolemassa')
      assert.equal(byKind(res.hits, 'player').length, 0)
      assert.match(res.hint, /Ei pelaajaa «eiolemassa»/)
    }))

  it('a bare name is searched in favourite teams only, with an honest hint otherwise', () =>
    withTaso(async () => {
      const fav = await searchBasketData('Suku257', { favoriteTeams: [{ id: '5751397', name: 'LePy' }] })
      assert.deepEqual(byKind(fav.hits, 'player').map((p) => p.id), ['59257'])
      const none = await searchBasketData('Suku257')
      assert.equal(byKind(none.hits, 'player').length, 0)
      assert.match(none.hint, /ei tarjoa pelaajien nimihakua/)
    }))
})

describe('ids and URLs are looked up, never fabricated', () => {
  it('a known game id gives the real game; unknown team/player ids give nothing', () =>
    withTaso(async () => {
      const res = await searchBasketData(MATCH.match.match_id)
      assert.deepEqual(res.hits.map((h) => h.kind), ['match'])
      assert.match(res.hits[0].subtitle, /klo/)
    }))

  it('an unknown number shows "not known", not «Ottelu #123»', () =>
    withTaso(async () => {
      const res = await searchBasketData('424242424')
      assert.equal(res.hits.length, 0)
      assert.equal(res.failed, false)
      assert.match(res.hint, /ei tunne tunnusta/)
    }))

  it('a tulospalvelu club URL opens that club', () =>
    withTaso(async () => {
      assert.deepEqual(parseBasketQuery('https://tulospalvelu.basket.fi/club/1447'), { kind: 'club', id: '1447' })
      const res = await searchBasketData('https://tulospalvelu.basket.fi/club/1447')
      assert.deepEqual(res.hits.map((h) => [h.kind, h.id, h.title]), [['club', '1447', 'Leppävaaran Pyrintö']])
    }))
})

describe('outages are failures, not "no hits"', () => {
  const down = () => Promise.reject(new Error('Basket.fi call failed: upstream 403'))
  const deps = {
    clubs: down,
    club: down,
    roster: down,
    competitions: down,
    categories: down,
    match: down,
    team: down,
    player: down,
    clubById: down,
  }

  it('getClubs failing marks the search failed', async () => {
    const res = await searchBasket({ kind: 'text', q: 'Honka' }, deps)
    assert.equal(res.failed, true)
    assert.equal(res.hits.length, 0)
  })

  it('every id lookup failing marks the search failed', async () => {
    const res = await searchNumber('1009819', deps)
    assert.equal(res.failed, true)
  })

  it('club found but every roster call failing is a failure, not "no player"', async () => {
    const club = { clubId: '1', name: 'Testiseura', abbreviation: 'TS', cityName: 'Espoo' }
    const res = await searchBasket({ kind: 'text', q: 'Testiseura Virtanen' }, {
      ...deps,
      clubs: async () => [club],
      club: async () => ({ ...club, teams: [{ teamId: '9', teamName: 'TS', status: 'active', current: true, categoryName: 'Miehet', competitionName: 'X' }] }),
    })
    assert.equal(res.hint, undefined)
    // the club hit is real, so the page shows it; no player is invented
    assert.deepEqual(res.hits.map((h) => h.kind), ['club'])
  })
})

describe('matching helpers', () => {
  it('matches word prefixes and U-age groups', () => {
    assert.equal(tokenMatches('lepy', ['lepy']), true)
    assert.equal(tokenMatches('u16', ['16', 'vuotiaat']), true)
    assert.equal(tokenMatches('honkanen', ['honka']), false)
  })

  it('currentTeams prefers this season, then any active team', () => {
    const t = (id, status, current) => ({ teamId: id, teamName: 'X', status, current, categoryName: '', competitionName: '' })
    assert.deepEqual(currentTeams({ teams: [t('1', 'active', true), t('2', 'active', false), t('3', 'archived', false)] }).map((x) => x.teamId), ['1'])
    assert.deepEqual(currentTeams({ teams: [t('2', 'active', false), t('3', 'archived', false)] }).map((x) => x.teamId), ['2'])
  })
})
