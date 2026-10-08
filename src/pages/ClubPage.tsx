import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Heart } from 'lucide-react'
import { fetchBasketClub } from '../services/basketApi'
import type { BasketClubDetail, BasketClubTeam } from '../types/basketball'
import { useFavorites } from '../hooks/useFavorites'
import { LoadError } from '../components/LoadError'

function TeamButton({ t, onOpen }: { t: BasketClubTeam; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(t.teamId)}
      className="w-full text-left rounded-xl border border-hairline bg-court px-3 py-3 min-h-12 hover:border-accent/50"
    >
      <p className="text-sm font-semibold">{t.teamName}</p>
      <p className="text-[11px] text-slate-400">{[t.categoryName, t.season].filter(Boolean).join(' · ') || 'Joukkue'}</p>
    </button>
  )
}

export function ClubPage() {
  const { clubId = '' } = useParams()
  const navigate = useNavigate()
  const { isFavorite, toggle } = useFavorites()
  const [club, setClub] = useState<BasketClubDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      setClub(await fetchBasketClub(clubId))
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [clubId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-slate-400 text-sm">Ladataan seuraa…</div>
  if (failed)
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <LoadError what="Seuran tietoja" onRetry={() => void load()} />
      </div>
    )
  if (!club) return <div className="max-w-4xl mx-auto px-4 py-16 text-rose-400 text-sm">Basket.fi:ssä ei ole tätä seuraa.</div>

  const open = (id: string) => navigate(`/team/${id}`)
  const active = club.teams.filter((t) => t.status === 'active')
  const archived = club.teams.filter((t) => t.status !== 'active')
  const groups = new Map<string, BasketClubTeam[]>()
  for (const t of active) {
    const key = t.categoryName?.split(' ')[0] || 'Muut'
    const list = groups.get(key) || []
    list.push(t)
    groups.set(key, list)
  }
  const fav = isFavorite('club', club.clubId)

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button type="button" onClick={() => navigate(-1)} className="text-xs text-slate-400 flex items-center gap-1 mb-2 min-h-11">
            <ArrowLeft className="w-3.5 h-3.5" /> Takaisin
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">{club.name}</h1>
          <p className="text-xs text-slate-400">{[club.cityName, club.venueName].filter(Boolean).join(' · ')}</p>
        </div>
        <button
          type="button"
          onClick={() => toggle({ kind: 'club', id: club.clubId, name: club.name, subtitle: club.cityName })}
          aria-label={fav ? 'Poista suosikeista' : 'Lisää suosikkeihin'}
          className={`p-2.5 rounded-full border shrink-0 ${fav ? 'border-rose-400 text-rose-400' : 'border-slate-700 text-slate-400'}`}
        >
          <Heart className={`w-5 h-5 ${fav ? 'fill-current' : ''}`} />
        </button>
      </div>
      {active.length === 0 ? <p className="text-sm text-slate-500">Seuralla ei ole aktiivisia joukkueita Basket.fi:ssä.</p> : null}
      {[...groups.entries()].map(([label, teams]) => (
        <section key={label} className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {label} ({teams.length})
          </h2>
          {teams.map((t) => (
            <TeamButton key={t.teamId} t={t} onOpen={open} />
          ))}
        </section>
      ))}
      {archived.length > 0 ? (
        <section className="space-y-2">
          <button type="button" onClick={() => setShowArchived((v) => !v)} className="chip">
            {showArchived ? 'Piilota' : 'Näytä'} arkistoidut joukkueet ({archived.length})
          </button>
          {showArchived ? archived.map((t) => <TeamButton key={t.teamId} t={t} onOpen={open} />) : null}
        </section>
      ) : null}
    </div>
  )
}
