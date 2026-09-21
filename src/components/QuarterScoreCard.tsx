import React from 'react'
import type { BasketMatchDetail } from '../types/basketball'
import { Trophy, Clock, MapPin } from 'lucide-react'

interface QuarterScoreCardProps {
  match: BasketMatchDetail
  onOpenHome?: () => void
  onOpenAway?: () => void
}

export const QuarterScoreCard: React.FC<QuarterScoreCardProps> = ({ match, onOpenHome, onOpenAway }) => {
  const upcoming = match.phase === 'upcoming'
  const live = match.phase === 'live' || match.isLive

  return (
    <div className="bg-[#1C2541] rounded-2xl p-6 border border-slate-700/60 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#5BC0BE]">
          <Trophy className="w-4 h-4" />
          <span>{match.competitionName}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">{match.categoryName}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span>{match.date} klo {match.time}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 items-center text-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-base mb-2">
            🏀
          </div>
          {onOpenHome ? (
            <button type="button" onClick={onOpenHome} className="font-bold text-base sm:text-lg text-[#6FFFE9] hover:underline">
              {match.homeTeamName}
            </button>
          ) : (
            <span className="font-bold text-base sm:text-lg text-slate-100">{match.homeTeamName}</span>
          )}
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 text-3xl sm:text-4xl font-black tracking-tight text-white">
            {upcoming ? (
              <span className="text-slate-400 text-2xl font-bold">vs</span>
            ) : (
              <>
                <span>{match.scoreHome}</span>
                <span className="text-slate-500 font-normal">:</span>
                <span>{match.scoreAway}</span>
              </>
            )}
          </div>
          <span
            className={`text-xs uppercase font-bold tracking-widest mt-1 px-3 py-1 rounded-full border ${
              live
                ? 'text-red-400 bg-red-950/40 border-red-800 animate-pulse'
                : upcoming
                  ? 'text-amber-300 bg-amber-950/40 border-amber-700/60'
                  : 'text-[#6FFFE9] bg-[#0B132B] border-slate-700'
            }`}
          >
            {live ? 'LIVE' : upcoming ? 'TULEVA OTTELU' : 'LOPPUTULOS'}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[#5BC0BE] text-base mb-2">
            🏀
          </div>
          {onOpenAway ? (
            <button type="button" onClick={onOpenAway} className="font-bold text-base sm:text-lg text-[#6FFFE9] hover:underline">
              {match.awayTeamName}
            </button>
          ) : (
            <span className="font-bold text-base sm:text-lg text-slate-100">{match.awayTeamName}</span>
          )}
        </div>
      </div>

      {!upcoming && (
        <div className="bg-[#0B132B]/80 rounded-xl p-3.5 border border-slate-800">
          <div className="grid grid-cols-5 text-center text-xs font-semibold text-slate-400 border-b border-slate-800 pb-2 mb-2">
            <span>Joukkue</span>
            <span>Q1</span>
            <span>Q2</span>
            <span>Q3</span>
            <span>Q4</span>
          </div>
          <div className="grid grid-cols-5 text-center text-xs font-bold text-slate-200 py-1">
            <span className="truncate text-left text-slate-400">{match.homeTeamName}</span>
            <span>{match.quarters[0]?.scoreHome ?? 0}</span>
            <span>{match.quarters[1]?.scoreHome ?? 0}</span>
            <span>{match.quarters[2]?.scoreHome ?? 0}</span>
            <span>{match.quarters[3]?.scoreHome ?? 0}</span>
          </div>
          <div className="grid grid-cols-5 text-center text-xs font-bold text-slate-200 py-1 border-t border-slate-800/60">
            <span className="truncate text-left text-[#5BC0BE]">{match.awayTeamName}</span>
            <span>{match.quarters[0]?.scoreAway ?? 0}</span>
            <span>{match.quarters[1]?.scoreAway ?? 0}</span>
            <span>{match.quarters[2]?.scoreAway ?? 0}</span>
            <span>{match.quarters[3]?.scoreAway ?? 0}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-500" />
          <span>{match.venueName}</span>
        </div>
        {match.spectators ? <span>Katsojia: {match.spectators}</span> : null}
      </div>
    </div>
  )
}
