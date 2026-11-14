import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  parseCategoryName,
  seasonLabel,
  seriesLabel,
  isSeriesGroup,
  standingFor,
  knockoutPlacing,
  earlierGroups,
  scoreCandidates,
  pickGuess,
  confirmedPredecessor,
  clubSiblings,
  buildClubIndex,
  previousCompetitionId,
  nationalCompetitionId,
  createTtlCache,
  parsePredecessorChoices,
  formatStanding,
  formatUpdated,
  CONFIRMED_PREDECESSORS,
} from '../src/utils/teamHistory.ts'

const FX = JSON.parse(readFileSync(new URL('./fixtures/team-history.json', import.meta.url), 'utf8'))
const team = (id) => FX[`getTeam?team_id=${id}`].team
const group = (c, k, g) => FX[`getGroup?competition_id=${c}&category_id=${k}&group_id=${g}`].group

describe('category names (TASO category_name)', () => {
  it('parses age, gender and level', () => {
    const c = parseCategoryName('12-vuotiaat tytöt II divisioona Eteläinen alue')
    assert.equal(c.age, 12)
    assert.equal(c.gender, 'tytöt')
    assert.equal(c.level, 'II div')
    assert.equal(c.short, '12v tytöt II div')
    assert.equal(c.noResults, false)
  })
  it('mikro and supermikro years keep no results', () => {
    assert.equal(parseCategoryName('10-vuotiaat mikrotytöt II divisioona Eteläinen alue').noResults, true)
    assert.equal(parseCategoryName('9-vuotiaat mikrotytöt III divisioona Eteläinen alue').short, '9v mikrotytöt III div')
    const sm = parseCategoryName('Supermikrotytöt Eteläinen alue')
    assert.equal(sm.noResults, true)
    assert.equal(sm.short, 'supermikrotytöt')
  })
  it('orders national levels above regional ones', () => {
    const r = (n) => parseCategoryName(n).levelRank
    const order = [
      '16-vuotiaat tytöt, SM-sarja',
      '19-vuotiaat tytöt, SM-karsinnat',
      '16-vuotiaat tytöt, valtakunn. I divisioona',
      '15-vuotiaat tytöt, Robert Petersen Cup',
      '16-vuotiaat tytöt I divisioona Eteläinen alue',
      '16-vuotiaat tytöt II divisioona Eteläinen alue',
      '16-vuotiaat tytöt III divisioona Eteläinen alue',
    ].map(r)
    assert.deepEqual([...order].sort((a, b) => a - b), order)
    assert.equal(new Set(order).size, order.length)
  })
  it('season and series labels', () => {
    assert.equal(seasonLabel('2025-2026'), '25–26')
    assert.equal(seriesLabel('Syyskausi (päättyy jouluun)'), 'Syksy')
    assert.equal(seriesLabel('Kevät '), 'Kevät')
    assert.equal(seriesLabel('Aluefinaalit', 'knockout_bronze'), 'Aluefin.')
    assert.equal(seriesLabel('B-lohko'), 'B-lohko')
    assert.equal(previousCompetitionId('etekp2627'), 'etekp2526')
    assert.equal(previousCompetitionId('vk2627'), 'vk2526')
    assert.equal(nationalCompetitionId('etekp2627'), 'vk2627')
  })
})

describe('history rows from real TASO data', () => {
  it('skips harjoitusottelut and eSCO koulutus rows', () => {
    const groups = team('5000134').groups
    assert.ok(groups.some((g) => g.competition_id.startsWith('hark')))
    assert.ok(!earlierGroups(groups, '2026-2027').some((g) => !isSeriesGroup(g)))
    assert.equal(isSeriesGroup({ competition_id: 'escokoulutus', competition_season: '', group_type: 'group_stage', category_name: 'Koulutus' }), false)
  })
  it('LePy Oranssi 2025-26: autumn 2./10 8–2 515–287, spring 6./13 7–5 573–424', () => {
    const [aut, spr] = earlierGroups(team('5000134').groups, '2026-2027')
    assert.equal(aut.competition_season, '2025-2026')
    const a = standingFor(group(aut.competition_id, aut.category_id, aut.group_id).teams, '5000134')
    const s = standingFor(group(spr.competition_id, spr.category_id, spr.group_id).teams, '5000134')
    assert.equal(formatStanding(a), '2./10 · 8–2 · 515–287')
    assert.equal(formatStanding(s), '6./13 · 7–5 · 573–424')
  })
  it('ToPoLa U11 (5752640) autumn 1./10 9–1, spring 1./13 9–3 — "won both"', () => {
    const gs = earlierGroups(team('5752640').groups, '2026-2027').filter((g) => g.competition_season === '2025-2026')
    assert.deepEqual(gs.map((g) => seriesLabel(g.group_name, g.group_type)), ['Syksy', 'Kevät', 'Aluefin.'])
    const a = standingFor(group(gs[0].competition_id, gs[0].category_id, gs[0].group_id).teams, '5752640')
    const s = standingFor(group(gs[1].competition_id, gs[1].category_id, gs[1].group_id).teams, '5752640')
    assert.equal(a.position, 1)
    assert.equal(`${a.won}–${a.lost}`, '9–1')
    assert.equal(s.position, 1)
    assert.equal(`${s.won}–${s.lost}`, '9–3')
  })
  it('aluefinaalit placing is derived from the games: ToPoLa 4.', () => {
    const ms = FX['getMatches?competition_id=etekp2526&category_id=38753&group_id=302915'].matches
    assert.equal(knockoutPlacing(ms, '5752640'), '4.')
    assert.equal(knockoutPlacing(ms, '5752665'), '1.') // Beat Basket won both
    assert.equal(knockoutPlacing(ms, '5752923'), '2.')
    assert.equal(knockoutPlacing(ms, '5752682'), '3.')
    assert.equal(knockoutPlacing([{ ...ms[0], status: 'Fixture' }], '5752640'), 'kesken')
  })
})

