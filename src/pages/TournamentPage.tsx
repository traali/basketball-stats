import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Medal, Trophy } from 'lucide-react'
import { fetchBasketTournament, isNotFound, type BasketTournament } from '../services/basketApi'
import { BasketStandingsTable } from '../components/BasketStandingsTable'
import { FavoriteButton } from '../components/FavoriteButton'
import { FederationLink } from '../components/FederationLink'
import { LoadError } from '../components/LoadError'
import { TournamentGameRow } from '../components/TournamentGameRow'
import { federationGroupUrl } from '../utils/federationLinks'
import { formatGameDay } from '../utils/formatFi'
import { tournamentSubtitle, tournamentTitle, type TournamentTie } from '../utils/tournament'

function dateSpan(dates: string[]): string {
  if (!dates.length) return 'Päivä avoin'
  const first = formatGameDay(dates[0])
  const last = formatGameDay(dates[dates.length - 1])
  return first === last ? first : `${first} – ${last}`
}

function TieRow({ tie }: { tie: TournamentTie }) {
  const decided = tie.resultHome !== undefined && tie.resultAway !== undefined
  const unit = tie.kind === 'series' ? 'voitot' : 'yhteispisteet'
  return (
    <li className="rounded-xl border border-hairline bg-court px-3 py-2 text-sm flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold truncate">
          <span className={tie.home.placeholder ? 'italic font-normal text-slate-400' : ''}>{tie.home.name}</span>
          <span className="text-slate-500 mx-1.5 font-normal">–</span>
          <span className={tie.away.placeholder ? 'italic font-normal text-slate-400' : ''}>{tie.away.name}</span>
        </p>
        <p className="text-[11px] text-slate-400">
          {tie.kind === 'series' ? `Ottelusarja${tie.bestOf ? `, paras ${tie.bestOf}:stä` : ''}` : 'Ottelupari, kaksi osaa'}
          {tie.legs.length ? ` · ${tie.legs.length} ottelua listattu` : ''}
        </p>
      </div>
      {decided ? (
        <span className="shrink-0 text-right">
          <span className="font-mono font-semibold tabular-nums">
            {tie.resultHome}–{tie.resultAway}
          </span>
          <span className="block text-[10px] text-slate-400">{unit}</span>
        </span>
      ) : (
        <span className="shrink-0 text-[10px] uppercase tracking-wider text-slate-400">Kesken</span>
      )}
    </li>
  )
}

/**
 * A tournament: a hosted junior round or a bracket group (cup, karsinnat,
 * pudotuspelit). Games by Helsinki day and by court; tables only from TASO.
 */
