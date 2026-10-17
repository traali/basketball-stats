import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, Trophy } from 'lucide-react'
import { fetchBasketTournamentsOn, helsinkiDays } from '../services/basketApi'
import { FavoriteButton } from '../components/FavoriteButton'
import { LoadError } from '../components/LoadError'
import { formatGameDay } from '../utils/formatFi'
import { groupTypeLabel, TOURNAMENT_DAYS, tournamentSubtitle, tournamentTitle, type TournamentRef } from '../utils/tournament'

/** Tournaments on one Helsinki day, found in that day's TASO games. */
export function TournamentsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const days = useMemo(() => helsinkiDays(TOURNAMENT_DAYS), [])
  const day = days.includes(params.get('d') || '') ? (params.get('d') as string) : days[0]
  const [list, setList] = useState<TournamentRef[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)
    fetchBasketTournamentsOn(day)
      .then((r) => !cancelled && setList(r))
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [day, attempt])

  return (
    <div className="page-shell">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" /> Turnaukset
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Basket.fi:n turnauskierrokset (isäntäjoukkue) ja jatko- ja pudotuspelilohkot, joilla on otteluita valittuna päivänä.
        </p>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {days.map((d, i) => (
          <button
            key={d}
            type="button"
            onClick={() => setParams(i === 0 ? {} : { d }, { replace: true })}
            className={`chip whitespace-nowrap ${d === day ? 'border-accent text-ice' : ''}`}
            aria-pressed={d === day}
          >
            {i === 0 ? 'Tänään' : formatGameDay(d)}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-sm text-slate-400" role="status">
          Haetaan Basket.fi:stä…
        </p>
      ) : failed ? (
        <LoadError what="Turnauksia" onRetry={() => setAttempt((n) => n + 1)} />
      ) : list.length === 0 ? (
        <p className="text-sm text-slate-500">Basket.fi:ssä ei ole turnauksia päivälle {formatGameDay(day)}.</p>
      ) : (
        <ul className="space-y-2" data-testid="tournament-list">
          {list.map((t) => {
            const title = tournamentTitle(t)
            const subtitle = tournamentSubtitle(t)
            return (
              <li key={t.key} className="flex items-center gap-2 rounded-xl border border-hairline bg-court pr-1">
                <button type="button" onClick={() => navigate(`/tournament/${t.key}`)} className="grow min-w-0 text-left px-3 py-3 min-h-12">
                  <p className="text-sm font-semibold text-white truncate">{title}</p>
                  <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>
                  <p className="text-[11px] text-slate-500">
                    {t.gameCount === 1 ? '1 ottelu' : `${t.gameCount} ottelua`}{t.kind === 'bracket' ? ` · ${groupTypeLabel(t.groupType)}` : ''}
                  </p>
                </button>
                <FavoriteButton item={{ kind: 'tournament', id: t.key, name: title, subtitle }} size="sm" />
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