describe('linking Lilli\'s new team to last season', () => {
  it('family-confirmed: TOPOLA 5756346 → ToPoLa U11 II div 5752640', () => {
    assert.deepEqual(CONFIRMED_PREDECESSORS['5756346'], ['5752640'])
    assert.deepEqual(confirmedPredecessor('5756346', {}), { source: 'confirmed-family', teamIds: ['5752640'] })
    // a choice saved on the phone wins over the built-in one
    assert.deepEqual(confirmedPredecessor('5756346', { 5756346: ['5754109'] }), { source: 'confirmed-user', teamIds: ['5754109'] })
    assert.equal(confirmedPredecessor('5000134', {}), null)
  })
  it('the guess is honest: three ToPoLa candidates, no clear winner → no guess', () => {
    const t = team('5756346')
    const cands = ['5752640', '5754109', '5754108'].map((id) => {
      const c = team(id)
      return { teamId: id, teamName: c.team_name, categoryName: c.groups.find((g) => g.competition_id === 'etekp2526').category_name, officials: c.officials }
    })
    const scored = scoreCandidates({ teamId: t.team_id, teamName: t.team_name, categoryName: t.groups[0].category_name, officials: t.officials }, cands)
    assert.equal(scored.length, 3)
    const byId = Object.fromEntries(scored.map((s) => [s.teamId, s]))
    assert.ok(byId['5752640'].sharedCoaches.includes('Tero Niskanen'))
    assert.ok(byId['5754109'].sharedCoaches.length >= 3)
    assert.equal(pickGuess(scored), null)
  })
  it('a clear winner (≥2 ahead) is picked as an arvio', () => {
    const s = [
      { teamId: 'a', score: 5 },
      { teamId: 'b', score: 2 },
    ]
    assert.equal(pickGuess(s).teamId, 'a')
    assert.equal(pickGuess([{ teamId: 'a', score: 0 }]), null)
  })
  it('phone-saved choices are validated', () => {
    assert.deepEqual(parsePredecessorChoices('{"5756346":["5752640"],"x":["1"],"12":["12","abc"]}'), { 5756346: ['5752640'] })
    assert.deepEqual(parsePredecessorChoices('not json'), {})
  })
})

describe('club siblings', () => {
  const idx = buildClubIndex(FX['getTeams?competition_id=etekp2627'].teams, 'etekp2627')
  it('LePy 12v girls: Valkoinen I div above, Sininen III div below; 13v/14v not mixed in', () => {
    const sib = clubSiblings(idx['1447'], '12-vuotiaat tytöt II divisioona Eteläinen alue', ['5000134'])
    assert.deepEqual(sib.sameAge.map((s) => `${s.team_name}|${s.relation}`), ['LePy Valkoinen|ylempi taso', 'LePy Sininen|alempi taso'])
    assert.ok(sib.olderAge.every((s) => s.category.age === 13))
  })
  it('ToPoLa 12v girls: no other same-age team; 13v I and II div one age up', () => {
    const sib = clubSiblings(idx['1521'], '12-vuotiaat tytöt II divisioona Eteläinen alue', ['5756346'])
    assert.equal(sib.sameAge.length, 0)
    assert.deepEqual(sib.olderAge.map((s) => s.category.level), ['I div', 'II div'])
  })
})

