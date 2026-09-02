import React from 'react'
import { AlertCircle, ShieldAlert } from 'lucide-react'

interface TeamFoulTrackerProps {
  teamFoulsHome: number
  teamFoulsAway: number
  homeTeamName: string
  awayTeamName: string
}

export const TeamFoulTracker: React.FC<TeamFoulTrackerProps> = ({
  teamFoulsHome,
  teamFoulsAway,
  homeTeamName,
  awayTeamName,
}) => {
  return (
    <div className="bg-[#1C2541] rounded-2xl p-5 border border-slate-700/60 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
        <h3 className="font-bold text-sm tracking-wide text-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          Joukkuevirheet & Bonusheitot (5 Virhettä)
        </h3>
        <span className="text-xs text-slate-400">Virhetilanne</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Home Fouls */}
        <div className="bg-[#0B132B]/70 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
          <span className="text-xs font-semibold text-slate-400 truncate max-w-[120px]">{homeTeamName}</span>
          <div className="text-2xl font-black text-slate-100 my-2">{teamFoulsHome} / 5</div>
          <div className="flex gap-1.5 mb-2">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={`w-3 h-3 rounded-full ${
                  idx <= teamFoulsHome ? (teamFoulsHome >= 5 ? 'bg-rose-500' : 'bg-amber-400') : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
          {teamFoulsHome >= 5 && (
            <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded">
              <AlertCircle className="w-3 h-3" /> BONUSHEITOT
            </span>
          )}
        </div>

        {/* Away Fouls */}
        <div className="bg-[#0B132B]/70 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
          <span className="text-xs font-semibold text-[#5BC0BE] truncate max-w-[120px]">{awayTeamName}</span>
          <div className="text-2xl font-black text-slate-100 my-2">{teamFoulsAway} / 5</div>
          <div className="flex gap-1.5 mb-2">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={`w-3 h-3 rounded-full ${
                  idx <= teamFoulsAway ? (teamFoulsAway >= 5 ? 'bg-rose-500' : 'bg-amber-400') : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
          {teamFoulsAway >= 5 && (
            <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded">
              <AlertCircle className="w-3 h-3" /> BONUSHEITOT
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
