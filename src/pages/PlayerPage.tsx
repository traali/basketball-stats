import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Heart } from 'lucide-react'
import clsx from 'clsx'
import { fetchBasketPlayer, fetchBasketTeamFixtures, determineSeasonHalf, getSeasonYear } from '../services/basketApi'
import type { BasketPlayerProfile, BasketTeamFixture } from '../types/basketball'
import { useFavorites } from '../hooks/useFavorites'

type Scope = 'syksy' | 'kevat' | 'all'

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-[#0B132B] border border-slate-800 p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-xl font-black text-[#6FFFE9] tabular-nums">{value}</div>
    </div>
  )
}

export function PlayerPage() {
  const { playerId = '' } = useParams()
  const navigate = useNavigate()
  const { isFavorite, toggle } = useFavorites()
  const [player, setPlayer] = useState<BasketPlayerProfile | null>(null)
  const [fixtures, setFixtures] = useState<BasketTeamFixture[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().slice(0, 10)
  const defaultHalf: Scope = today.slice(5, 7) >= '08' ? 'syksy' : 'kevat'
  const [half, setHalf] = useState<Scope>(defaultHalf)
  const year = today.slice(0, 4)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const p = await fetchBasketPlayer(playerId)
      if (cancelled) return
      setPlayer(p)
      const teamIds = [...new Set((p?.teams || []).map((t) => t.teamId).filter(Boolean))]
      if (teamIds.length) {
        const lists = await Promise.all(teamIds.map((id) => fetchBasketTeamFixtures(id)))
        if (!cancelled) setFixtures(lists.flat())
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [playerId])

  const inScope = (date: string, category?: string) => {
    if (half === 'all') return date.startsWith(year) || getSeasonYear(date) === year
    return getSeasonYear(date) === year && determineSeasonHalf(date, category) === half
  }

  const scopedMatches = useMemo(
    () => player?.matches.filter((m) => inScope(m.date, m.categoryName)).sort((a, b) => b.date.localeCompare(a.date)) || [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [player, half, year],
  )

  const rows = useMemo(() => {
    if (!player) return []
    const playedIds = new Set(player.matches.map((m) => m.matchId))
    return [...fixtures]
      .filter((f) => inScope(f.date, f.categoryName))
      .map((f) => {
        const pm = player.matches.find((m) => m.matchId === f.matchId)
        return {
          matchId: f.matchId,
          date: f.date,
          homeTeam: f.homeTeam,
          awayTeam: f.awayTeam,
          score: f.score,
          points: pm?.points ?? 0,
          assists: pm?.assists ?? 0,
          threePointers: pm?.threePointers ?? 0,
          fouls: pm?.fouls ?? 0,
          dnp: Boolean(f.score) && !playedIds.has(f.matchId),
          upcoming: !f.score,
        }
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 40)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixtures, player, half, year])

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-slate-400 text-sm">Ladataan pelaajaa…</div>
  if (!player) return <div className="max-w-4xl mx-auto px-4 py-16 text-rose-400 text-sm">Pelaajaa ei löytynyt.</div>

  const fav = isFavorite('player', player.playerId)
  const gp = scopedMatches.length
  const pts = scopedMatches.reduce((s, m) => s + m.points, 0)
  const ast = scopedMatches.reduce((s, m) => s + m.assists, 0)
  const threes = scopedMatches.reduce((s, m) => s + m.threePointers, 0)
  const pf = scopedMatches.reduce((s, m) => s + m.fouls, 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button type="button" onClick={() => navigate(-1)} className="text-xs text-slate-400 flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Takaisin
          </button>
          <h1 className="text-2xl font-black">{player.fullName}</h1>
          <p className="text-xs text-slate-400">
            {player.clubName || player.teams[0]?.clubName || 'Pelaaja'}
            {player.birthYear ? ` · s. ${player.birthYear}` : ''}
            {player.teams[0]?.shirtNumber ? ` · #${player.teams[0].shirtNumber}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            toggle({
              kind: 'player',
              id: player.playerId,
              name: player.fullName,
              subtitle: player.teams[0]?.teamName,
            })
          }
          className={`p-2 rounded-full border ${fav ? 'border-rose-400 text-rose-400' : 'border-slate-700 text-slate-400'}`}
        >
          <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
        </button>
      </div>

      {player.teams.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {player.teams.map((t) => (
            <button
              key={t.teamId}
              type="button"
              onClick={() => navigate(`/team/${t.teamId}`)}
              className="px-3 py-1.5 rounded-full border border-slate-800 bg-[#1C2541] text-[11px] font-semibold text-[#6FFFE9]"
            >
              {t.teamName}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {(['syksy', 'kevat', 'all'] as Scope[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setHalf(s)}
            className={clsx(
              'text-xs px-3 py-1.5 rounded-xl font-bold',
              half === s ? 'bg-[#3A506B] text-[#6FFFE9] border border-[#5BC0BE]/40' : 'bg-[#1C2541] text-slate-400',
            )}
          >
            {s === 'syksy' ? `Syksy ${year}` : s === 'kevat' ? `Kevät ${year}` : 'Koko vuosi'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        <Stat label="Ottelut" value={gp} />
        <Stat label="PTS" value={pts} />
        <Stat label="AST" value={ast} />
        <Stat label="3P" value={threes} />
        <Stat label="Virheet" value={pf} />
      </div>

      <div className="space-y-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ottelut</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">Ei otteluita valitulle kaudelle.</p>
        ) : (
          rows.map((row) => (
            <button
              key={row.matchId}
              type="button"
              onClick={() => navigate(`/match/${row.matchId}`)}
              className={clsx(
                'w-full text-left rounded-xl border border-slate-800 bg-[#1C2541] px-3 py-3 hover:border-[#5BC0BE]/50',
                row.dnp && 'opacity-50',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white truncate">
                  {row.homeTeam} – {row.awayTeam}
                </p>
                <span className="text-[11px] font-mono text-[#6FFFE9]">
                  {row.upcoming ? 'vs' : row.score || ''}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {row.date}
                {row.dnp ? ' · ei pelannut' : row.upcoming ? '' : ` · ${row.points} PTS · ${row.assists} AST · ${row.threePointers} 3P`}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
