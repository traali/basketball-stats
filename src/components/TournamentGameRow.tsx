import clsx from 'clsx'
import type { TeamSlot, TournamentGame } from '../utils/tournament'
import { formatGameClock } from '../utils/formatFi'
import { StateBadge } from './MatchState'

function Slot({ slot, won }: { slot: TeamSlot; won?: boolean }) {
  return (
    <span
      className={clsx(
        'truncate',
        slot.placeholder ? 'italic font-normal text-slate-400' : 'text-slate-100',
        won && 'text-ice',
      )}
      title={slot.placeholder ? 'Joukkue ei ole vielä tiedossa' : undefined}
    >
      {slot.name}
    </span>
  )
}

/**
 * One tournament game. A placeholder side ("Ottelun 863 voittaja") is shown
 * in italics and never gets a score; the state comes only from TASO.
 */
export function TournamentGameRow({ game: g, onOpen }: { game: TournamentGame; onOpen: (id: string) => void }) {
  const score = g.scoreHome !== undefined && g.scoreAway !== undefined ? `${g.scoreHome}–${g.scoreAway}` : undefined
  const clock = formatGameClock(g.time)
  return (
    <button
      type="button"
      onClick={() => onOpen(g.matchId)}
      data-testid="tournament-game"
      data-state={g.state}
      className="w-full text-left p-3 rounded-2xl bg-court border border-hairline hover:border-accent/60 transition-colors flex items-center justify-between gap-3 min-h-14"
    >
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 min-w-0">
          <span className="tabular-nums whitespace-nowrap font-semibold text-slate-300">{clock ? `klo ${clock}` : 'Aika avoin'}</span>
          {g.matchNumber ? <span className="text-slate-500 whitespace-nowrap">· ottelu {g.matchNumber}</span> : null}
          {g.roundName ? <span className="truncate text-slate-500">· {g.roundName}</span> : null}
        </div>
        <div className="font-semibold text-sm mt-0.5 flex items-center gap-1.5 min-w-0">
          <Slot slot={g.home} won={g.winnerSide === 'home'} />
          <span className="text-slate-500 font-normal shrink-0">–</span>
          <Slot slot={g.away} won={g.winnerSide === 'away'} />
        </div>
        {g.placement || g.tieNote ? (
          <div className="text-[11px] text-amber-200/80 mt-0.5 truncate">{[g.placement, g.tieNote].filter(Boolean).join(' · ')}</div>
        ) : null}
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        {score ? (
          <span className="font-mono font-semibold text-sm text-white bg-canvas px-2.5 py-1 rounded-lg border border-slate-700 tabular-nums">
            {score}
          </span>
        ) : null}
        {!score || g.state === 'live' ? <StateBadge state={g.state} /> : null}
      </div>
    </button>
  )
}
