/**
 * Tournaments (turnaukset) from real koripallo-api.torneopal.net answers,
 * fetched 2026-10-17 (tests/fixtures/basket-tournament-*.json,
 * basket-day-2026-10-24.json, basket-group-lisasarja.json). Team names are
 * clubs' team names; no player data is in these fixtures.
 */
import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildTournamentView,
  findTournaments,
  hasTasoStandings,
  isTieHeader,
  parseSlotSource,
  parseTournamentKey,
  rowsOfTournament,
  teamSlot,
  tieKind,
  tournamentKey,
} from '../src/utils/tournament.ts'
import { fetchBasketGroup, fetchBasketMatchesByGroup, fetchBasketTournament, mapMatchDetail, mapMatchFixture } from '../src/services/basketApi.ts'
import { searchBasket, tournamentHits } from '../src/services/basketSearch.ts'
import { parseFavorites, toggleFavorite } from '../src/utils/favoritesStore.ts'

const load = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))
const karsinta = load('basket-tournament-karsinta.json')
const cup = load('basket-tournament-cup.json')
const round = load('basket-tournament-round.json')
const ties = load('basket-tournament-ties.json')
const day = load('basket-day-2026-10-24.json')
const lisasarja = load('basket-group-lisasarja.json')

const AFTER = new Date('2026-10-17T10:00:00Z')

describe('placeholder teams', () => {
  it('a slot needs a TASO team id; "v863" from getGroup is the winner of game 863, not a team', () => {
    const v863 = cup.group.teams.find((t) => t.team_name === 'v863')
    assert.equal(v863.team_id, '0')
    const slot = teamSlot(v863.team_name, v863.team_id)
    assert.equal(slot.placeholder, true)
    assert.equal(slot.id, undefined)
    assert.equal(slot.name, 'Ottelun 863 voittaja')
  })

  it('decodes TASO descriptions: v/h + game number, group/roman rank', () => {
    assert.deepEqual(parseSlotSource('v2'), { kind: 'winner', matchNumber: '2' })
    assert.deepEqual(parseSlotSource('h583'), { kind: 'loser', matchNumber: '583' })
    assert.deepEqual(parseSlotSource('Alkusarja/IV'), { kind: 'rank', group: 'Alkusarja', rank: 4 })
    assert.deepEqual(parseSlotSource('Puolivälierät/1'), { kind: 'rank', group: 'Puolivälierät', rank: 1 })
    assert.equal(parseSlotSource('Lohko A 1.'), undefined)
    assert.equal(teamSlot('', '', 'Alkusarja/I').name, 'Alkusarja 1.')
    assert.equal(teamSlot('Lohko A 1.', '0').name, 'Lohko A 1.')
    assert.equal(teamSlot('Lohko A 1.', '0').placeholder, true)
    assert.equal(teamSlot('', '', '6').name, 'Joukkue vahvistuu', 'a bare draw number says nothing about the team')
  })

  it('a real team keeps its name even when its description is a source ("v2")', () => {
    const g = karsinta.matches.find((m) => m.match_id === '1005600')
    assert.equal(g.team_B_description, 'v2')
    const slot = teamSlot(g.team_B_name, g.team_B_id, g.team_B_description)
    assert.deepEqual(slot, { name: 'LePy', id: '5753334', placeholder: false })
  })

  it('a placeholder game (no team ids yet) is never 0–0 and never links to /team/0', () => {
    const real = karsinta.matches.find((m) => m.match_id === '1005602')
    // The same TASO row before the teams were set: ids "0", names empty, sources in the descriptions.
    const before = { ...real, team_A_id: '0', team_A_name: '', team_B_id: '0', team_B_name: '', status: 'Fixture', fs_A: '0', fs_B: '0', winner: '' }
    const fx = mapMatchFixture(before, undefined, AFTER)
    assert.equal(fx.homeTeam, 'Ottelun 3 voittaja')
    assert.equal(fx.awayTeam, 'Ottelun 4 voittaja')
    assert.equal(fx.homeTeamId, undefined)
    assert.equal(fx.homePlaceholder, true)
    assert.equal(fx.score, undefined)
    const detail = mapMatchDetail(before, '', AFTER)
    assert.equal(detail.scoreHome, null)
    assert.equal(detail.homeTeamId, undefined)
    const view = buildTournamentView([...karsinta.matches.filter((m) => m.match_id !== '1005602'), before], AFTER)
    const game = view.days.flatMap((d) => d.courts.flatMap((c) => c.games)).find((x) => x.matchId === '1005602')
    assert.equal(game.home.name, 'TuNMKY–HoNsU/JBA voittaja', 'resolved from the loaded game number 3')
    assert.equal(game.scoreHome, undefined)
  })

  it('real blank TASO rows (huki valmistavat, Planned, no teams) say "Joukkue vahvistuu"', () => {
    const fx = mapMatchFixture({ match_id: '968894', status: 'Planned', date: '', team_A_id: '', team_A_name: '', team_B_id: '', team_B_name: '', fs_A: '', fs_B: '' }, undefined, AFTER)
    assert.equal(fx.homeTeam, 'Joukkue vahvistuu')
    assert.equal(fx.state, 'unscheduled')
    assert.equal(fx.score, undefined)
  })
})

