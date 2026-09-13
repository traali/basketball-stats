import { useState } from 'react'
import { Pin, PinOff, Shield, CheckCircle2 } from 'lucide-react'
import { parseBasketTeamId, isTorneopalTeamId } from '../utils/favoriteTeams'
import type { FavoriteTeam } from '../utils/favoriteTeams'

interface BasketTeamOnboardingProps {
  onSelectTeam: (teamId: string) => void
  favoriteTeams: FavoriteTeam[]
  onToggleFavorite: (team: FavoriteTeam) => void
  currentTeamId: string
}

export function BasketTeamOnboarding({ onSelectTeam, favoriteTeams, onToggleFavorite, currentTeamId }: BasketTeamOnboardingProps) {
  const [teamName, setTeamName] = useState('')
  const [teamIdInput, setTeamIdInput] = useState('')
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [inputWarning, setInputWarning] = useState('')

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault()
    const resolvedId = parseBasketTeamId(teamIdInput)
    if (!teamName.trim() || !resolvedId) {
      setInputWarning('Lisää Basket.fi team_id')
      return
    }
    if (!isTorneopalTeamId(resolvedId)) {
      setInputWarning('Lisää Basket.fi team_id')
      return
    }
    setInputWarning('')
    const newTeam: FavoriteTeam = {
      id: resolvedId,
      name: teamName.trim(),
    }
    onToggleFavorite(newTeam)
    onSelectTeam(newTeam.id)

    setTeamName('')
    setTeamIdInput('')
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-white">Lisää lempijoukkue</h3>
        <p className="text-xs text-slate-400">
          Tallenna suoraan Basket.fi team_id:llä, jotta ottelut voidaan hakea Torneopalista.
        </p>
      </div>

      <form onSubmit={handleAddTeam} className="p-4 sm:p-5 rounded-2xl bg-[#1C2541]/60 border border-slate-800 space-y-4 backdrop-blur-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Joukkueen nimi *</label>
            <input
              type="text"
              required
              placeholder="esim. Tapiolan Honka U14"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#0B132B] border border-slate-700 text-white text-xs focus:outline-none focus:border-[#6FFFE9] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Basket.fi team_id *</label>
            <input
              type="text"
              required
              placeholder="esim. 20053 tai ...team_id=20053"
              value={teamIdInput}
              onChange={(e) => setTeamIdInput(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#0B132B] border border-slate-700 text-white text-xs focus:outline-none focus:border-[#6FFFE9] transition-colors font-mono"
            />
          </div>
        </div>
        {inputWarning && <p className="text-xs text-amber-400">{inputWarning}</p>}

        <div className="flex items-center justify-between pt-1">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3A506B] hover:bg-[#486382] text-[#6FFFE9] font-bold text-xs shadow-lg transition-all"
          >
            <Pin className="w-4 h-4" />
            Kiinnitä joukkue
          </button>

          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Joukkue tallennettu!
            </div>
          )}
        </div>
      </form>

      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Lempi joukkueet</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {favoriteTeams.map((team) => {
            const isSelected = team.id === currentTeamId
            const invalidTeamId = !isTorneopalTeamId(team.id)
            return (
              <div
              key={team.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all backdrop-blur-md ${
                  isSelected
                    ? 'bg-[#3A506B]/20 border-[#6FFFE9]/40 shadow-md'
                    : 'bg-[#1C2541]/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  onClick={() => onSelectTeam(team.id, team.name)}
                  className="space-y-0.5 cursor-pointer flex-1"
                >
                  <div className="flex items-center gap-2">
                    <Shield className={`w-3.5 h-3.5 ${isSelected ? 'text-[#6FFFE9]' : 'text-slate-500'}`} />
                    <span className="text-sm font-bold text-white">{team.name}</span>
                    {isSelected && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#6FFFE9]/20 text-[#6FFFE9] font-semibold">
                        Aktiivinen
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 pl-5 font-mono">ID: {team.id}</p>
                  {invalidTeamId && <p className="text-xs text-amber-400 pl-5">Lisää Basket.fi team_id</p>}
                </div>

                <button
                  type="button"
                  onClick={() => onToggleFavorite(team)}
                  className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors"
                  title="Poista lempijoukkueista"
                >
                  <PinOff className="w-4 h-4" />
                </button>
              </div>
            )
          })}
          {!favoriteTeams.length && (
            <div className="p-3 rounded-xl border border-slate-800 bg-[#1C2541]/30 text-xs text-slate-400">
              Ei vielä lempijoukkueita.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