describe('phone cache', () => {
  function mem() {
    const d = {}
    return { d, getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => (d[k] = String(v)) }
  }
  it('fresh within TTL, refetched after, stale copy on failure, forever for finished seasons', async () => {
    let now = 1000
    const st = mem()
    const c = createTtlCache(st)
    let calls = 0
    const f = async () => ++calls
    assert.equal((await c.get('x', 100, f, { now: () => now })).data, 1)
    assert.equal((await c.get('x', 100, f, { now: () => now + 50 })).data, 1)
    now += 200
    assert.equal((await c.get('x', 100, f, { now: () => now })).data, 2)
    now += 200
    const failed = await createTtlCache(st).get('x', 100, async () => { throw new Error('403') }, { now: () => now })
    assert.equal(failed.data, 2)
    assert.equal(failed.stale, true)
    await c.get('g', Infinity, f, { now: () => 0 })
    assert.equal(JSON.parse(st.d['bb:g']).ttl, null)
    assert.equal((await createTtlCache(st).get('g', Infinity, f, { now: () => 1e12 })).stale, false)
    await assert.rejects(c.get('none', 100, async () => { throw new Error('403') }))
  })
  it('notBefore forces a refetch after a played game', async () => {
    const c = createTtlCache(null)
    let n = 0
    await c.get('s', 1e9, async () => ++n, { now: () => 10 })
    assert.equal((await c.get('s', 1e9, async () => ++n, { now: () => 20, notBefore: 15 })).data, 2)
  })
  it('updated time in Helsinki', () => {
    assert.equal(formatUpdated(Date.parse('2026-11-14T14:50:00Z')), 'päivitetty 14.11. klo 16.50')
  })
})

describe('loadTeamBackground over signed TASO calls (fixture fetch)', () => {
  let realFetch
  beforeEach(() => {
    realFetch = globalThis.fetch
    globalThis.fetch = async (url) => {
      const u = String(url).replace('https://koripallo-api.torneopal.net/taso/rest/', '').replace(/[?&]hash=[0-9a-f]+$/, '')
      const body = FX[u]
      if (!body) return new Response('{"call":{"status":"error","error_message":"no fixture ' + u + '"}}', { status: 200 })
      return new Response(JSON.stringify(body), { status: 200 })
    }
  })
  afterEach(() => {
    globalThis.fetch = realFetch
  })
  const ctx = { competitionId: 'etekp2627', categoryId: '35425', groupId: '303086' }

  it('TOPOLA: confirmed predecessor history, current standing, 13v siblings', async () => {
    const { loadTeamBackground } = await import('../src/services/teamHistoryApi.ts')
    const bg = await loadTeamBackground('5756346', ctx)
    assert.equal(bg.link.source, 'confirmed-family')
    assert.deepEqual(bg.link.teamIds, ['5752640'])
    assert.ok(bg.current?.standing)
    assert.equal(bg.current.short, '12v tytöt II div')
    const s25 = bg.seasons[0]
    assert.equal(s25.label, '25–26')
    assert.equal(s25.category, '11v tytöt II div')
    assert.deepEqual(s25.rows.map((r) => r.series), ['Syksy', 'Kevät', 'Aluefin.'])
    assert.equal(s25.rows[0].result.standing.position, 1)
    assert.equal(s25.rows[2].result.placing, '4.')
    assert.equal(bg.seasons[1].noResults, true) // 24-25 mikro
    assert.equal(bg.siblings.sameAge.length, 0)
    assert.equal(bg.siblings.olderAge.length, 2)
    assert.ok(bg.siblings.olderAge.every((s) => s.standing && s.standing.position != null))
  })

  it('LePy Oranssi: exact history, siblings with standings', async () => {
    const { loadTeamBackground } = await import('../src/services/teamHistoryApi.ts')
    const bg = await loadTeamBackground('5000134', ctx)
    assert.equal(bg.link.source, 'exact')
    assert.equal(formatStanding(bg.seasons[0].rows[0].result.standing), '2./10 · 8–2 · 515–287')
    assert.ok(bg.seasons.slice(1).every((b) => b.noResults))
    assert.deepEqual(bg.siblings.sameAge.map((s) => s.team_id), ['5000133', '5752656'])
    assert.ok(bg.siblings.sameAge.every((s) => s.standing?.position != null))
  })

  it('picker candidates for TOPOLA come from last season\'s ToPoLa girls teams', async () => {
    const { loadCandidates } = await import('../src/services/teamHistoryApi.ts')
    const list = await loadCandidates('5756346', ctx)
    assert.deepEqual(list.map((c) => c.teamId).sort(), ['5752640', '5754108', '5754109'])
  })
})