describe('double elimination weekend (19-v pojat SM-karsinnat, Lohko A Jyväskylä)', () => {
  const view = buildTournamentView(karsinta.matches, AFTER)

  it('lists games by Helsinki day, then court, in time order', () => {
    assert.deepEqual(view.days.map((d) => d.date), ['2026-09-15', '2026-09-19', '2026-09-20'])
    const sat = view.days[1]
    assert.deepEqual(sat.courts.map((c) => c.venue), ['Lehtisaaren Kuntotalo'])
    assert.deepEqual(sat.courts[0].games.map((g) => g.time), ['14:00:00', '17:00:00'])
    const sun = view.days[2].courts[0].games
    assert.deepEqual(sun.map((g) => g.matchNumber), ['5', '26', '27'])
    assert.equal(sun[0].roundName, 'Voittaja SM-Sarjaan, häviäjä ratkaisuotteluun')
  })

  it('placements come only from final_position_win/lost of played games', () => {
    assert.deepEqual(
      view.placements.map((p) => `${p.position} ${p.team.name}`),
      ['1 HoNsU/JBA', '2 ToPo', '3 TuNMKY', '4 LePy', '5 Hyvinkään Ponteva'],
    )
    const final = view.days[2].courts[0].games[2]
    assert.equal(final.placement, 'Voittaja sijalle 2 · häviäjä sijalle 3')
    assert.equal(`${final.scoreHome}–${final.scoreAway}`, '94–79')
  })

  it('getGroup lists a team once per round with blank standings: no table', () => {
    assert.equal(hasTasoStandings(karsinta.group.teams), false)
    assert.equal(karsinta.group.teams.length, 12)
  })
})

describe('hosted junior rounds (10-v mikropojat II div, la 24.10.)', () => {
  it('each TASO round with a host team is one tournament', () => {
    const found = findTournaments(round.matches)
    assert.deepEqual(
      found.map((t) => `${t.roundId} ${t.hostTeamName} ${t.venues.join('/')} ${t.gameCount}`),
      [
        '6 HNMKY/2017 Stadi White Hotelli Arthur 3',
        '8 HNMKY/Pakila RED 2017 Malmin palloiluhalli 2 3',
        '9 Sykki Pohjois-Haagan ala-aste 4',
        '10 Venom Jokiniemen koulu / Tiilitalo 4',
      ],
    )
    assert.equal(found[3].key, 'etekp2627.35431.303194.10')
  })

  it('no game is "Käynnissä" unless TASO says so — even with four games on a court that day', () => {
    const k = parseTournamentKey('etekp2627.35431.303194.10')
    const rows = rowsOfTournament(round.matches, k)
    const during = new Date('2026-10-24T13:30:00Z') // 16.30 Helsinki: the 16.20 game has started
    const view = buildTournamentView(rows, during)
    assert.equal(view.liveCount, 0)
    const states = view.days[0].courts[0].games.map((g) => g.state)
    assert.deepEqual(states, ['awaiting', 'awaiting', 'upcoming', 'upcoming'])
    const oneLive = rows.map((m) => (m.match_id === '1017587' ? { ...m, status: 'Live', fs_A: '12', fs_B: '9' } : m))
    const v2 = buildTournamentView(oneLive, during)
    assert.equal(v2.liveCount, 1)
    const live = v2.days[0].courts[0].games.find((g) => g.state === 'live')
    assert.equal(live.matchId, '1017587')
    assert.equal(`${live.scoreHome}–${live.scoreAway}`, '12–9')
  })

  it('mikro groups have no TASO table (standings blank): the group page shows none, not zeros', async () => {
    assert.equal(hasTasoStandings(round.group.teams), false)
    const fetchMock = mock.method(globalThis, 'fetch', async (url) => {
      const u = String(url)
      const body = u.includes('getGroup?')
        ? { call: { status: 'ok' }, group: round.group }
        : { call: { status: 'ok' }, matches: round.matches }
      return new Response(JSON.stringify(body), { status: 200 })
    })
    try {
      const g = await fetchBasketGroup('etekp2627', '35431', '303194')
      assert.equal(g.standingsPublished, false)
      assert.deepEqual(g.teams, [])
    } finally {
      fetchMock.mock.restore()
    }
  })

  it('a jatkosarja group that TASO ranks keeps its table', () => {
    assert.equal(lisasarja.group.group_type, 'additional_group_stage')
    assert.equal(hasTasoStandings(lisasarja.group.teams), true)
  })
})

