import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Calendar, Heart, Search, Shield, User } from 'lucide-react'
import { useFavorites } from '../hooks/useFavorites'
import { parseFederationTeamId, readLastTeamId, writeLastTeamId } from '../utils/teamSelection'
import { CourtMark } from '../components/CourtMark'

const QUICK = ['Honka', 'ETEK', 'HNMKY', 'U14', 'U16', 'Helsinki']

const POPULAR: Array<{ kind: 'team' | 'search'; id: string; name: string; hint: string }> = [
  { kind: 'team', id: '20053', name: 'Tapiolan Honka', hint: 'U14 · team 20053' },
  { kind: 'search', id: 'HNMKY', name: 'HNMKY', hint: 'Hae seuroista' },
  { kind: 'search', id: 'ETEK', name: 'ETEK', hint: 'Hae seuroista' },
  { kind: 'search', id: 'ToPo', name: 'ToPo Juniorit', hint: 'Hae seuroista' },
]

export function Home() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { favorites } = useFavorites()
  const [q, setQ] = useState('')
  const [matchId, setMatchId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [playerId, setPlayerId] = useState('')

  const favoriteTeams = useMemo(
    () =>
      favorites
        .filter((f) => f.kind === 'team')
        .flatMap((f) => {
          const parsed = parseFederationTeamId(f.id)
          return parsed ? [{ ...f, teamId: parsed }] : []
        }),
    [favorites],
  )

  useEffect(() => {
    const queryTeamId = parseFederationTeamId(searchParams.get('team'))
    if (queryTeamId) {
      writeLastTeamId(queryTeamId)
      navigate(`/team/${queryTeamId}`, { replace: true })
      return
    }

    const last = readLastTeamId()
    if (last) setTeamId(last)
  }, [navigate, searchParams])

  function goSearch(value: string) {
    const v = value.trim()
    if (!v) {
      navigate('/search')
      return
    }
    navigate(`/search?q=${encodeURIComponent(v)}`)
  }

  function goTeam(value: string) {
    const parsed = parseFederationTeamId(value)
    if (!parsed) return
    writeLastTeamId(parsed)
    navigate(`/team/${parsed}`)
  }

  function goMatch(value: string) {
    const v = value.trim()
    if (!v) return
    navigate(`/match/${encodeURIComponent(v)}`)
  }

  function goPlayer(value: string) {
    const v = value.trim()
    if (!v) return
    navigate(`/player/${encodeURIComponent(v)}`)
  }

  return (
    <div className="page-shell">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
          <CourtMark className="w-6 h-6 text-ice" />
          Baskettilastot
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 uppercase tracking-wider">
            Basket.fi
          </span>
        </h1>
        <p className="text-sm text-slate-400">Hae joukkue, seura, sarja tai pelaaja. Ei kovakoodattua ottelua.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          goSearch(q)
        }}
        className="flex items-center bg-court border border-hairline rounded-2xl overflow-hidden focus-within:border-accent"
      >
        <div className="pl-4 text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Hae Westend, U14, pelaaja tai liitä basket.fi-linkki"
          className="grow bg-transparent border-none text-white text-sm px-3.5 py-3.5 min-h-12 focus:outline-none placeholder:text-slate-500"
        />
        <button type="submit" className="btn-ice mr-1.5 my-1.5">
          Hae
        </button>
      </form>

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-rose-400" />
          Suosikkijoukkueet
        </h2>
        {favoriteTeams.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {favoriteTeams.map((team) => (
              <button
                key={`${team.kind}-${team.teamId}`}
                type="button"
                onClick={() => goTeam(team.teamId)}
                className="chip border-rose-400/30 text-rose-200 hover:border-rose-300"
              >
                {team.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Ei suosikkijoukkueita vielä. Lisää joukkue suosikiksi joukkuesivulta.</p>
        )}
      </section>

      <div className="flex flex-wrap gap-1.5">
        {QUICK.map((chip) => (
          <button key={chip} type="button" onClick={() => goSearch(chip)} className="chip">
            {chip}
          </button>
        ))}
        <button type="button" onClick={() => navigate('/browse')} className="chip border-accent/30 text-ice">
          Selaa sarjoja
        </button>
      </div>

      <section className="space-y-3 surface-card">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Avaa tunnuksella</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <IdForm
            label="Joukkue-ID"
            icon={<Shield className="w-3.5 h-3.5" />}
            value={teamId}
            onChange={setTeamId}
            placeholder="esim. 20053"
            onSubmit={goTeam}
          />
          <IdForm
            label="Ottelu-ID"
            icon={<Calendar className="w-3.5 h-3.5" />}
            value={matchId}
            onChange={setMatchId}
            placeholder="esim. 567890"
            onSubmit={goMatch}
          />
          <IdForm
            label="Pelaaja-ID"
            icon={<User className="w-3.5 h-3.5" />}
            value={playerId}
            onChange={setPlayerId}
            placeholder="esim. 12345"
            onSubmit={goPlayer}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-accent" />
          Pikavalinnat
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {POPULAR.map((t) => (
            <button
              key={`${t.kind}-${t.id}`}
              type="button"
              onClick={() => (t.kind === 'team' ? goTeam(t.id) : goSearch(t.id))}
              className="text-left bg-court border border-hairline hover:border-accent/50 rounded-xl p-3 min-h-16 transition-colors"
            >
              <div className="font-semibold text-xs text-slate-200 truncate">{t.name}</div>
              <div className="text-[10px] text-slate-400 truncate mt-1">{t.hint}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function IdForm({
  label,
  icon,
  value,
  onChange,
  placeholder,
  onSubmit,
}: {
  label: string
  icon: ReactNode
  value: string
  onChange: (v: string) => void
  placeholder: string
  onSubmit: (v: string) => void
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(value)
      }}
      className="space-y-1.5"
    >
      <label className="text-[11px] text-slate-400 flex items-center gap-1">
        {icon}
        {label}
      </label>
      <div className="flex gap-1.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="field"
        />
        <button type="submit" className="btn-ice px-3 shrink-0">
          Avaa
        </button>
      </div>
    </form>
  )
}
