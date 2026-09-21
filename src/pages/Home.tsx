import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Calendar, Heart, Search, Shield, User } from 'lucide-react'
import { useFavorites } from '../hooks/useFavorites'
import { parseFederationTeamId, readLastTeamId, writeLastTeamId } from '../utils/teamSelection'

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
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <span>🏀</span>
          Baskettilastot
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#5BC0BE]/20 text-[#5BC0BE] border border-[#5BC0BE]/30 uppercase">
            Basket.fi Live
          </span>
        </h1>
        <p className="text-sm text-slate-400">
          Hae joukkue, seura, sarja tai pelaaja. Ei kovakoodattua ottelua.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          goSearch(q)
        }}
        className="flex items-center bg-[#1C2541] border border-slate-800 rounded-2xl overflow-hidden focus-within:border-[#5BC0BE]"
      >
        <div className="pl-4 text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Hae Westend, U14, pelaaja tai liitä basket.fi-linkki"
          className="grow bg-transparent border-none text-white text-sm px-3.5 py-3.5 focus:outline-none placeholder:text-slate-500"
        />
        <button type="submit" className="px-4 py-2.5 mr-1.5 rounded-xl bg-[#3A506B] text-[#6FFFE9] text-xs font-bold">
          Hae
        </button>
      </form>

      <section className="space-y-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
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
                className="px-3 py-1.5 rounded-full border border-rose-400/30 bg-[#1C2541] text-[11px] font-semibold text-rose-200 hover:border-rose-300"
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
          <button
            key={chip}
            type="button"
            onClick={() => goSearch(chip)}
            className="px-3 py-1.5 rounded-full border border-slate-800 bg-[#1C2541] text-[11px] font-semibold text-slate-300 hover:border-[#5BC0BE]/50"
          >
            {chip}
          </button>
        ))}
        <button
          type="button"
          onClick={() => navigate('/browse')}
          className="px-3 py-1.5 rounded-full border border-[#5BC0BE]/30 text-[11px] font-semibold text-[#6FFFE9]"
        >
          Selaa sarjoja →
        </button>
      </div>

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-[#1C2541]/40 p-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Avaa tunnuksella
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              goTeam(teamId)
            }}
            className="space-y-1"
          >
            <label className="text-[11px] text-slate-400 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              Joukkue-ID
            </label>
            <div className="flex gap-1">
              <input
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder="esim. 20053"
                className="w-full bg-[#0B132B] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#5BC0BE]"
              />
              <button type="submit" className="px-2.5 rounded-lg bg-[#3A506B] text-[#6FFFE9] text-[11px] font-bold">
                Avaa
              </button>
            </div>
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              goMatch(matchId)
            }}
            className="space-y-1"
          >
            <label className="text-[11px] text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Ottelu-ID
            </label>
            <div className="flex gap-1">
              <input
                value={matchId}
                onChange={(e) => setMatchId(e.target.value)}
                placeholder="esim. 567890"
                className="w-full bg-[#0B132B] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#5BC0BE]"
              />
              <button type="submit" className="px-2.5 rounded-lg bg-[#3A506B] text-[#6FFFE9] text-[11px] font-bold">
                Avaa
              </button>
            </div>
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              goPlayer(playerId)
            }}
            className="space-y-1"
          >
            <label className="text-[11px] text-slate-400 flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              Pelaaja-ID
            </label>
            <div className="flex gap-1">
              <input
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                placeholder="esim. 12345"
                className="w-full bg-[#0B132B] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#5BC0BE]"
              />
              <button type="submit" className="px-2.5 rounded-lg bg-[#3A506B] text-[#6FFFE9] text-[11px] font-bold">
                Avaa
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-[#5BC0BE]" />
          Pikavalinnat (haku, ei kovakoodattu ottelu)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {POPULAR.map((t) => (
            <button
              key={`${t.kind}-${t.id}`}
              type="button"
              onClick={() => (t.kind === 'team' ? goTeam(t.id) : goSearch(t.id))}
              className="text-left bg-[#1C2541]/70 border border-slate-800 hover:border-[#5BC0BE]/50 rounded-xl p-3 min-h-[64px]"
            >
              <div className="font-bold text-xs text-slate-200 truncate">{t.name}</div>
              <div className="text-[10px] text-slate-400 truncate mt-1">{t.hint}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
