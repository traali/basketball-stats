import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Layers } from 'lucide-react'
import { fetchBasketCategories, normalizeSearch } from '../services/basketApi'
import type { BasketCategory } from '../types/basketball'

const AGE = [
  { id: 'all', label: 'Kaikki' },
  { id: 'u12', label: 'U12' },
  { id: 'u14', label: 'U14' },
  { id: 'u16', label: 'U16' },
  { id: 'u18', label: 'U18' },
  { id: 'tyt', label: 'Tytöt' },
  { id: 'miehet', label: 'Miehet' },
  { id: 'naiset', label: 'Naiset' },
] as const

export function CompetitionPage() {
  const { compId = '' } = useParams()
  const navigate = useNavigate()
  const [cats, setCats] = useState<BasketCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [age, setAge] = useState<(typeof AGE)[number]['id']>('all')

  useEffect(() => {
    if (!compId) return
    fetchBasketCategories(compId)
      .then(setCats)
      .finally(() => setLoading(false))
  }, [compId])

  const visible = useMemo(() => {
    if (age === 'all') return cats
    return cats.filter((c) => normalizeSearch(c.categoryName).includes(age))
  }, [cats, age])

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
      <button type="button" onClick={() => navigate('/browse')} className="text-xs text-slate-400 flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" /> Alueet
      </button>
      <h1 className="text-2xl font-semibold tracking-tight">{cats[0]?.competitionName || compId}</h1>
      <div className="flex flex-wrap gap-1.5">
        {AGE.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setAge(f.id)}
            className={`chip ${age === f.id ? 'chip-active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="animate-pulse h-24 rounded-2xl bg-court" />
      ) : (
        <div className="space-y-2">
          {visible.map((c) => (
            <button
              key={c.categoryId}
              type="button"
              onClick={() => navigate(`/competition/${compId}/category/${c.categoryId}`)}
              className="w-full text-left rounded-xl border border-hairline bg-court p-4 flex items-center gap-3 hover:border-accent/50"
            >
              <Layers className="w-4 h-4 text-accent" />
              <div>
                <p className="text-sm font-semibold">{c.categoryName}</p>
                <p className="text-[11px] text-slate-400">
                  {c.teamCount ? `${c.teamCount} joukkuetta` : 'Avaa lohkot'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}