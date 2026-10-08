/**
 * Search uses only what Basket.fi (TASO) returns. Fixtures are real answers
 * (2026-10-08, player names anonymised): getClubs, getClub 1447, getTeam 5751397.
 */
import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { searchBasketData, parseBasketQuery } from '../src/services/basketApi.ts'
import { searchBasket, searchNumber, tokenMatches, currentTeams, ROSTER_CONCURRENCY } from '../src/services/basketSearch.ts'
import { createRosterCache, cachedRoster } from '../src/utils/rosterCache.ts'

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
  if (method === 'getTeam') {
    const id = p.get('team_id')
    if (id === '5751397') return TEAM
    // other teams of the club exist but have no registered players; unknown ids get TASO's PHP dump
    if (CLUB.club.teams.some((t) => t.team_id === id)) return { call: { status: 'ok' }, team: { team_id: id, team_name: 'LePy', players: [] } }
    return 'PHP dump'
  }
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

  const club = { clubId: '1', name: 'Testiseura', abbreviation: 'TS', cityName: 'Espoo' }
  const team = (id) => ({ teamId: id, teamName: 'TS', status: 'active', current: true, categoryName: `Sarja ${id}`, competitionName: 'X' })
  const clubDeps = (roster) => ({
    ...deps,
    clubs: async () => [club],
    club: async () => ({ ...club, teams: ['1', '2', '3', '4'].map(team) }),
    roster,
  })

  it('club found but every roster call failing says the search failed, never "no player"', async () => {
    const res = await searchBasket({ kind: 'text', q: 'Testiseura Virtanen' }, clubDeps(down))
    assert.deepEqual(res.hits.map((h) => h.kind), ['club'])
    assert.match(res.hint, /4\/4 kokoonpanon haku epäonnistui/)
    assert.doesNotMatch(res.hint, /^Ei pelaajaa/)
  })

  it('some rosters failing: names the failed teams instead of claiming "not found"', async () => {
    const roster = async (id) => {
      if (id === '3') throw new Error('upstream 403')
      return [{ playerId: `p${id}`, fullName: `Etu Muu${id}`, shirtNumber: '7', teamName: 'TS' }]
    }
    const res = await searchBasket({ kind: 'text', q: 'Testiseura Virtanen' }, clubDeps(roster))
    assert.match(res.hint, /1\/4 kokoonpanon haku epäonnistui \(TS · Sarja 3\)/)
    assert.match(res.hint, /haku jäi kesken/)
  })

  it('reports progress as rosters arrive and shows hits found so far', async () => {
    const roster = async (id) => [{ playerId: `p${id}`, fullName: id === '2' ? 'Ville Virtanen' : 'Muu Pelaaja', shirtNumber: '', teamName: 'TS' }]
    const seen = []
    const res = await searchBasket({ kind: 'text', q: 'Testiseura Virtanen' }, clubDeps(roster), {
      onProgress: (p) => seen.push([p.done, p.total, p.hits.filter((h) => h.kind === 'player').length]),
    })
    assert.deepEqual(seen[0], [0, 4, 0])
    assert.deepEqual(seen.at(-1), [4, 4, 1])
    assert.ok(seen.every(([d], i) => i === 0 || d >= seen[i - 1][0]))
    assert.deepEqual(res.hits.filter((h) => h.kind === 'player').map((h) => h.title), ['Ville Virtanen'])
    assert.equal(res.hint, undefined)
  })

  it('fetches rosters in parallel, at most ROSTER_CONCURRENCY at a time', async () => {
    let active = 0
    let peak = 0
    const roster = async () => {
      active++
      peak = Math.max(peak, active)
      await new Promise((r) => setTimeout(r, 5))
      active--
      return []
    }
    const many = { ...clubDeps(roster), club: async () => ({ ...club, teams: Array.from({ length: 20 }, (_, i) => team(String(i))) }) }
    await searchBasket({ kind: 'text', q: 'Testiseura Virtanen' }, many)
    assert.equal(peak, ROSTER_CONCURRENCY)
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

describe('roster cache (sessionStorage, short TTL)', () => {
  const mem = () => {
    const d = new Map()
    return { getItem: (k) => (d.has(k) ? d.get(k) : null), setItem: (k, v) => d.set(k, String(v)), removeItem: (k) => d.delete(k), key: (i) => [...d.keys()][i] ?? null, get length() { return d.size } }
  }
  const P = [{ playerId: '1', fullName: 'A B', shirtNumber: '4', teamId: '9', teamName: 'T', points: null, assists: null, fouls: null, threePointers: null }]

  it('reuses a fresh roster and refetches after the TTL', async () => {
    let t = 0
    let calls = 0
    const cache = createRosterCache(mem(), 1000, () => t)
    const get = cachedRoster(async () => { calls++; return P }, cache)
    await get('9')
    await get('9')
    assert.equal(calls, 1)
    t = 1001
    await get('9')
    assert.equal(calls, 2)
  })

  it('never caches a failure', async () => {
    let calls = 0
    const get = cachedRoster(async () => { calls++; throw new Error('403') }, createRosterCache(mem()))
    await assert.rejects(get('9'))
    await assert.rejects(get('9'))
    assert.equal(calls, 2)
  })
})
