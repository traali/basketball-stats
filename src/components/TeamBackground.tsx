import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Loader2, ShieldCheck, AlertTriangle, History } from 'lucide-react'
import clsx from 'clsx'
import {
  loadCandidates,
  loadTeamBackground,
  savePredecessorChoice,
  type GameContext,
  type ScoredCandidate,
  type SiblingRow,
  type TeamBackground as Bg,
} from '../services/teamHistoryApi'
import { formatStanding, formatUpdated, type HistoryRow, type SeasonBlock } from '../utils/teamHistory'
import { useFavorites } from '../hooks/useFavorites'

interface Side {
  teamId: string
  teamName: string
}

type Load = { state: 'idle' } | { state: 'loading' } | { state: 'ok'; data: Bg } | { state: 'error'; message: string }

function rowResult(r: HistoryRow): string {
  switch (r.result.kind) {
    case 'standing':
      return r.result.withdrew ? 'luopui' : formatStanding(r.result.standing)
    case 'knockout':
      return r.result.placing || 'pelasi'
    case 'noResults':
      return 'ei tuloksia'
    default:
      return '–'
  }
}

function SeasonView({ block, onGroup }: { block: SeasonBlock; onGroup: (r: HistoryRow) => void }) {
  if (block.noResults) {
    const names = [...new Set(block.rows.map((r) => r.category.short))].join(', ')
    return (
      <li className="text-[12px] text-slate-400" data-testid="bb-season">
        <span className="font-semibold text-slate-300">{block.label}</span> pelasi {names} <span className="text-slate-500">(ei tuloksia)</span>
      </li>
    )
  }
  return (
    <li data-testid="bb-season">
      <p className="text-[12px] font-semibold text-slate-300">
        {block.label} {block.category}
      </p>
      <ul className="mt-0.5 space-y-0.5">
        {block.rows.map((r) => (
          <li key={`${r.competitionId}:${r.groupId}`}>
            <button
              type="button"
              onClick={() => onGroup(r)}
              className="w-full grid grid-cols-[5.5rem_1fr] gap-2 text-left text-[12px] min-h-8 items-center rounded-lg px-1 hover:bg-slate-800/60"
            >
              <span className="text-slate-400 truncate">
                {r.series}
                {block.category ? '' : <span className="block text-[10px] text-slate-500">{r.category.short}</span>}
              </span>
              <span className={clsx('font-mono tabular-nums', r.result.kind === 'noResults' ? 'text-slate-500' : 'text-slate-100')}>
                {rowResult(r)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </li>
  )
}

function SiblingLine({ s, onOpen }: { s: SiblingRow; onOpen: (s: SiblingRow) => void }) {
  const arrow = s.relation === 'ylempi taso' ? '↑' : s.relation === 'alempi taso' ? '↓' : '='
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(s)}
        className="w-full flex items-baseline gap-1.5 text-left text-[12px] min-h-8 rounded-lg px-1 hover:bg-slate-800/60"
        title={s.relation}
      >
        <span aria-label={s.relation} className="text-accent w-3 shrink-0">
          {arrow}
        </span>
        <span className="text-slate-200 truncate">
          {s.team_name} <span className="text-slate-400">{s.category.level}</span>
        </span>
        <span className="ml-auto font-mono tabular-nums text-slate-300 shrink-0">
          {s.standing && s.standing.position != null
            ? `${s.standing.position}./${s.standing.teams} · ${s.standing.won}–${s.standing.lost}`
            : s.category.noResults
              ? 'ei tuloksia'
              : '–'}
        </span>
      </button>
    </li>
  )
}

function Picker({ teamId, ctx, onPicked, onClose }: { teamId: string; ctx: GameContext; onPicked: () => void; onClose: () => void }) {
  const [list, setList] = useState<ScoredCandidate[] | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let alive = true
    loadCandidates(teamId, ctx)
      .then((l) => alive && setList(l))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [teamId, ctx])
  return (
    <div className="mt-2 rounded-xl border border-hairline bg-canvas/60 p-2 space-y-1" data-testid="bb-picker">
      <p className="text-[12px] font-semibold text-slate-200">Mikä oli tämän joukkueen viime kauden joukkue?</p>
      {error ? <p className="text-[12px] text-rose-300">Ehdokkaita ei nyt saatu ladattua.</p> : null}
      {!list && !error ? <Loader2 className="w-4 h-4 animate-spin text-accent" /> : null}
      {list && !list.length ? <p className="text-[12px] text-slate-400">Seuralla ei ollut viime kaudella sopivaa joukkuetta.</p> : null}
      {list?.map((c) => (
        <button
          key={c.teamId}
          type="button"
          onClick={() => {
            savePredecessorChoice(teamId, c.teamId)
            onPicked()
          }}
          className="w-full text-left rounded-lg border border-hairline bg-court px-2 py-1.5 min-h-11 hover:border-accent"
        >
          <span className="block text-[12px] text-slate-100">
            {c.teamName} · {c.category.short}
          </span>
          <span className="block text-[11px] text-slate-400">
            {c.sharedCoaches.length ? `Samat valmentajat: ${c.sharedCoaches.join(', ')}` : 'Ei yhteisiä valmentajia'}
          </span>
        </button>
      ))}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            savePredecessorChoice(teamId, null)
            onPicked()
          }}
          className="text-[11px] text-slate-400 underline min-h-8"
        >
          Poista oma valinta
        </button>
        <button type="button" onClick={onClose} className="text-[11px] text-slate-400 underline min-h-8">
          Sulje
        </button>
      </div>
    </div>
  )
}