describe('the whole day of 2026-10-24 (getMatches?date=)', () => {
  const found = findTournaments(day.matches)
  it('finds hosted rounds and nothing for plain league games', () => {
    assert.ok(found.length >= 20, `found ${found.length}`)
    assert.ok(found.every((t) => t.kind === 'round' && t.hostTeamName))
    const keys = new Set(found.map((t) => t.key))
    assert.equal(keys.size, found.length)
    const venom = found.find((t) => t.key === 'etekp2627.35431.303194.10')
    assert.ok(venom)
    for (const t of found) {
      const rows = rowsOfTournament(day.matches, parseTournamentKey(t.key))
      assert.equal(rows.length, t.gameCount)
      assert.ok(rows.every((m) => m.round_host_team_id && m.round_host_team_id !== '0'))
    }
    const leagueOnly = day.matches.filter((m) => m.round_host_team_id === '0' && m.group_type === 'group_stage')
    assert.ok(leagueOnly.length > 0)
    assert.equal(findTournaments(leagueOnly).length, 0)
  })

  it('search: "turnaus" lists them, "turnaus venom" finds the Venom round', () => {
    assert.ok(tournamentHits(found, ['turnaus']).length === found.length)
    const venom = tournamentHits(found, ['turnaus', 'venom'])
    assert.equal(venom.length, 1)
    assert.equal(venom[0].kind, 'tournament')
    assert.equal(venom[0].id, 'etekp2627.35431.303194.10')
    assert.match(venom[0].subtitle, /24\.10\..*Isäntä Venom/)
  })
})

describe('cup ties and best-of series', () => {
  it('the two-leg tie row (aggregate_match = own id, no date) is not a game', () => {
    const header = cup.matches.find((m) => m.match_id === '1021707')
    assert.equal(tieKind(header), 'aggregate')
    const legs = cup.matches.filter((m) => m.aggregate_match === '1021707' && !isTieHeader(m))
    assert.deepEqual(legs.map((m) => m.match_id).sort(), ['1021708', '1021709'])
    const view = buildTournamentView(cup.matches, AFTER)
    const games = view.days.flatMap((d) => d.courts.flatMap((c) => c.games))
    assert.ok(!games.some((g) => g.matchId === '1021707'))
    assert.equal(view.undated.length, 0, 'no header shows up as an "Aika avoin" game')
    assert.equal(view.ties.length, 4)
    assert.ok(view.ties.every((t) => t.resultHome === undefined), 'undecided ties have no result')
    assert.ok(games.every((g) => g.scoreHome === undefined), 'upcoming legs have no score, never 0–0')
    assert.ok(games.every((g) => g.tieNote === 'Ottelupari (yhteispisteet)'))
  })

  it('team/group lists drop tie rows (they would read as a 3–0 game)', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () =>
      new Response(JSON.stringify({ call: { status: 'ok' }, matches: ties.matches.map((m) => ({ ...m, group_id: '1' })) }), { status: 200 }),
    )
    try {
      const list = await fetchBasketMatchesByGroup('huki2526', '1', '1')
      assert.ok(!list.some((f) => f.matchId === '1002195' || f.matchId === '1003140'))
      assert.equal(list.length, 5)
    } finally {
      fetchMock.mock.restore()
    }
  })

  it('a series row: wins 3–0 (best of 5); an aggregate row: 168–117 points; legs keep their own scores', () => {
    const view = buildTournamentView(ties.matches, AFTER)
    const series = view.ties.find((t) => t.matchId === '1002195')
    assert.equal(series.kind, 'series')
    assert.equal(series.bestOf, 5)
    assert.deepEqual([series.resultHome, series.resultAway], [3, 0])
    assert.deepEqual(series.legs.sort(), ['1002196', '1002197', '1002198'])
    const agg = view.ties.find((t) => t.matchId === '1003140')
    assert.deepEqual([agg.resultHome, agg.resultAway], [168, 117])
    const detail = mapMatchDetail(ties.matches.find((m) => m.match_id === '1002195'), '', AFTER)
    assert.equal(detail.tie, 'series')
    assert.equal(detail.scoreHome, null, 'series wins are not a game score')
    assert.deepEqual(detail.tieResult, { home: 3, away: 0 })
    // getMatch sends the same row as status "Best-Of", match_type "single" (checked 2026-10-17).
    const single = { ...ties.matches.find((m) => m.match_id === '1002195'), status: 'Best-Of', match_type: 'single' }
    const d2 = mapMatchDetail(single, '', AFTER)
    assert.equal(d2.tie, 'series')
    assert.deepEqual(d2.tieResult, { home: 3, away: 0 })
    assert.equal(d2.scoreHome, null)
    const leg = view.days.flatMap((d) => d.courts.flatMap((c) => c.games)).find((g) => g.matchId === '1002197')
    assert.equal(leg.tieNote, 'Ottelusarja, peli 2')
    assert.equal(`${leg.scoreHome}–${leg.scoreAway}`, '66–91')
  })
})

