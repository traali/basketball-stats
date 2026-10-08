import clsx from 'clsx'
import type { MatchState } from '../utils/matchStatus'
import { STATE_LABEL } from '../utils/matchStatus'

const TONE: Record<MatchState, string> = {
  played: 'text-ice border-hairline',
  forfeit: 'text-amber-300 border-amber-700/50',
  live: 'text-rose-300 border-rose-800 bg-rose-950/40',
  upcoming: 'text-slate-300 border-hairline',
  unscheduled: 'text-slate-400 border-hairline',
  awaiting: 'text-slate-300 border-hairline',
  unreported: 'text-slate-400 border-hairline',
  unconfirmed: 'text-amber-300 border-amber-700/50',
  postponed: 'text-amber-300 border-amber-700/50',
  cancelled: 'text-slate-400 border-hairline',
}

export function StateBadge({ state, className }: { state: MatchState; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-block text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap',
        TONE[state],
        className,
      )}
    >
      {STATE_LABEL[state]}
    </span>
  )
}