export function TournamentPage() {
  const { key = '' } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<BasketTournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      setData(await fetchBasketTournament(key))
    } catch (err) {
      if (isNotFound(err)) setData(null)
      else setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [key])

  useEffect(() => {
    void load()
  }, [load])

  const open = (id: string) => navigate(`/match/${id}`)

  if (loading) {
    return (
      <div className="page-shell">
        <p className="text-sm text-slate-400" role="status">
          Ladataan turnausta…
        </p>
        <div className="animate-pulse h-40 rounded-2xl bg-court" />
      </div>
    )
  }
  if (failed) {
    return (
      <div className="page-shell">
        <LoadError what="Turnausta" onRetry={() => void load()} />
      </div>
    )
  }
  if (!data) {
    return (
      <div className="page-shell">
        <p className="text-sm text-slate-400">Basket.fi:ssä ei ole tätä turnausta.</p>
      </div>
    )
  }

  const { ref, view } = data
  const title = tournamentTitle(ref)
  const subtitle = tournamentSubtitle(ref)
  const placeholders = data.teams.filter((t) => t.placeholder)
  const realTeams = data.teams.filter((t) => !t.placeholder)

  return (
    <div className="page-shell" data-testid="tournament-page">
      <button
        type="button"
        onClick={() => navigate(`/competition/${ref.competitionId}/category/${ref.categoryId}`)}
        className="text-xs text-slate-400 flex items-center gap-1 min-h-11"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Sarja
      </button>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-accent font-semibold flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5" /> {ref.kind === 'round' ? 'Turnaus' : data.typeLabel || 'Turnaus'}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-xs text-slate-400">{[dateSpan(ref.dates), subtitle].filter(Boolean).join(' · ')}</p>
          <p className="text-[11px] text-slate-500">
            {ref.kind === 'round' ? `${ref.competitionName} · ${ref.groupName}` : ref.competitionName}
          </p>
          <FederationLink href={federationGroupUrl(ref.competitionId, ref.categoryId, ref.groupId)} label="Lohko Basket.fi-tulospalvelussa" />
        </div>
        <FavoriteButton
          item={{ kind: 'tournament', id: data.key, name: title, subtitle: [dateSpan(ref.dates), subtitle].filter(Boolean).join(' · ') }}
        />
      </div>

      {view.liveCount > 1 ? (
        <p className="text-[11px] text-slate-400">Basket.fi merkitsee {view.liveCount} ottelua käynnissä oleviksi.</p>
      ) : null}

      {view.placements.length ? (
        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Medal className="w-3.5 h-3.5 text-accent" /> Sijoitukset (sijoitusotteluista)
          </h2>
          <ol className="space-y-1">
            {view.placements.map((p) => (
              <li key={`${p.position}-${p.fromMatchId}-${p.team.name}`} className="flex items-center gap-3 rounded-xl border border-hairline bg-court px-3 py-2 text-sm">
                <span className="font-mono font-semibold text-ice w-8">{p.position}.</span>
                {p.team.id ? (
                  <button type="button" onClick={() => navigate(`/team/${p.team.id}`)} className="font-semibold truncate text-left">
                    {p.team.name}
                  </button>
                ) : (
                  <span className="font-semibold truncate">{p.team.name}</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {view.ties.length ? (
        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Ottelusarjat ja -parit ({view.ties.length})</h2>
          <ul className="space-y-1.5">
            {view.ties.map((t) => (
              <TieRow key={t.matchId} tie={t} />
            ))}
          </ul>
        </section>
      ) : null}

      {view.days.map((day) => (
        <section key={day.date} className="space-y-2" data-testid="tournament-day">
          <h2 className="text-sm font-semibold text-white">{formatGameDay(day.date)}</h2>
          {day.courts.map((court) => (
            <div key={court.venue} className="space-y-1.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {court.venue} ({court.games.length})
              </h3>
              {court.games.map((g) => (
                <TournamentGameRow key={g.matchId} game={g} onOpen={open} />
              ))}
            </div>
          ))}
        </section>
      ))}

      {view.undated.length ? (
        <section className="space-y-1.5">
          <h2 className="text-sm font-semibold text-white">Aika avoin ({view.undated.length})</h2>
          <p className="text-[11px] text-slate-500">Basket.fi ei ole vielä julkaissut näiden otteluiden päivää.</p>
          {view.undated.map((g) => (
            <TournamentGameRow key={g.matchId} game={g} onOpen={open} />
          ))}
        </section>
      ) : null}

      {data.standings.length ? (
        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {ref.kind === 'round' ? 'Lohkon sarjataulukko (koko lohko, Basket.fi)' : 'Sarjataulukko (Basket.fi)'}
          </h2>
          <BasketStandingsTable standings={data.standings} />
        </section>
      ) : (
        <p className="text-[11px] text-slate-500">Basket.fi ei julkaise tälle lohkolle sarjataulukkoa.</p>
      )}

      {ref.kind === 'bracket' && (realTeams.length || placeholders.length) ? (
        <section className="space-y-1.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Joukkueet ({realTeams.length})</h2>
          <p className="text-xs text-slate-300">{realTeams.map((t) => t.name).join(', ')}</p>
          {placeholders.length ? (
            <p className="text-[11px] text-slate-400 italic">Vielä avoinna: {placeholders.map((t) => t.name).join(', ')}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
