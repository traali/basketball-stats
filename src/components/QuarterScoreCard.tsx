import type { BasketMatchDetail } from '../types/basketball'
import { Clock, MapPin, Trophy } from 'lucide-react'
import { teamInitials } from '../utils/teamInitials'
import clsx from 'clsx'

interface QuarterScoreCardProps {
  match: BasketMatchDetail
  onOpenHome?: () => void
  onOpenAway?: () => void
}

export function QuarterScoreCard({ match, onOpenHome, onOpenAway }: QuarterScoreCardProps) {
  const upcoming = match.phase === 'upcoming'
  const live = match.phase === 'live' || match.isLive

  return (
    <div className="bg-court rounded-2xl p-5 border border-hairline space-y-5">
      <div className="flex items-center justify-between border-b border-hairline pb-3 gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-accent min-w-0">
          <Trophy className="w-4 h-4 shrink-0" />
          <span className="truncate">{match.competitionName}</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400 truncate">{match.categoryName}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0 tabular-nums">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {match.date} {match.time}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 items-center text-center gap-2">
        <TeamSide name={match.homeTeamName} onOpen={onOpenHome} />

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 text-3xl sm:text-4xl font-semibold tracking-tight text-white tabular-nums">
            {upcoming ? (
              <span className="text-slate-400 text-xl font-medium">vs</span>
            ) : (
              <>
                <span>{match.scoreHome}</span>
                <span className="text-slate-500 font-normal">–</span>
                <span>{match.scoreAway}</span>
              </>
            )}
          </div>
          <span
            className={clsx(
              'text-[10px] uppercase font-semibold tracking-widest mt-2 px-3 py-1 rounded-full border',
              live && 'text-rose-300 bg-rose-950/40 border-rose-800',
              upcoming && 'text-slate-300 bg-canvas border-hairline',
              !live && !upcoming && 'text-ice bg-canvas border-hairline',
            )}
          >
            {live ? 'Live' : upcoming ? 'Tuleva' : 'Lopputulos'}
          </span>
        </div>

        <TeamSide name={match.awayTeamName} onOpen={onOpenAway} away />
      </div>

      {!upcoming && (
        <div className="bg-canvas/80 rounded-xl p-3 border border-hairline">
          <div className="grid grid-cols-5 text-center text-[11px] font-semibold text-slate-400 border-b border-hairline pb-2 mb-2">
            <span className="text-left">Joukkue</span>
            <span>Q1</span>
            <span>Q2</span>
            <span>Q3</span>
            <span>Q4</span>
          </div>
          <div className="grid grid-cols-5 text-center text-xs font-semibold text-slate-200 py-1 tabular-nums">
            <span className="truncate text-left text-slate-400 pr-1">{match.homeTeamName}</span>
            <span>{match.quarters[0]?.scoreHome ?? 0}</span>
            <span>{match.quarters[1]?.scoreHome ?? 0}</span>
            <span>{match.quarters[2]?.scoreHome ?? 0}</span>
            <span>{match.quarters[3]?.scoreHome ?? 0}</span>
          </div>
          <div className="grid grid-cols-5 text-center text-xs font-semibold text-slate-200 py-1 border-t border-hairline/60 tabular-nums">
            <span className="truncate text-left text-accent pr-1">{match.awayTeamName}</span>
            <span>{match.quarters[0]?.scoreAway ?? 0}</span>
            <span>{match.quarters[1]?.scoreAway ?? 0}</span>
            <span>{match.quarters[2]?.scoreAway ?? 0}</span>
            <span>{match.quarters[3]?.scoreAway ?? 0}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">{match.venueName}</span>
        </div>
        {match.spectators ? <span className="tabular-nums">Katsojia: {match.spectators}</span> : null}
      </div>
    </div>
  )
}

function TeamSide({ name, onOpen, away }: { name: string; onOpen?: () => void; away?: boolean }) {
  return (
    <div className="flex flex-col items-center min-w-0">
      <div
        className={clsx(
          'w-12 h-12 rounded-full bg-canvas border border-hairline flex items-center justify-center font-semibold text-sm mb-2 tabular-nums',
          away ? 'text-accent' : 'text-ice',
        )}
      >
        {teamInitials(name)}
      </div>
      {onOpen ? (
        <button type="button" onClick={onOpen} className="font-semibold text-sm sm:text-base text-ice hover:underline truncate max-w-full">
          {name}
        </button>
      ) : (
        <span className="font-semibold text-sm sm:text-base text-slate-100 truncate max-w-full">{name}</span>
      )}
    </div>
  )
}
