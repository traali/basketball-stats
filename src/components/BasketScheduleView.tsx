import React from 'react'
import type { BasketTeamFixture } from '../types/basketball'
import { Calendar, MapPin } from 'lucide-react'

interface BasketScheduleViewProps {
  fixtures: BasketTeamFixture[]
  onSelectMatch: (matchId: string) => void
  currentMatchId?: string
}

export const BasketScheduleView: React.FC<BasketScheduleViewProps> = ({
  fixtures,
  onSelectMatch,
  currentMatchId,
}) => {
  return (
    <div className="bg-[#1C2541] rounded-2xl p-5 border border-slate-700/60 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/50">
        <h3 className="font-bold text-sm tracking-wide text-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#5BC0BE]" />
          Kauden Otteluohjelma ({fixtures.length})
        </h3>
        <span className="text-xs text-slate-400">Valitse ottelu</span>
      </div>

      <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
        {fixtures.map((f) => {
          const isSelected = f.matchId === currentMatchId
          return (
            <div
              key={f.matchId}
              onClick={() => onSelectMatch(f.matchId)}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                isSelected
                  ? 'bg-[#3A506B]/40 border-[#5BC0BE] shadow-md'
                  : 'bg-[#0B132B]/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{f.date} klo {f.time}</span>
                  <span>•</span>
                  <span className="truncate max-w-[140px] text-slate-500">{f.categoryName}</span>
                </div>
                <div className="font-bold text-xs sm:text-sm text-slate-200 mt-1">
                  <span>{f.homeTeam}</span>
                  <span className="text-slate-500 mx-1.5">vs</span>
                  <span className="text-[#5BC0BE]">{f.awayTeam}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span className="truncate max-w-[200px]">{f.venueName}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {f.score ? (
                  <span className="text-xs sm:text-sm font-black text-slate-100 bg-[#1C2541] px-2.5 py-1 rounded-lg border border-slate-700">
                    {f.score}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400 px-2 py-1 rounded bg-slate-800">
                    Tuleva
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
