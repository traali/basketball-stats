import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Heart } from 'lucide-react'
import { fetchBasketClub } from '../services/basketApi'
import type { BasketClubDetail } from '../types/basketball'
import { useFavorites } from '../hooks/useFavorites'

export function ClubPage() {
  const { clubId = '' } = useParams()
  const navigate = useNavigate()
  const { isFavorite, toggle } = useFavorites()
  const [club, setClub] = useState<BasketClubDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBasketClub(clubId)
      .then(setClub)
      .finally(() => setLoading(false))
  }, [clubId])

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-slate-400 text-sm">Ladataan seuraa…</div>
  if (!club) return <div className="max-w-4xl mx-auto px-4 py-16 text-rose-400 text-sm">Seuraa ei löytynyt.</div>

  const active = club.teams.filter((t) => t.categoryName)
  const pool = active.length ? active : club.teams
  const groups = new Map<string, typeof pool>()
  for (const t of pool) {
    const key = t.categoryName?.split(' ')[0] || 'Muut'
    const list = groups.get(key) || []
    list.push(t)
    groups.set(key, list)
  }
  const fav = isFavorite('club', club.clubId)

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button type="button" onClick={() => navigate('/search')} className="text-xs text-slate-400 flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Haku
          </button>
          <h1 className="text-2xl font-black">{club.name}</h1>
          <p className="text-xs text-slate-400">{[club.cityName, club.venueName].filter(Boolean).join(' · ')}</p>
        </div>
        <button
          type="button"
          onClick={() => toggle({ kind: 'club', id: club.clubId, name: club.name, subtitle: club.cityName })}
          className={`p-2 rounded-full border ${fav ? 'border-rose-400 text-rose-400' : 'border-slate-700 text-slate-400'}`}
        >
          <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
        </button>
      </div>
      {[...groups.entries()].map(([label, teams]) => (
        <section key={label} className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label} ({teams.length})</h2>
          {teams.map((t) => (
            <button
              key={t.teamId}
              type="button"
              onClick={() => navigate(`/team/${t.teamId}`)}
              className="w-full text-left rounded-xl border border-slate-800 bg-[#1C2541] px-3 py-3 hover:border-[#5BC0BE]/50"
            >
              <p className="text-sm font-semibold">{t.teamName}</p>
              <p className="text-[11px] text-slate-400">{t.categoryName || 'Joukkue'}</p>
            </button>
          ))}
        </section>
      ))}
    </div>
  )
}
