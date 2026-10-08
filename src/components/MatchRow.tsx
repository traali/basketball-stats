import clsx from 'clsx'
import { MapPin } from 'lucide-react'
import type { BasketTeamFixture } from '../types/basketball'
import { formatGameDateTime } from '../utils/formatFi'
import { StateBadge } from './MatchState'

/**
 * One game in a list. Score only when TASO has a played (or live today)
 * result; otherwise the state ("Tuleva", "Luovutus", "Ei tulosta", …).
 */
export function MatchRow({
  fixture: f,
  onOpen,
  highlightTeamId,
}: {
  fixture: BasketTeamFixture
  onOpen: (matchId: string) => void
  highlightTeamId?: string
}) {
  const homeMark = highlightTeamId && f.homeTeamId === highlightTeamId
  const awayMark = highlightTeamId && f.awayTeamId === highlightTeamId
  return (
    <button
      type="button"
      onClick={() => onOpen(f.matchId)}
      className="w-full text-left p-3 rounded-2xl bg-court border border-hairline hover:border-accent/60 transition-colors flex items-center justify-between gap-3 min-h-14"
    >
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 min-w-0">
          <span className="tabular-nums whitespace-nowrap">{formatGameDateTime(f.date, f.time) || 'Aika avoin'}</span>
          {f.categoryName ? <span className="truncate text-slate-500">· {f.categoryName}</span> : null}
        </div>
        <div className="font-semibold text-sm text-slate-100 mt-0.5 truncate">
          <span className={clsx(homeMark && 'text-ice')}>{f.homeTeam}</span>
          <span className="text-slate-500 mx-1.5 font-normal">–</span>
          <span className={clsx(awayMark && 'text-ice')}>{f.awayTeam}</span>
        </div>
        {f.forfeitText ? <div className="text-[11px] text-amber-300 mt-0.5">{f.forfeitText}</div> : null}
        {f.venueName && !f.forfeitText ? (
          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 min-w-0">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{f.venueName}</span>
          </div>
        ) : null}
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        {f.score ? (
          <span className="font-mono font-semibold text-sm text-white bg-canvas px-2.5 py-1 rounded-lg border border-slate-700 tabular-nums">
            {f.score}
          </span>
        ) : null}
        {!f.score || f.state === 'live' ? <StateBadge state={f.state} /> : null}
        {highlightTeamId && f.isWin ? <span className="text-[10px] font-semibold text-emerald-400">Voitto</span> : null}
        {highlightTeamId && f.isLoss ? <span className="text-[10px] font-semibold text-rose-400">Tappio</span> : null}
      </div>
    </button>
  )
}
