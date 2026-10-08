import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { fetchBasketGroup, fetchBasketMatchesByGroup, mapGroupTeamsToStandings } from '../services/basketApi'
import type { BasketGroupDetail, BasketTeamFixture } from '../types/basketball'
import { BasketStandingsTable } from '../components/BasketStandingsTable'
import { MatchRow } from '../components/MatchRow'
import { LoadError } from '../components/LoadError'
import { splitFixtures } from '../utils/fixtureGroups'

export function GroupPage() {
  const { compId = '', catId = '', groupId = '' } = useParams()
  const navigate = useNavigate()
  const [group, setGroup] = useState<BasketGroupDetail | null>(null)
  const [fixtures, setFixtures] = useState<BasketTeamFixture[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const [g, fx] = await Promise.all([
        fetchBasketGroup(compId, catId, groupId),
        fetchBasketMatchesByGroup(compId, catId, groupId),
      ])
      setGroup(g)
      setFixtures(fx)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [compId, catId, groupId])

  useEffect(() => {
    void load()
  }, [load])

  const standings = group ? mapGroupTeamsToStandings(group.teams, group.matches) : []
  const split = splitFixtures(fixtures)

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-5">
      <button
        type="button"
        onClick={() => navigate(`/competition/${compId}/category/${catId}`)}
        className="text-xs text-slate-400 flex items-center gap-1 min-h-11"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Sarja
      </button>
      {loading ? (
        <div className="animate-pulse h-40 rounded-2xl bg-court" />
      ) : failed ? (
        <LoadError what="Lohkoa" onRetry={() => void load()} />
      ) : group ? (
        <>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{group.groupName}</h1>
            <p className="text-xs text-slate-400">
              {group.competitionName} · {group.categoryName}
            </p>
          </div>
          <BasketStandingsTable standings={standings} />
          {(
            [
              ['Käynnissä', split.live],
              ['Tulevat', split.upcoming],
              ['Pelatut', split.played],
              ['Muut', split.other],
            ] as const
          ).map(([title, list]) =>
            list.length ? (
              <section key={title} className="space-y-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {title} ({list.length})
                </h2>
                {list.map((m) => (
                  <MatchRow key={m.matchId} fixture={m} onOpen={(id) => navigate(`/match/${id}`)} />
                ))}
              </section>
            ) : null,
          )}
        </>
      ) : (
        <p className="text-sm text-rose-400">Basket.fi:ssä ei ole tätä lohkoa.</p>
      )}
    </div>
  )
}
