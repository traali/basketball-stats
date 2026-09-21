import { AlertCircle, ShieldAlert } from 'lucide-react'
import clsx from 'clsx'

interface TeamFoulTrackerProps {
  teamFoulsHome: number
  teamFoulsAway: number
  homeTeamName: string
  awayTeamName: string
}

export function TeamFoulTracker({
  teamFoulsHome,
  teamFoulsAway,
  homeTeamName,
  awayTeamName,
}: TeamFoulTrackerProps) {
  return (
    <div className="bg-court rounded-2xl p-5 border border-hairline space-y-4">
      <div className="flex items-center justify-between border-b border-hairline pb-3 gap-2">
        <h3 className="font-semibold text-sm tracking-wide text-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-accent" />
          Joukkuevirheet
        </h3>
        <span className="text-[11px] text-slate-400">Bonus 5. virheestä</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FoulLane name={homeTeamName} fouls={teamFoulsHome} />
        <FoulLane name={awayTeamName} fouls={teamFoulsAway} accent />
      </div>
    </div>
  )
}

function FoulLane({ name, fouls, accent }: { name: string; fouls: number; accent?: boolean }) {
  const bonus = fouls >= 5
  return (
    <div className="bg-canvas/70 p-4 rounded-xl border border-hairline flex flex-col items-center">
      <span className={clsx('text-xs font-semibold truncate max-w-full', accent ? 'text-accent' : 'text-slate-400')}>
        {name}
      </span>
      <div className="text-2xl font-semibold text-slate-100 my-2 tabular-nums">{fouls} / 5</div>
      <div className="flex gap-1.5 mb-2">
        {[1, 2, 3, 4, 5].map((idx) => (
          <div
            key={idx}
            className={clsx(
              'w-3.5 h-3.5 rounded-full',
              idx <= fouls ? (bonus ? 'bg-rose-500' : 'bg-accent') : 'bg-slate-700',
            )}
          />
        ))}
      </div>
      {bonus && (
        <span className="text-[10px] font-semibold text-rose-300 flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-full">
          <AlertCircle className="w-3 h-3" />
          Bonusheitot
        </span>
      )}
    </div>
  )
}