describe('tournament keys, favourites and the API path', () => {
  it('keys round-trip; a bad key is rejected', () => {
    const k = { competitionId: 'vk2627', categoryId: '27', groupId: '303026' }
    assert.equal(tournamentKey(k), 'vk2627.27.303026')
    assert.deepEqual(parseTournamentKey('vk2627.27.303026'), k)
    assert.deepEqual(parseTournamentKey('etekp2627.35431.303194.10'), { ...k, competitionId: 'etekp2627', categoryId: '35431', groupId: '303194', roundId: '10' })
    assert.equal(parseTournamentKey('vk2627/27'), undefined)
    assert.equal(parseTournamentKey('<x>.1.2'), undefined)
  })

  it('a tournament can be a favourite; v1 saves still load; junk ids are dropped', () => {
    const v1 = JSON.stringify([{ kind: 'team', id: '5751397', name: 'LePy U16' }])
    const list = parseFavorites(v1)
    const next = toggleFavorite(list, { kind: 'tournament', id: 'vk2627.27.303026', name: '19-vuotiaat pojat, SM-karsinnat' })
    assert.equal(next.length, 2)
    const saved = parseFavorites(JSON.stringify(next))
    assert.deepEqual(saved.map((f) => `${f.kind}:${f.id}`), ['tournament:vk2627.27.303026', 'team:5751397'])
    assert.equal(parseFavorites(JSON.stringify([{ kind: 'tournament', id: '5751397x', name: 'x' }])).length, 0)
    assert.equal(parseFavorites(JSON.stringify([{ kind: 'team', id: 'vk2627.27.303026', name: 'x' }])).length, 0)
  })

  it('fetchBasketTournament builds the view from getMatches + getGroup', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async (url) => {
      const u = String(url)
      const body = u.includes('getGroup?')
        ? { call: { status: 'ok' }, group: karsinta.group }
        : { call: { status: 'ok' }, matches: karsinta.matches }
      return new Response(JSON.stringify(body), { status: 200 })
    })
    try {
      const t = await fetchBasketTournament('vk2627.27.303026', AFTER)
      assert.equal(t.ref.kind, 'bracket')
      assert.equal(t.typeLabel, 'Tuplakarsinta')
      assert.equal(t.standings.length, 0)
      assert.deepEqual(t.teams.map((x) => x.name).sort(), ['HoNsU/JBA', 'Hyvinkään Ponteva', 'LePy', 'ToPo', 'TuNMKY'])
      assert.equal(t.view.placements[0].team.name, 'HoNsU/JBA')
      assert.equal(await fetchBasketTournament('not-a-key'), null)
    } finally {
      fetchMock.mock.restore()
    }
  })

  it('searchBasket returns tournament hits and a tournament failure never fails the search', async () => {
    const found = findTournaments(day.matches)
    const deps = {
      clubs: async () => [],
      club: async () => null,
      roster: async () => [],
      competitions: async () => [],
      categories: async () => [],
      match: async () => null,
      team: async () => null,
      player: async () => null,
      clubById: async () => null,
      tournaments: async () => found,
    }
    const res = await searchBasket({ kind: 'text', q: 'turnaus venom' }, deps)
    assert.equal(res.failed, false)
    assert.deepEqual(res.hits.map((h) => `${h.kind}:${h.id}`), ['tournament:etekp2627.35431.303194.10'])
    assert.equal(res.hint, undefined)
    const broken = await searchBasket({ kind: 'text', q: 'turnaus' }, { ...deps, tournaments: async () => { throw new Error('403') } })
    assert.equal(broken.failed, false)
    assert.deepEqual(broken.hits, [])
  })
})
