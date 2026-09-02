import React from 'react'
import type { BasketPlayerLeader } from '../types/basketball'
import { Award, Flame } from 'lucide-react'

interface BasketScorersTableProps {
  leaders: BasketPlayerLeader[]
}

export const BasketScorersTable: React.FC<BasketScorersTableProps> = ({ leaders }) => {
  return (
    <div className="bg-[#1C2541] rounded-2xl p-5 border border-slate-700/60 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
        <h3 className="font-bold text-sm tracking-wide text-slate-100 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          Pistetilasto & 3-Pisteen Korit
        </h3>
        <span className="text-xs text-slate-400">Pisteet (PTS)</span>
      </div>

      <div className="space-y-2">
        {leaders.map((leader, idx) => (
          <div
            key={`${leader.playerName}-${leader.teamName}-${leader.shirtNumber}`}
            className="flex items-center justify-between p-3 rounded-xl bg-[#0B132B]/60 border border-slate-800 text-xs"
          >
            <div className="flex items-center gap-3">
              <span className="w-5 text-center font-bold text-slate-500">#{idx + 1}</span>
              <div>
                <div className="font-bold text-slate-200">
                  {leader.shirtNumber ? `#${leader.shirtNumber} ` : ''}{leader.playerName}
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{leader.teamName}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              {leader.threePointers > 0 && (
                <div className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  <Flame className="w-3 h-3" />
                  <span>{leader.threePointers}x 3P</span>
                </div>
              )}
              <div className="text-right">
                <span className="font-black text-sm text-[#6FFFE9]">{leader.points}</span>
                <span className="text-[10px] text-slate-400 block">{leader.fouls} virhettä</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
