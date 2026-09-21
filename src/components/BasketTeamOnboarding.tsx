import { useState } from 'react'
import type { CustomBasketTeam } from '../types/basketball'
import { Plus, Trash2, Shield, CheckCircle2 } from 'lucide-react'

interface BasketTeamOnboardingProps {
  onSelectTeam: (teamId: string, teamName: string) => void
  currentTeamId: string
}

const STORAGE_KEY = 'basket_custom_teams'

const defaultTeams: CustomBasketTeam[] = [
  { id: 'honka-u14', name: 'Tapiolan Honka U14', category: 'U14 Pojat Aluesarja', addedAt: new Date().toISOString() },
  { id: 'lepy-u14', name: 'LePy Oranssi U14', category: 'U14 Pojat Aluesarja', addedAt: new Date().toISOString() },
  { id: 'hnmky-u14', name: 'HNMKY White U14', category: 'U14 Pojat 1-divisioona', addedAt: new Date().toISOString() },
  { id: 'topo-u14', name: 'ToPo Juniorit', category: 'U14 Pojat SM-sarja', addedAt: new Date().toISOString() },
]

export function BasketTeamOnboarding({ onSelectTeam, currentTeamId }: BasketTeamOnboardingProps) {
  const [teams, setTeams] = useState<CustomBasketTeam[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultTeams))
    } catch (e) {
      console.warn('Failed to load custom basket teams', e)
    }
    return defaultTeams
  })

  const [teamName, setTeamName] = useState('')
  const [category, setCategory] = useState('')
  const [basketUrlOrId, setBasketUrlOrId] = useState('')
  const [savedSuccess, setSavedSuccess] = useState(false)

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) return

    let resolvedId = teamName.toLowerCase().replace(/\s+/g, '-')
    if (basketUrlOrId.trim()) {
      const urlMatch = basketUrlOrId.match(/(?:team_id|joukkue|id)=([a-zA-Z0-9_-]+)/)
      resolvedId = urlMatch ? urlMatch[1] : basketUrlOrId.trim()
    }

    const newTeam: CustomBasketTeam = {
      id: resolvedId,
      name: teamName.trim(),
      category: category.trim() || 'Koripalloliitto Aluesarja',
      addedAt: new Date().toISOString(),
    }

    const updated = [newTeam, ...teams.filter(t => t.id !== resolvedId)]
    setTeams(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.warn('Failed to persist custom team', e)
    }

    setTeamName('')
    setCategory('')
    setBasketUrlOrId('')
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)

    onSelectTeam(newTeam.id, newTeam.name)
  }

  const handleRemoveTeam = (id: string) => {
    const updated = teams.filter(t => t.id !== id)
    setTeams(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.warn('Failed to update custom teams', e)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-white">Lisää oma koripallojoukkue tai turnaus</h3>
        <p className="text-xs text-slate-400">
          Syötä oman joukkueesi nimi, sarja tai liitä suora Basket.fi-tulospalvelulinkki seurantaa varten.
        </p>
      </div>

      <form onSubmit={handleAddTeam} className="p-4 sm:p-5 rounded-2xl bg-court/60 border border-hairline space-y-4 backdrop-blur-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Joukkueen nimi *</label>
            <input
              type="text"
              required
              placeholder="esim. Tapiolan Honka U14"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-slate-700 text-white text-xs focus:outline-none focus:border-ice transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Ikäluokka / Sarja</label>
            <input
              type="text"
              placeholder="esim. U14 Pojat Aluesarja"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-slate-700 text-white text-xs focus:outline-none focus:border-ice transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Basket.fi-linkki tai Joukkue-ID (valinnainen)</label>
          <input
            type="text"
            placeholder="https://tulospalvelu.basket.fi/team/12345 tai ID"
            value={basketUrlOrId}
            onChange={(e) => setBasketUrlOrId(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-slate-700 text-white text-xs focus:outline-none focus:border-ice transition-colors font-mono"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-lane hover:bg-lane text-ice font-bold text-xs shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Tallenna joukkue
          </button>

          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Joukkue lisätty onnistuneesti!
            </div>
          )}
        </div>
      </form>

      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Tallennetut Joukkueet & Sarjat</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {teams.map((team) => {
            const isSelected = team.id === currentTeamId
            return (
              <div
                key={team.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all backdrop-blur-md ${
                  isSelected
                    ? 'bg-lane/20 border-ice/40 shadow-md'
                    : 'bg-court/40 border-hairline hover:border-slate-700'
                }`}
              >
                <div
                  onClick={() => onSelectTeam(team.id, team.name)}
                  className="space-y-0.5 cursor-pointer flex-1"
                >
                  <div className="flex items-center gap-2">
                    <Shield className={`w-3.5 h-3.5 ${isSelected ? 'text-ice' : 'text-slate-500'}`} />
                    <span className="text-sm font-bold text-white">{team.name}</span>
                    {isSelected && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-ice/20 text-ice font-semibold">
                        Aktiivinen
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 pl-5">{team.category}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveTeam(team.id)}
                  className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors"
                  title="Poista tallennettu joukkue"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
