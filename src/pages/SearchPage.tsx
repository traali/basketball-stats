import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Calendar, Layers, Search, Shield, Trophy, User, Users } from 'lucide-react'
import { searchDiscovery } from '../services/basketApi'
import type { DiscoveryHit } from '../types/basketball'

const CHIPS = ['Honka', 'ETEK', 'HNMKY', 'U14', 'U16', 'Helsinki']

export function SearchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const q = params.get('q') || ''
  const [input, setInput] = useState(q)
  const [hits, setHits] = useState<DiscoveryHit[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setInput(q)
    if (!q.trim()) {
      setHits([])
      return
    }
    let cancelled = false
    setLoading(true)
    searchDiscovery(q)
      .then((res) => {
        if (!cancelled) setHits(res)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [q])

  const submit = (value: string) => {
    const next = value.trim()
    if (!next) return
    navigate(`/search?q=${encodeURIComponent(next)}`)
  }

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
        <p className="text-xs text-slate-400 mt-1">Joukkue, seura, sarja, pelaaja tai ottelulinkki.</p>
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
          placeholder="Hae Westend, U14, pelaaja tai liitä basket.fi-linkki"
          className="grow bg-transparent text-white text-sm px-3 py-3 min-h-12 focus:outline-none placeholder:text-slate-500"
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
        <p className="text-sm text-slate-400">Haetaan…</p>
      ) : !q ? (
        <p className="text-sm text-slate-500">Aloita hakemalla seuraa, sarjaa tai pelaajaa.</p>
      ) : hits.length === 0 ? (
        <p className="text-sm text-slate-500">Ei osumia haulle «{q}».</p>
      ) : (
        <div className="space-y-5">
          <HitGroup icon={Users} title="Seurat" items={grouped.club} onOpen={(id) => navigate(`/club/${id}`)} />
          <HitGroup icon={Shield} title="Joukkueet" items={grouped.team} onOpen={(id) => navigate(`/team/${id}`)} />
          <HitGroup icon={User} title="Pelaajat" items={grouped.player} onOpen={(id) => navigate(`/player/${id}`)} />
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
          <HitGroup icon={Calendar} title="Ottelut" items={grouped.match} onOpen={(id) => navigate(`/match/${id}`)} />
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
}: {
  title: string
  icon: typeof Shield
  items: DiscoveryHit[]
  onOpen: (id: string) => void
}) {
  if (items.length === 0) return null
  return (
    <section className="space-y-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-accent" /> {title}
      </h2>
      {items.map((h) => (
        <button
          key={`${h.kind}-${h.id}`}
          type="button"
          onClick={() => onOpen(h.id)}
          className="w-full text-left rounded-xl border border-hairline bg-court px-3 py-3 min-h-12 hover:border-accent/50 transition-colors"
        >
          <p className="text-sm font-semibold text-white">{h.title}</p>
          <p className="text-[11px] text-slate-400">{h.subtitle}</p>
        </button>
      ))}
    </section>
  )
}
