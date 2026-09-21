import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchBasketCompetitions } from '../services/basketApi'
import type { BasketCompetition } from '../types/basketball'

const FILTERS = [
  { id: 'all', label: 'Kaikki' },
  { id: 'etela', label: 'Etelä' },
  { id: 'liiga', label: 'Liiga' },
  { id: 'nuoret', label: 'Nuoret' },
] as const

export function BrowsePage() {
  const navigate = useNavigate()
  const [comps, setComps] = useState<BasketCompetition[]>([])
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBasketCompetitions()
      .then(setComps)
      .finally(() => setLoading(false))
  }, [])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return comps.filter((c) => {
      const hay = `${c.competitionName} ${c.organiser || ''} ${c.seasonId}`.toLowerCase()
      if (needle && !hay.includes(needle)) return false
      if (filter === 'etela') return hay.includes('etelä') || hay.includes('etela') || c.competitionId.includes('es')
      if (filter === 'liiga') return hay.includes('liiga')
      if (filter === 'nuoret') return /u1[0-9]|p1[0-9]|junior|pojat|tytöt|tytot/i.test(hay)
      return true
    })
  }, [comps, filter, q])

  return (
    <div className="page-shell">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Selaa sarjoja</h1>
        <p className="text-xs text-slate-400 mt-1">Kilpailu → sarja → lohko, sama polku kuin jalkapallossa.</p>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Suodata kilpailun nimellä…"
        className="field"
      />
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`chip ${filter === f.id ? 'chip-active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="animate-pulse h-24 rounded-2xl bg-court" />
      ) : visible.length === 0 ? (
        <p className="text-sm text-slate-500">
          {comps.length === 0
            ? 'Sarjoja ei saatu Basket.fistä. Kokeile hetken päästä uudelleen.'
            : 'Ei kilpailuja tällä suodattimella.'}
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((c) => (
            <button
              key={c.competitionId}
              type="button"
              onClick={() => navigate(`/competition/${c.competitionId}`)}
              className="w-full text-left rounded-2xl border border-hairline bg-court p-4 hover:border-accent/50"
            >
              <p className="font-semibold text-white">{c.competitionName}</p>
              <p className="text-xs text-slate-400">
                {c.seasonId}
                {c.organiser ? ` · ${c.organiser}` : ''}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
