import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Heart, Loader2 } from 'lucide-react'
import { fetchBasketPlayer, fetchBasketTeamFixtures } from '../services/basketApi'
import type { BasketPlayerProfile, BasketTeamFixture } from '../types/basketball'
import { useFavorites } from '../hooks/useFavorites'
import { MatchRow } from '../components/MatchRow'
import { LoadError } from '../components/LoadError'
import { splitFixtures, teamSeasons } from '../utils/fixtureGroups'

/**
 * Basket.fi getPlayer gives the profile, teams and upcoming games. Its played
 * match list is empty for basketball, so this page shows no season totals —
 * per-game points are on each game page (lineup).
 */
export function PlayerPage() {
  const { playerId = '' } = useParams()
  const navigate = useNavigate()
  const { isFavorite, toggle } = useFavorites()
  const [player, setPlayer] = useState<BasketPlayerProfile | null>(null)
  const [fixtures, setFixtures] = useState<BasketTeamFixture[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [fixturesFailed, setFixturesFailed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    setFixturesFailed(false)
    let p: BasketPlayerProfile | null = null
    try {
      p = await fetchBasketPlayer(playerId)
    } catch {
      setFailed(true)
      setLoading(false)
      return
    }
    setPlayer(p)
    setLoading(false)
    const teamIds = [...new Set((p?.teams || []).map((t) => t.teamId).filter(Boolean))]
    const lists = await Promise.allSettled(teamIds.map((id) => fetchBasketTeamFixtures(id)))
    if (lists.some((r) => r.status === 'rejected')) setFixturesFailed(true)
    const seen = new Set<string>()
    const merged: BasketTeamFixture[] = []
    for (const r of lists) {
      if (r.status !== 'fulfilled') continue
      for (const f of r.value) {
        if (seen.has(f.matchId)) continue
        seen.add(f.matchId)
        merged.push(f)
      }
    }
    setFixtures(merged)
  }, [playerId])

  useEffect(() => {
    void load()
  }, [load])

  const season = useMemo(() => teamSeasons(fixtures)[0] || '', [fixtures])
  const groups = useMemo(() => splitFixtures(fixtures.filter((f) => !season || f.season === season)), [fixtures, season])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-sm">Ladataan pelaajaa…</p>
      </div>
    )
  }
  if (failed)
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <LoadError what={`Pelaajaa #${playerId}`} onRetry={() => void load()} />
      </div>
    )
  if (!player)
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-rose-400 text-sm">Basket.fi:ssä ei ole pelaajaa #{playerId}.</div>
    )

  const fav = isFavorite('player', player.playerId)
  const teamIds = new Set(player.teams.map((t) => t.teamId))
  const highlight = (f: BasketTeamFixture) =>
    f.homeTeamId && teamIds.has(f.homeTeamId) ? f.homeTeamId : f.awayTeamId && teamIds.has(f.awayTeamId) ? f.awayTeamId : undefined

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button type="button" onClick={() => navigate(-1)} className="text-xs text-slate-400 flex items-center gap-1 mb-2 min-h-11">
            <ArrowLeft className="w-3.5 h-3.5" /> Takaisin
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">{player.fullName}</h1>
          <p className="text-xs text-slate-400">
            {[player.clubName, player.birthYear ? `s. ${player.birthYear}` : ''].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            toggle({
              kind: 'player',
              id: player.playerId,
              name: player.fullName,
              subtitle: [player.teams[0]?.teamName, player.clubName].filter(Boolean).join(' · '),
            })
          }
          aria-label={fav ? 'Poista suosikeista' : 'Lisää suosikkeihin'}
          className={`p-2.5 rounded-full border shrink-0 ${fav ? 'border-rose-400 text-rose-400' : 'border-slate-700 text-slate-400'}`}
        >
          <Heart className={`w-5 h-5 ${fav ? 'fill-current' : ''}`} />
        </button>
      </div>

      {player.teams.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Joukkueet</h2>
          {player.teams.map((t) => (
            <button
              key={t.teamId}
              type="button"
              onClick={() => navigate(`/team/${t.teamId}`)}
              className="w-full text-left rounded-xl border border-hairline bg-court px-3 py-2.5 min-h-12 hover:border-accent/50"
            >
              <p className="text-sm font-semibold text-ice">
                {t.teamName}
                {t.shirtNumber ? <span className="text-slate-400 font-mono ml-2">#{t.shirtNumber}</span> : null}
              </p>
              <p className="text-[11px] text-slate-400">{t.categoryName || t.clubName || ''}</p>
            </button>
          ))}
        </section>
      )}

      <p className="text-xs text-slate-500">
        Basket.fi ei julkaise pelaajan kausitilastoja. Pelaajan pisteet näkyvät ottelun sivulla, jos pöytäkirjaan on kirjattu kokoonpano.
      </p>

      {fixturesFailed ? <LoadError what="Joukkueen otteluita" onRetry={() => void load()} /> : null}

      {(
        [
          ['Käynnissä', groups.live],
          ['Joukkueen tulevat ottelut', groups.upcoming],
          ['Joukkueen pelatut ottelut', groups.played],
        ] as const
      ).map(([title, list]) =>
        list.length ? (
          <section key={title} className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {title}
              {season ? ` · ${season}` : ''}
            </h2>
            {list.map((f) => (
              <MatchRow key={f.matchId} fixture={f} highlightTeamId={highlight(f)} onOpen={(id) => navigate(`/match/${id}`)} />
            ))}
          </section>
        ) : null,
      )}
    </div>
  )
}
