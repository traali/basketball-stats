import React from 'react'
import type { BasketPlayerLeader } from '../types/basketball'
import { Award } from 'lucide-react'

interface BasketScorersTableProps {
  leaders: BasketPlayerLeader[]
  onPlayer?: (playerId: string) => void
}

/** Points and fouls from the game lineup; 3P counted from scoring events when TASO has them. */
export const BasketScorersTable: React.FC<BasketScorersTableProps> = ({ leaders, onPlayer }) => {
  const showThrees = leaders.some((l) => l.threePointers !== null)
  return (
    <div className="bg-court rounded-2xl p-4 sm:p-5 border border-hairline space-y-3">
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <h3 className="font-semibold text-sm tracking-wide text-slate-100 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          Pistetilasto
        </h3>
        <span className="text-[11px] text-slate-400">Basket.fi-pöytäkirja</span>
      </div>

      {leaders.length === 0 ? (
        <p className="text-xs text-slate-500 py-4 text-center">Tästä ottelusta ei ole pelaajakohtaisia pisteitä Basket.fi:ssä.</p>
      ) : (
        <table className="w-full text-xs tabular-nums">
          <thead className="text-[11px] text-slate-400">
            <tr>
              <th className="text-left font-semibold pb-1.5">Pelaaja</th>
              <th className="text-right font-semibold pb-1.5 w-10">PTS</th>
              {showThrees ? <th className="text-right font-semibold pb-1.5 w-10">3P</th> : null}
              <th className="text-right font-semibold pb-1.5 w-10">Virh.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline/60">
            {leaders.map((leader) => {
              const clickable = Boolean(leader.playerId && onPlayer)
              return (
                <tr key={`${leader.playerId || leader.playerName}-${leader.teamName}-${leader.shirtNumber}`}>
                  <td className="py-2 pr-2 min-w-0">
                    <button
                      type="button"
                      disabled={!clickable}
                      onClick={() => leader.playerId && onPlayer?.(leader.playerId)}
                      className={`text-left font-semibold ${clickable ? 'text-ice' : 'text-slate-200'} disabled:cursor-default`}
                    >
                      {leader.shirtNumber ? `#${leader.shirtNumber} ` : ''}
                      {leader.playerName}
                    </button>
                    <div className="text-[10px] text-slate-500 truncate">{leader.teamName}</div>
                  </td>
                  <td className="py-2 text-right font-semibold text-ice text-sm">{leader.points}</td>
                  {showThrees ? <td className="py-2 text-right text-slate-300">{leader.threePointers ?? ''}</td> : null}
                  <td className="py-2 text-right text-slate-400">{leader.fouls ?? ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
