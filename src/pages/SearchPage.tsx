import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Calendar, Layers, Search, Shield, Trophy, User, Users } from 'lucide-react'
import { searchBasketData, type SearchOutcome } from '../services/basketApi'
import type { DiscoveryHit } from '../types/basketball'
import { LoadError } from '../components/LoadError'
import { FavoriteButton } from '../components/FavoriteButton'
import { useFavorites, type FavKind } from '../hooks/useFavorites'

const CHIPS = ['Honka', 'HNMKY', 'ToPo', 'U14', 'U16', 'Helsinki']
const EMPTY: SearchOutcome = { hits: [], failed: false }

export function SearchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { favorites } = useFavorites()
  const q = params.get('q') || ''
  const [input, setInput] = useState(q)
  const [result, setResult] = useState<SearchOutcome>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [attempt, setAttempt] = useState(0)

  const favoriteTeams = useMemo(
    () => favorites.filter((f) => f.kind === 'team').map((f) => ({ id: f.id, name: f.name })),
    [favorites],
  )
  const favKey = favoriteTeams.map((t) => t.id).join(',')

  useEffect(() => {
    setInput(q)
    if (!q.trim()) {
      setResult(EMPTY)
      return
    }
    let cancelled = false
    setLoading(true)
    setProgress(null)
    setResult(EMPTY)
    searchBasketData(q, {
      favoriteTeams,
      onProgress: ({ done, total, hits }) => {
        if (cancelled) return
        setProgress({ done, total })
        setResult({ hits, failed: false })
      },
    })
      .then((res) => {
        if (!cancelled) setResult(res)
      })
      .catch(() => {
        if (!cancelled) setResult({ hits: [], failed: true })
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          setProgress(null)
        }
      })
    return () => {
      cancelled = true
    }
    // favoriteTeams is keyed by favKey to avoid re-running on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, attempt, favKey])

  const submit = (value: string) => {
    const next = value.trim()
    if (!next) return
    navigate(`/search?q=${encodeURIComponent(next)}`)
  }

  const hits = result.hits
  const grouped = {
    club: hits.filter((h) => h.kind === 'club'),
    team: hits.filter((h) => h.kind === 'team'),
    player: hits.filter((h) => h.kind === 'player'),
    match: hits.filter((h) => h.kind === 'match'),
    competition: hits.filter((h) => h.kind === 'competition'),
    category: hits.filter((h) => h.kind === 'category'),
  }

  return (
    <div className="page-shell">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Haku</h1>
        <p className="text-xs text-slate-400 mt-1">
          Seura, joukkue (esim. «LePy U16»), sarja tai pelaaja seuran kanssa (esim. «Pyrintö Virtanen»). Myös Basket.fi-linkki tai tunnus.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(input)
        }}
        className="flex items-center bg-court border border-hairline rounded-2xl overflow-hidden focus-within:border-accent"
      >
        <Search className="w-4 h-4 text-slate-400 ml-4" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus={!q}
          enterKeyHint="search"
          placeholder="Hae seura, joukkue tai pelaaja"
          className="grow bg-transparent text-white text-base px-3 py-3 min-h-12 focus:outline-none placeholder:text-slate-500"
        />
        <button type="submit" className="btn-ice mr-1.5 my-1.5">
          Hae
        </button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {CHIPS.map((chip) => (
          <button key={chip} type="button" onClick={() => submit(chip)} className="chip">
            {chip}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-sm text-slate-400" role="status" aria-live="polite">
          {progress && progress.total > 0
            ? `Haetaan joukkueita ${progress.done}/${progress.total}… (pelaajat löytyvät kokoonpanoista)`
            : 'Haetaan Basket.fi:stä…'}
        </p>
      ) : null}
      {loading && hits.length === 0 ? null : result.failed ? (
        <LoadError what="Hakutuloksia" onRetry={() => setAttempt((n) => n + 1)} />
      ) : !q ? (
        <p className="text-sm text-slate-500">Aloita hakemalla seuraa, joukkuetta, sarjaa tai pelaajaa.</p>
      ) : (
        <div className="space-y-5">
          {hits.length === 0 && !loading ? <p className="text-sm text-slate-500">Ei osumia haulle «{q}».</p> : null}
          {result.hint ? <p className="text-xs text-slate-400 rounded-xl border border-hairline px-3 py-2">{result.hint}</p> : null}
          <HitGroup icon={Users} title="Seurat" items={grouped.club} fav="club" onOpen={(id) => navigate(`/club/${id}`)} />
          <HitGroup icon={Shield} title="Joukkueet" items={grouped.team} fav="team" onOpen={(id) => navigate(`/team/${id}`)} />
          <HitGroup icon={User} title="Pelaajat" items={grouped.player} fav="player" onOpen={(id) => navigate(`/player/${id}`)} />
          <HitGroup icon={Calendar} title="Ottelut" items={grouped.match} onOpen={(id) => navigate(`/match/${id}`)} />
          <HitGroup icon={Trophy} title="Kilpailut" items={grouped.competition} onOpen={(id) => navigate(`/competition/${id}`)} />
          <HitGroup
            icon={Layers}
            title="Sarjat"
            items={grouped.category}
            onOpen={(id) => {
              const [comp, cat] = id.split('::')
              if (comp && cat) navigate(`/competition/${comp}/category/${cat}`)
            }}
          />
        </div>
      )}
    </div>
  )
}

function HitGroup({
  title,
  icon: Icon,
  items,
  onOpen,
  fav,
}: {
  title: string
  icon: typeof Shield
  items: DiscoveryHit[]
  onOpen: (id: string) => void
  fav?: FavKind
}) {
  if (items.length === 0) return null
  return (
    <section className="space-y-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-accent" /> {title} ({items.length})
      </h2>
      {items.map((h) => (
        <div
          key={`${h.kind}-${h.id}`}
          className="flex items-center gap-2 rounded-xl border border-hairline bg-court pr-1 hover:border-accent/50 transition-colors"
        >
          <button type="button" onClick={() => onOpen(h.id)} className="grow min-w-0 text-left px-3 py-3 min-h-12">
            <p className="text-sm font-semibold text-white truncate">{h.title}</p>
            {h.subtitle ? <p className="text-[11px] text-slate-400 truncate">{h.subtitle}</p> : null}
          </button>
          {fav ? <FavoriteButton item={{ kind: fav, id: h.id, name: h.title, subtitle: h.subtitle }} size="sm" /> : null}
        </div>
      ))}
    </section>
  )
}
