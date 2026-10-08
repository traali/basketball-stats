import { Link } from 'react-router-dom'
import { useFavorites } from '../hooks/useFavorites'
import { FavoritesList } from '../components/FavoritesList'

export function FavoritesPage() {
  const { favorites } = useFavorites()
  return (
    <div className="page-shell">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Suosikit</h1>
        <p className="text-xs text-slate-400 mt-1">Tallennettu tähän puhelimeen (selaimen muisti).</p>
      </div>
      {favorites.length === 0 ? (
        <p className="text-sm text-slate-400">
          Ei suosikkeja vielä. Tallenna joukkue, pelaaja tai seura sydämellä —{' '}
          <Link to="/search" className="text-ice font-semibold">
            hae
          </Link>
          .
        </p>
      ) : (
        <FavoritesList favorites={favorites} />
      )}
    </div>
  )
}
