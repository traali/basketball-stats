import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ListTree } from 'lucide-react'
import { fetchBasketGroups } from '../services/basketApi'
import type { BasketGroupSummary } from '../types/basketball'
import { LoadError } from '../components/LoadError'

export function CategoryPage() {
  const { compId = '', catId = '' } = useParams()
  const navigate = useNavigate()
  const [groups, setGroups] = useState<BasketGroupSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!compId || !catId) return
    setLoading(true)
    setFailed(false)
    fetchBasketGroups(compId, catId)
      .then(setGroups)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [compId, catId, attempt])

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
      <button type="button" onClick={() => navigate(`/competition/${compId}`)} className="text-xs text-slate-400 flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" /> Kilpailu
      </button>
      <h1 className="text-2xl font-semibold tracking-tight">{groups[0]?.categoryName || 'Sarja'}</h1>
      {loading ? (
        <div className="animate-pulse h-24 rounded-2xl bg-court" />
      ) : failed ? (
        <LoadError what="Lohkoja" onRetry={() => setAttempt((n) => n + 1)} />
      ) : groups.length === 0 ? (
        <p className="text-sm text-slate-500">Basket.fi ei näytä tälle sarjalle lohkoja.</p>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <button
              key={g.groupId}
              type="button"
              onClick={() => navigate(`/group/${compId}/${catId}/${g.groupId}`)}
              className="w-full text-left rounded-xl border border-hairline bg-court p-4 flex items-center gap-3 hover:border-accent/50"
            >
              <ListTree className="w-4 h-4 text-accent" />
              <div>
                <p className="text-sm font-semibold">{g.groupName}</p>
                <p className="text-[11px] text-slate-400">{g.teamCount ? `${g.teamCount} joukkuetta` : 'Avaa taulukko'}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
