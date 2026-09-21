import { useNavigate } from 'react-router-dom'
import { useFavorites } from '../hooks/useFavorites'

export function FavoritesPage() {
  const { favorites, toggle } = useFavorites()
  const navigate = useNavigate()

  const open = (kind: string, id: string) => {
    if (kind === 'player') navigate(`/player/${id}`)
    else if (kind === 'club') navigate(`/club/${id}`)
    else navigate(`/team/${id}`)
  }

  return (
    <div className="page-shell">
      <h1 className="text-2xl font-semibold tracking-tight">Suosikit</h1>
      {favorites.length === 0 ? (
        <p className="text-sm text-slate-400">Tallenna joukkue, seura tai pelaaja sydämellä.</p>
      ) : (
        <div className="space-y-2">
          {favorites.map((f) => (
            <div key={`${f.kind}-${f.id}`} className="flex items-center justify-between rounded-xl border border-hairline bg-court px-3 py-3 min-h-12">
              <button type="button" onClick={() => open(f.kind, f.id)} className="text-left min-w-0">
                <p className="text-sm font-semibold truncate">{f.name}</p>
                <p className="text-[11px] text-slate-400">{f.subtitle || f.kind}</p>
              </button>
              <button type="button" onClick={() => toggle(f)} className="text-[11px] font-semibold text-rose-400">
                Poista
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
