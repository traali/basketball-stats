import { useNavigate } from 'react-router-dom'
import type { BasketStandingRow } from '../types/basketball'

interface BasketStandingsTableProps {
  standings: BasketStandingRow[]
  highlightTeamId?: string
}

function formClass(f: 'V' | 'T' | 'H') {
  if (f === 'V') return 'bg-emerald-500/20 text-emerald-400'
  if (f === 'T') return 'bg-amber-500/20 text-amber-400'
  return 'bg-rose-500/20 text-rose-400'
}

export function BasketStandingsTable({ standings, highlightTeamId }: BasketStandingsTableProps) {
  const navigate = useNavigate()
  const showDraws = standings.some((row) => (row.draws || 0) > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Sarjataulukko & Kuntopuntari</h3>
          <p className="text-xs text-slate-400">Koripalloliiton virallinen sarjataulukko (Voitto 2p, Tappio 1p)</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Basket.fi</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#1C2541]/40 backdrop-blur-md">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#1C2541]/80 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3 w-8 text-center">#</th>
              <th className="py-2.5 px-3">Joukkue</th>
              <th className="py-2.5 px-2 text-center">O</th>
              <th className="py-2.5 px-2 text-center">V</th>
              {showDraws ? <th className="py-2.5 px-2 text-center">T</th> : null}
              <th className="py-2.5 px-2 text-center">H</th>
              <th className="py-2.5 px-3 text-center">Korit</th>
              <th className="py-2.5 px-2 text-center">Ero</th>
              <th className="py-2.5 px-3 text-center font-bold text-[#6FFFE9]">Pisteet</th>
              <th className="py-2.5 px-3 text-center">Kunto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {standings.map((row) => {
              const isHighlighted = row.teamId === highlightTeamId
              return (
                <tr
                  key={row.teamId}
                  className={`transition-colors cursor-pointer ${isHighlighted ? 'bg-amber-500/10 font-bold' : 'hover:bg-slate-800/30'}`}
                  onClick={() => row.teamId && navigate(`/team/${row.teamId}`)}
                >
                  <td className="py-2.5 px-3 text-center font-mono text-slate-400">{row.rank}</td>
                  <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap hover:text-[#6FFFE9]">{row.teamName}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-slate-300">{row.matchesPlayed}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-emerald-400">{row.wins}</td>
                  {showDraws ? (
                    <td className="py-2.5 px-2 text-center font-mono text-amber-400">{row.draws || 0}</td>
                  ) : null}
                  <td className="py-2.5 px-2 text-center font-mono text-rose-400">{row.losses}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                    {row.pointsFor} - {row.pointsAgainst}
                  </td>
                  <td className={`py-2.5 px-2 text-center font-mono ${row.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {row.diff > 0 ? `+${row.diff}` : row.diff}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-black text-[#6FFFE9] text-sm">
                    {row.totalPoints}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {row.form.map((f, i) => (
                        <span
                          key={i}
                          className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${formClass(f)}`}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
