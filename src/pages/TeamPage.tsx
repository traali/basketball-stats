import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Trophy,
  Users,
  Loader2,
  CheckCircle2,
  Heart,
} from 'lucide-react'
import clsx from 'clsx'
import {
  fetchBasketTeamProfile,
  fetchBasketGroup,
  pickCurrentGroup,
  mapGroupTeamsToStandings,
} from '../services/basketApi'
import type {
  BasketStandingRow,
  BasketTeamProfile,
} from '../types/basketball'
import { BasketStandingsTable } from '../components/BasketStandingsTable'
import { useFavorites } from '../hooks/useFavorites'
import { writeLastTeamId } from '../utils/teamSelection'

type TeamTab = 'schedule' | 'roster' | 'standings'
type SeasonScope = 'syksy' | 'kevat' | 'all'

export function TeamPage() {
  const { teamId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isFavorite, toggle } = useFavorites()

  const [profile, setProfile] = useState<BasketTeamProfile | null>(null)
  const [standings, setStandings] = useState<BasketStandingRow[]>([])
  const [loading, setLoading] = useState(true)

  // Season filter: default is current season (Syksy 2026)
  const [selectedSeason, setSelectedSeason] = useState<SeasonScope>('syksy')
  const [selectedYear, setSelectedYear] = useState<string>('2026')

  const initialTab = (searchParams.get('tab') as TeamTab) || 'schedule'
  const [activeTab, setActiveTab] = useState<TeamTab>(initialTab)

  useEffect(() => {
    async function loadTeam() {
      setLoading(true)
      const p = await fetchBasketTeamProfile(teamId)
      if (p) {
        setProfile(p)
        const current = pickCurrentGroup(p.groups)
        if (current) {
          const detail = await fetchBasketGroup(current.competitionId, current.categoryId, current.groupId)
          if (detail) setStandings(mapGroupTeamsToStandings(detail.teams, detail.matches))
        }
      }
      setLoading(false)
    }

    loadTeam()
  }, [teamId])

  useEffect(() => {
    writeLastTeamId(teamId)
  }, [teamId])

  const handleTabChange = (tab: TeamTab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  // Filter fixtures according to selected season & year
  const filteredFixtures = useMemo(() => {
    if (!profile?.fixtures) return []
    return profile.fixtures.filter((f) => {
      if (selectedSeason === 'all') {
        return f.date.startsWith(selectedYear)
      }
      return f.date.startsWith(selectedYear) && f.seasonHalf === selectedSeason
    })
  }, [profile?.fixtures, selectedSeason, selectedYear])

  const upcomingMatches = useMemo(() => {
    return filteredFixtures
      .filter((f) => !f.score)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  }, [filteredFixtures])

  const playedMatches = useMemo(() => {
    return filteredFixtures
      .filter((f) => Boolean(f.score))
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  }, [filteredFixtures])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#5BC0BE]" />
        <p className="text-sm">Ladataan joukkueen koripallotilastoja...</p>
      </div>
    )
  }

  const teamName = profile?.teamName || `Joukkue #${teamId}`
  const categoryName = profile?.categoryName || 'Basket.fi Basket'
  const fav = isFavorite('team', teamId)

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-6">
      {/* Header with Back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-xl bg-[#1C2541] hover:bg-slate-800 text-slate-300 transition-colors border border-slate-700/80"
          aria-label="Takaisin etusivulle"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white">{teamName}</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Basket.fi
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {profile?.clubName ? `${profile.clubName} • ` : ''}{categoryName}
          </p>
          {profile?.clubId ? (
            <button
              type="button"
              onClick={() => navigate(`/club/${profile.clubId}`)}
              className="text-[11px] font-semibold text-[#6FFFE9] mt-1"
            >
              Avaa seura →
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() =>
            toggle({
              kind: 'team',
              id: teamId,
              name: teamName,
              subtitle: [profile?.clubName, categoryName].filter(Boolean).join(' · '),
            })
          }
          className={`p-2 rounded-full border shrink-0 ${fav ? 'border-rose-400 text-rose-400' : 'border-slate-700 text-slate-400'}`}
          aria-label={fav ? 'Poista suosikeista' : 'Lisää suosikkeihin'}
        >
          <Heart className={`w-5 h-5 ${fav ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Season & Half Selector (Syksy 2026, Kevät 2026, Koko vuosi) */}
      <div className="bg-[#1C2541] rounded-2xl p-3 sm:p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
            Kausi:
          </span>
          <button
            type="button"
            onClick={() => { setSelectedSeason('syksy'); setSelectedYear('2026') }}
            className={clsx(
              'text-xs px-3 py-1.5 rounded-xl font-bold transition-all',
              selectedSeason === 'syksy' && selectedYear === '2026'
                ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md border border-[#5BC0BE]/40'
                : 'text-slate-400 hover:text-slate-200 bg-[#0B132B]'
            )}
          >
            Syksy 2026
          </button>
          <button
            type="button"
            onClick={() => { setSelectedSeason('kevat'); setSelectedYear('2026') }}
            className={clsx(
              'text-xs px-3 py-1.5 rounded-xl font-bold transition-all',
              selectedSeason === 'kevat' && selectedYear === '2026'
                ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md border border-[#5BC0BE]/40'
                : 'text-slate-400 hover:text-slate-200 bg-[#0B132B]'
            )}
          >
            Kevät 2026
          </button>
          <button
            type="button"
            onClick={() => { setSelectedSeason('all'); setSelectedYear('2026') }}
            className={clsx(
              'text-xs px-3 py-1.5 rounded-xl font-bold transition-all',
              selectedSeason === 'all'
                ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md border border-[#5BC0BE]/40'
                : 'text-slate-400 hover:text-slate-200 bg-[#0B132B]'
            )}
          >
            Koko vuosi
          </button>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          {filteredFixtures.length} ottelua valittuna
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1 text-xs font-semibold">
        <button
          onClick={() => handleTabChange('schedule')}
          className={clsx(
            'flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all',
            activeTab === 'schedule'
              ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          )}
        >
          <Calendar className="w-3.5 h-3.5" />
          Ottelut ({filteredFixtures.length})
        </button>
        <button
          onClick={() => handleTabChange('roster')}
          className={clsx(
            'flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all',
            activeTab === 'roster'
              ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          )}
        >
          <Users className="w-3.5 h-3.5" />
          Kokoonpano ({profile?.players?.length || 0})
        </button>
        <button
          onClick={() => handleTabChange('standings')}
          className={clsx(
            'flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all',
            activeTab === 'standings'
              ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          )}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          Sarjataulukko
        </button>
      </div>

      {/* Tab 1: Ottelut (Upcoming & Played) */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Upcoming Matches */}
          {upcomingMatches.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#5BC0BE] animate-pulse" />
                Tulevat ottelut ({upcomingMatches.length})
              </h3>
              <div className="space-y-2">
                {upcomingMatches.map((m) => (
                  <div
                    key={m.matchId}
                    onClick={() => navigate(`/match/${m.matchId}`)}
                    className="p-3.5 rounded-2xl bg-[#1C2541] border border-slate-800 hover:border-[#5BC0BE]/70 transition-all cursor-pointer flex items-center justify-between shadow-sm group"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span className="font-semibold text-slate-300">{m.date}</span>
                        <span>•</span>
                        <span>klo {m.time ? m.time.slice(0, 5) : 'Ilmoitetaan'}</span>
                        <span>•</span>
                        <span className="truncate max-w-[140px] text-slate-500">{m.categoryName}</span>
                      </div>
                      <div className="font-bold text-xs sm:text-sm text-slate-100 group-hover:text-[#6FFFE9] transition-colors mt-1">
                        <span className={m.isHome ? 'text-[#6FFFE9]' : ''}>{m.homeTeam}</span>
                        <span className="text-slate-500 mx-2 font-normal">vs</span>
                        <span className={!m.isHome ? 'text-[#6FFFE9]' : ''}>{m.awayTeam}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-[#5BC0BE]" />
                        <span className="truncate max-w-[240px]">{m.venueName}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs font-bold text-[#6FFFE9] bg-[#3A506B]/40 px-3 py-1.5 rounded-xl border border-[#5BC0BE]/30">
                        Ennakko →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Played Matches */}
          {playedMatches.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Pelatut ottelut ({playedMatches.length})
              </h3>
              <div className="space-y-2">
                {playedMatches.map((m) => (
                  <div
                    key={m.matchId}
                    onClick={() => navigate(`/match/${m.matchId}`)}
                    className="p-3.5 rounded-2xl bg-[#1C2541] border border-slate-800 hover:border-[#5BC0BE]/70 transition-all cursor-pointer flex items-center justify-between shadow-sm group"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{m.date}</span>
                        <span>•</span>
                        <span className="truncate max-w-[140px] text-slate-500">{m.categoryName}</span>
                      </div>
                      <div className="font-bold text-xs sm:text-sm text-slate-100 group-hover:text-[#6FFFE9] transition-colors mt-1">
                        <span className={m.isHome ? 'text-[#6FFFE9]' : ''}>{m.homeTeam}</span>
                        <span className="text-slate-500 mx-2 font-normal">vs</span>
                        <span className={!m.isHome ? 'text-[#6FFFE9]' : ''}>{m.awayTeam}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span className="truncate max-w-[240px]">{m.venueName}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className="font-mono font-black text-sm sm:text-base text-white bg-[#0B132B] px-3 py-1 rounded-xl border border-slate-700">
                        {m.score}
                      </span>
                      {m.isWin && (
                        <span className="text-[10px] font-bold text-emerald-400">Voitto (V)</span>
                      )}
                      {m.isLoss && (
                        <span className="text-[10px] font-bold text-rose-400">Tappio (H)</span>
                      )}
                      {m.isDraw && (
                        <span className="text-[10px] font-bold text-amber-400">Tasapeli (T)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredFixtures.length === 0 && (
            <div className="py-12 text-center bg-[#1C2541] rounded-2xl border border-slate-800 text-slate-400 text-xs">
              Ei otteluita valitulle kaudelle ({selectedSeason === 'syksy' ? 'Syksy 2026' : selectedSeason === 'kevat' ? 'Kevät 2026' : '2026'}).
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Kokoonpano (Roster) */}
      {activeTab === 'roster' && (
        <div className="bg-[#1C2541] rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-sm text-white">
              Joukkueen Pelaajat & Tehopisteet ({profile?.players?.length || 0})
            </h3>
            <span className="text-xs text-slate-400">PTS · AST · 3P · Virheet</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-[#0B132B]/60 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Pelaaja</th>
                  <th className="py-2.5 px-3 text-center">Synt.</th>
                  <th className="py-2.5 px-3 text-right">PTS</th>
                  <th className="py-2.5 px-3 text-right">AST</th>
                  <th className="py-2.5 px-3 text-right font-bold text-[#6FFFE9]">3P</th>
                  <th className="py-2.5 px-3 text-right">Virheet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(profile?.players || []).map((p) => (
                  <tr key={p.playerId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-300">
                      {p.shirtNumber ? `#${p.shirtNumber}` : '-'}
                    </td>
                    <td
                      className="py-2.5 px-3 font-semibold text-white cursor-pointer hover:text-[#6FFFE9]"
                      onClick={() => navigate(`/player/${p.playerId}`)}
                    >
                      {p.fullName}
                      {p.isCaptain && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          C
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-400">{p.birthYear || '-'}</td>
                    <td className="py-2.5 px-3 text-right text-slate-200">{p.points}</td>
                    <td className="py-2.5 px-3 text-right text-slate-200">{p.assists}</td>
                    <td className="py-2.5 px-3 text-right font-black text-[#6FFFE9]">{p.threePointers}</td>
                    <td className="py-2.5 px-3 text-right text-slate-400">{p.fouls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Sarjataulukko */}
      {activeTab === 'standings' && (
        <BasketStandingsTable
          standings={standings}
          highlightTeamId={teamId}
        />
      )}
    </div>
  )
}
