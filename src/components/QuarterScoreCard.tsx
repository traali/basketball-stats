import { Clock, MapPin, Trophy } from 'lucide-react'
import type { BasketMatchDetail, BasketQuarterScore } from '../types/basketball'
import { teamInitials } from '../utils/teamInitials'
import { formatGameDateTime } from '../utils/formatFi'
import { STATE_HINT } from '../utils/matchStatus'
import { StateBadge } from './MatchState'
import clsx from 'clsx'

interface QuarterScoreCardProps {
  match: BasketMatchDetail
  onOpenHome?: () => void
  onOpenAway?: () => void
}

/** Blank stays blank: a missing period or side renders as an empty cell, never 0. */
function cell(q: BasketQuarterScore | undefined, side: 'home' | 'away'): string {
  const v = side === 'home' ? q?.scoreHome : q?.scoreAway
  return v === null || v === undefined ? '' : String(v)
}

export function QuarterScoreCard({ match, onOpenHome, onOpenAway }: QuarterScoreCardProps) {
  const hasScore = match.scoreHome !== null && match.scoreAway !== null
  const periods = [1, 2, 3, 4]
  if (match.quarters.some((q) => q.quarter === 5)) periods.push(5)
  const byQuarter = new Map(match.quarters.map((q) => [q.quarter, q]))
  const hint = match.phase === 'forfeit' ? '' : STATE_HINT[match.phase]

  return (
    <div className="bg-court rounded-2xl p-4 sm:p-5 border border-hairline space-y-4">
      <div className="flex flex-wrap items-center justify-between border-b border-hairline pb-3 gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-accent min-w-0">
          <Trophy className="w-4 h-4 shrink-0" />
          <span className="truncate">{match.categoryName || match.competitionName}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0 tabular-nums">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatGameDateTime(match.date, match.time) || 'Aika avoin'}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 items-center text-center gap-2">
        <TeamSide name={match.homeTeamName} onOpen={onOpenHome} winner={match.winnerSide === 'home'} />

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 text-3xl sm:text-4xl font-semibold tracking-tight text-white tabular-nums">
            {hasScore ? (
              <>
                <span>{match.scoreHome}</span>
                <span className="text-slate-500 font-normal">–</span>
                <span>{match.scoreAway}</span>
              </>
            ) : (
              <span className="text-slate-400 text-xl font-medium">vs</span>
            )}
          </div>
          <StateBadge state={match.phase} className="mt-2" />
          {match.livePeriod ? <span className="text-[10px] text-rose-300 mt-1">{match.livePeriod <= 4 ? `${match.livePeriod}. neljännes` : 'Jatkoaika'}</span> : null}
        </div>

        <TeamSide name={match.awayTeamName} onOpen={onOpenAway} away winner={match.winnerSide === 'away'} />
      </div>

      {match.forfeitText ? (
        <p className="text-xs text-amber-200 text-center">
          {match.forfeitText}. Ottelua ei pelattu.
          {match.forfeitScore ? ` Basket.fi kirjasi tulokseksi ${match.forfeitScore.home}–${match.forfeitScore.away}.` : ''}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-400 text-center">{hint}</p>
      ) : null}

      {match.quarters.length > 0 && (
        <div className="bg-canvas/80 rounded-xl p-3 border border-hairline">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-[11px] text-slate-400 border-b border-hairline">
                <th className="text-left font-semibold pb-2">Joukkue</th>
                {periods.map((p) => (
                  <th key={p} className="font-semibold pb-2 w-10 text-center">{p === 5 ? 'JA' : `Q${p}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(['home', 'away'] as const).map((side) => (
                <tr key={side} className={side === 'away' ? 'border-t border-hairline/60' : ''}>
                  <td className={clsx('py-1.5 pr-1 truncate max-w-[8rem]', side === 'home' ? 'text-slate-400' : 'text-accent')}>
                    {side === 'home' ? match.homeTeamName : match.awayTeamName}
                  </td>
                  {periods.map((p) => {
                    const q = byQuarter.get(p)
                    return (
                      <td
                        key={p}
                        className={clsx('py-1.5 text-center font-semibold', q?.winner === side ? 'text-white' : 'text-slate-300')}
                      >
                        {cell(q, side)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {match.teamFoulsHome !== null && match.teamFoulsAway !== null ? (
        <p className="text-xs text-slate-300 text-center tabular-nums">
          Joukkuevirheet (live): {match.homeTeamName} {match.teamFoulsHome} – {match.teamFoulsAway} {match.awayTeamName}
        </p>
      ) : null}

      <div className="flex items-center justify-between text-xs text-slate-400 gap-2">
        {match.venueName ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{match.venueName}</span>
          </div>
        ) : (
          <span />
        )}
        {match.spectators ? <span className="tabular-nums">Katsojia: {match.spectators}</span> : null}
      </div>
    </div>
  )
}

function TeamSide({ name, onOpen, away, winner }: { name: string; onOpen?: () => void; away?: boolean; winner?: boolean }) {
  return (
    <div className="flex flex-col items-center min-w-0">
      <div
        className={clsx(
          'w-12 h-12 rounded-full bg-canvas border flex items-center justify-center font-semibold text-sm mb-2 tabular-nums',
          winner ? 'border-ice' : 'border-hairline',
          away ? 'text-accent' : 'text-ice',
        )}
      >
        {teamInitials(name)}
      </div>
      {onOpen ? (
        <button type="button" onClick={onOpen} className="font-semibold text-sm sm:text-base text-ice hover:underline truncate max-w-full min-h-11">
          {name}
        </button>
      ) : (
        <span className="font-semibold text-sm sm:text-base text-slate-100 truncate max-w-full">{name}</span>
      )}
    </div>
  )
}