function TeamColumn({ side, load, ctx, own, onReload }: { side: Side; load: Load; ctx: GameContext; own: boolean; onReload: () => void }) {
  const navigate = useNavigate()
  const [allSeasons, setAllSeasons] = useState(false)
  const [older, setOlder] = useState(false)
  const [picking, setPicking] = useState(false)
  const openGroup = (c: string, k: string, g: string) => navigate(`/group/${c}/${k}/${g}`)

  if (load.state === 'loading' || load.state === 'idle') {
    return (
      <section className="rounded-xl border border-hairline bg-court/60 p-3 text-[12px] text-slate-400 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-accent" /> {side.teamName}: ladataan…
      </section>
    )
  }
  if (load.state === 'error') {
    return (
      <section className="rounded-xl border border-rose-800/60 bg-rose-950/20 p-3 text-[12px] text-rose-200 space-y-1">
        <p className="font-semibold">{side.teamName}</p>
        <p>Taustatiedot eivät nyt latautuneet.</p>
        <button type="button" onClick={onReload} className="underline min-h-8">
          Yritä uudelleen
        </button>
      </section>
    )
  }
  const d = load.data
  const age = /^(\d+)v/.exec(d.current?.short || '')?.[1]
  const genderWord = /tytöt/.test(d.current?.short || '') ? 'tyttö' : /pojat/.test(d.current?.short || '') ? 'poika' : ''
  const seasons = allSeasons ? d.seasons : d.seasons.slice(0, 2)
  const link = d.link
  const canPick = link.source !== 'exact'
  return (
    <section className="rounded-xl border border-hairline bg-court/60 p-3 space-y-2" data-testid={`bb-team-${d.teamId}`}>
      <header>
        <p className="text-sm font-bold text-slate-100">
          {d.teamName}
          {own ? <span className="ml-1 text-[11px] font-semibold text-accent">(oma)</span> : null}
        </p>
        {d.current ? (
          <button
            type="button"
            onClick={() => openGroup(d.current!.competitionId, d.current!.categoryId, d.current!.groupId)}
            className="text-left text-[12px] text-slate-400 min-h-8"
          >
            Nyt: {d.current.short}, {d.current.series.toLowerCase()}
            <span className="block font-mono tabular-nums text-slate-100" data-testid="bb-current">
              {d.current.standing ? formatStanding(d.current.standing) : 'ei sarjataulukkoa'}
            </span>
            {d.current.springPending ? (
              <span className="block text-[11px] text-slate-500">Kevään lohkot julkaistaan joulun jälkeen.</span>
            ) : null}
          </button>
        ) : (
          <p className="text-[12px] text-slate-400">Ei tämän kauden sarjaa.</p>
        )}
      </header>

      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">Aiemmat sarjat</p>
        {link.source === 'confirmed-family' || link.source === 'confirmed-user' ? (
          <p className="mt-1 flex items-start gap-1 text-[12px] text-emerald-300" data-testid="bb-link">
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              vahvistettu: {link.teamNames.join(', ') || `joukkue #${link.teamIds.join(', ')}`}
              {link.source === 'confirmed-user' ? ' (valittu tällä laitteella)' : ' (perhe vahvisti)'}
            </span>
          </p>
        ) : null}
        {link.source === 'guess' ? (
          <p className="mt-1 flex items-start gap-1 text-[12px] text-amber-300" data-testid="bb-link">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              arvio: todennäköisesti {link.teamNames.join(', ')}
              {link.reasons.length ? ` (${link.reasons.join(', ')})` : ''}
            </span>
          </p>
        ) : null}
        {link.source === 'none' ? (
          <p className="mt-1 text-[12px] text-slate-400" data-testid="bb-link">
            Edellistä kautta ei voitu yhdistää varmasti.
          </p>
        ) : null}
        {canPick && !picking ? (
          <button type="button" onClick={() => setPicking(true)} className="text-[12px] font-semibold text-ice min-h-8" data-testid="bb-pick">
            {link.source === 'none' || link.source === 'guess' ? 'Valitse oikea joukkue' : 'Vaihda'}
          </button>
        ) : null}
        {picking ? (
          <Picker
            teamId={d.teamId}
            ctx={ctx}
            onClose={() => setPicking(false)}
            onPicked={() => {
              setPicking(false)
              onReload()
            }}
          />
        ) : null}
        {d.seasons.length ? (
          <ul className="mt-1 space-y-1.5">
            {seasons.map((b) => (
              <SeasonView key={b.season} block={b} onGroup={(r) => openGroup(r.competitionId, r.categoryId, r.groupId)} />
            ))}
          </ul>
        ) : link.source !== 'none' ? (
          <p className="text-[12px] text-slate-400">Ei aiempia sarjoja.</p>
        ) : null}
        {d.seasons.length > 2 ? (
          <button type="button" onClick={() => setAllSeasons((v) => !v)} className="text-[11px] text-slate-400 underline min-h-8">
            {allSeasons ? 'Näytä vain kaksi kautta' : `Näytä kaikki kaudet (${d.seasons.length})`}
          </button>
        ) : null}
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          Seuran muut {age ? `${age}v ` : ''}
          {genderWord}joukkueet
        </p>
        {d.siblings.sameAge.length ? (
          <ul className="mt-0.5" data-testid="bb-siblings">
            {d.siblings.sameAge.map((s) => (
              <SiblingLine key={`${s.team_id}:${s.category_id}`} s={s} onOpen={(x) => (x.groupRef ? openGroup(x.groupRef.competitionId, x.groupRef.categoryId, x.groupRef.groupId) : navigate(`/team/${x.team_id}`))} />
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-slate-400">– ei muita</p>
        )}
        {d.siblings.olderAge.length ? (
          <div>
            <button
              type="button"
              onClick={() => setOlder((v) => !v)}
              className="flex items-center gap-1 text-[11px] text-slate-400 min-h-8"
              data-testid="bb-older-toggle"
            >
              {older ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Ikäluokkaa vanhemmat ({age ? `${Number(age) + 1}v, ` : ''}
              {d.siblings.olderAge.length})
            </button>
            {older ? (
              <ul data-testid="bb-older">
                {d.siblings.olderAge.map((s) => (
                  <SiblingLine key={`${s.team_id}:${s.category_id}`} s={s} onOpen={(x) => (x.groupRef ? openGroup(x.groupRef.competitionId, x.groupRef.categoryId, x.groupRef.groupId) : navigate(`/team/${x.team_id}`))} />
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
      {d.stale ? <p className="text-[11px] text-amber-300">Taustatiedot eivät nyt latautuneet – näytetään tallennettu tieto.</p> : null}
    </section>
  )
}

export function TeamBackground({ home, away, ctx }: { home: Side; away: Side; ctx: GameContext }) {
  const [open, setOpen] = useState(false)
  const [loads, setLoads] = useState<Record<string, Load>>({})
  const { isFavorite } = useFavorites()

  const loadOne = useCallback(
    (teamId: string) => {
      setLoads((l) => ({ ...l, [teamId]: { state: 'loading' } }))
      loadTeamBackground(teamId, ctx)
        .then((data) => setLoads((l) => ({ ...l, [teamId]: { state: 'ok', data } })))
        .catch((err) => setLoads((l) => ({ ...l, [teamId]: { state: 'error', message: err instanceof Error ? err.message : String(err) } })))
    },
    [ctx],
  )

  useEffect(() => {
    if (!open) return
    for (const s of [home, away]) if (s.teamId && !loads[s.teamId]) loadOne(s.teamId)
  }, [open, home, away, loads, loadOne])

  const sides = [home, away].filter((s) => s.teamId)
  if (!sides.length) return null
  // Own (favourite) team first
  sides.sort((a, b) => Number(isFavorite('team', b.teamId)) - Number(isFavorite('team', a.teamId)))
  const done = sides.map((s) => loads[s.teamId]).filter((l): l is { state: 'ok'; data: Bg } => l?.state === 'ok')
  const updated = done.length ? Math.min(...done.map((l) => l.data.updatedAt)) : 0

  return (
    <div className="rounded-2xl border border-hairline bg-court/40" data-testid="bb-background">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 min-h-12 text-sm font-semibold text-slate-100"
      >
        {open ? <ChevronDown className="w-4 h-4 text-accent" /> : <ChevronRight className="w-4 h-4 text-accent" />}
        <History className="w-4 h-4 text-accent" />
        Joukkueiden tausta
        <span className="ml-auto text-[11px] font-normal text-slate-400">{open ? 'sulje' : 'avaa'}</span>
      </button>
      {open ? (
        <div className="px-3 pb-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {sides.map((s) => (
              <TeamColumn
                key={s.teamId}
                side={s}
                ctx={ctx}
                own={isFavorite('team', s.teamId)}
                load={loads[s.teamId] || { state: 'idle' }}
                onReload={() => loadOne(s.teamId)}
              />
            ))}
          </div>
          <p className="text-[11px] text-slate-500" data-testid="bb-source">
            Lähde: tulospalvelu.basket.fi{updated ? ` · ${formatUpdated(updated)}` : ''}
          </p>
        </div>
      ) : null}
    </div>
  )
}
