import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { fetchBasketGroup, mapGroupTeamsToStandings } from '../services/basketApi'
import type { BasketGroupDetail } from '../types/basketball'
import { BasketStandingsTable } from '../components/BasketStandingsTable'

export function GroupPage() {
  const { compId = '', catId = '', groupId = '' } = useParams()
  const navigate = useNavigate()
  const [group, setGroup] = useState<BasketGroupDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBasketGroup(compId, catId, groupId)
      .then(setGroup)
      .finally(() => setLoading(false))
  }, [compId, catId, groupId])

  const standings = group ? mapGroupTeamsToStandings(group.teams, group.matches) : []
  const upcoming = (group?.matches || []).filter((m) => m.scoreHome == null).slice(0, 8)
  const played = (group?.matches || []).filter((m) => m.scoreHome != null).slice(-12).reverse()

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-5">
      <button type="button" onClick={() => navigate(`/competition/${compId}/category/${catId}`)} className="text-xs text-slate-400 flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" /> Sarja
      </button>
      {loading ? (
        <div className="animate-pulse h-40 rounded-2xl bg-[#1C2541]" />
      ) : group ? (
        <>
          <div>
            <h1 className="text-2xl font-black">{group.groupName}</h1>
            <p className="text-xs text-slate-400">{group.competitionName} · {group.categoryName}</p>
          </div>
          <BasketStandingsTable standings={standings} />
          {upcoming.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tulevat</h2>
              {upcoming.map((m) => (
                <button
                  key={m.matchId}
                  type="button"
                  onClick={() => navigate(`/match/${m.matchId}`)}
                  className="w-full text-left rounded-xl border border-slate-800 bg-[#1C2541] px-3 py-3 hover:border-[#5BC0BE]/50"
                >
                  <p className="text-sm font-semibold">{m.homeTeam} – {m.awayTeam}</p>
                  <p className="text-[11px] text-slate-400">{m.date} {m.time?.slice(0, 5)}</p>
                </button>
              ))}
            </section>
          )}
          {played.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pelatut</h2>
              {played.map((m) => (
                <button
                  key={m.matchId}
                  type="button"
                  onClick={() => navigate(`/match/${m.matchId}`)}
                  className="w-full text-left rounded-xl border border-slate-800 bg-[#1C2541] px-3 py-3 hover:border-[#5BC0BE]/50"
                >
                  <p className="text-sm font-semibold">{m.homeTeam} – {m.awayTeam}</p>
                  <p className="text-[11px] text-[#6FFFE9] font-mono">{m.scoreHome}–{m.scoreAway}</p>
                </button>
              ))}
            </section>
          )}
        </>
      ) : (
        <p className="text-sm text-rose-400">Lohkoa ei löytynyt.</p>
      )}
    </div>
  )
}
