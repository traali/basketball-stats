import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { QuarterScoreCard } from './components/QuarterScoreCard'
import { TeamFoulTracker } from './components/TeamFoulTracker'
import { BasketScorersTable } from './components/BasketScorersTable'
import { BasketStandingsTable } from './components/BasketStandingsTable'
import { BasketScheduleView } from './components/BasketScheduleView'
import { BasketTeamOnboarding } from './components/BasketTeamOnboarding'
import { BasketPreviewExport } from './components/BasketPreviewExport'
import { BasketRosterCards } from './components/BasketRosterCards'
import { fetchBasketMatch, fetchBasketTeamFixtures, fetchBasketStandings, fetchBasketHeroMatchId } from './services/basketApi'
import type { BasketMatchDetail, BasketTeamFixture, BasketStandingRow } from './types/basketball'
import { parseIncomingCrossRepoQuery } from './types/contracts'
import { Loader2, Calendar, Award, ShieldAlert, Share2, Trophy, PlusCircle } from 'lucide-react'
import {
  buildManualIdsSearch,
  buildSearchWithIds,
  LAST_TEAM_ID_STORAGE_KEY,
  getTeamIdFromSearch,
  isTorneopalTeamId,
  loadFavoriteTeams,
  parseBasketTeamId,
  saveFavoriteTeams,
  type FavoriteTeam,
} from './utils/favoriteTeams'

type TabType = 'match' | 'points' | 'fouls' | 'standings' | 'schedule' | 'onboarding' | 'export'

function getInitialMatchId(search: string): string {
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname
    const matchMatch = pathname.match(/\/match\/([^/]+)/)
    if (matchMatch) return decodeURIComponent(matchMatch[1])
  }
  const q = parseIncomingCrossRepoQuery(new URLSearchParams(search))
  return q.targetId || ''
}

function getInitialTeamId(search: string): string {
  const fromSearch = getTeamIdFromSearch(search)
  if (fromSearch) return fromSearch
  if (typeof window !== 'undefined') {
    return parseBasketTeamId(window.localStorage.getItem(LAST_TEAM_ID_STORAGE_KEY) || '')
  }
  return ''
}

export function App() {
  const [match, setMatch] = useState<BasketMatchDetail | null>(null)
  const [fixtures, setFixtures] = useState<BasketTeamFixture[]>([])
  const [standings, setStandings] = useState<BasketStandingRow[]>([])
  const [currentMatchId, setCurrentMatchId] = useState(() => getInitialMatchId(window.location.search))
  const [currentTeamId, setCurrentTeamId] = useState(() => getInitialTeamId(window.location.search))
  const [favoriteTeams, setFavoriteTeams] = useState<FavoriteTeam[]>(() => loadFavoriteTeams())
  const [activeTab, setActiveTab] = useState<TabType>('match')
  const [loading, setLoading] = useState(true)
  const [manualMatchId, setManualMatchId] = useState('')
  const [manualTeamId, setManualTeamId] = useState('')
  const [manualPlayerId, setManualPlayerId] = useState('')

  const searchParams = new URLSearchParams(window.location.search)
  const query = parseIncomingCrossRepoQuery(searchParams)
  const isEmbed = Boolean(query.embed)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__APP_BUILD_INFO__ = {
        version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0',
        commit: typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev',
        buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString(),
      }
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setCurrentMatchId(getInitialMatchId(window.location.search))
      setCurrentTeamId(getInitialTeamId(window.location.search))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      let fixturesData: BasketTeamFixture[] = []
      if (currentTeamId && isTorneopalTeamId(currentTeamId)) {
        fixturesData = await fetchBasketTeamFixtures(currentTeamId)
      }
      let id = currentMatchId
      if (!id && fixturesData.length) {
        id = fixturesData[0].matchId
        setCurrentMatchId(id)
      }
      if (!id) {
        id = await fetchBasketHeroMatchId()
        setCurrentMatchId(id)
      }
      const matchData = id ? await fetchBasketMatch(id) : null
      setMatch(matchData)
      setFixtures(fixturesData)
      setStandings(fetchBasketStandings())
      setLoading(false)
    }

    loadData()
  }, [currentMatchId, currentTeamId])

  const handleSelectMatch = (matchId: string) => {
    const url = new URL(window.location.href)
    const nextSearch = buildSearchWithIds(url.search, { matchId: matchId.trim() || null })
    window.history.replaceState({}, '', `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}`)
    setCurrentMatchId(matchId)
    setActiveTab('match')
  }

  const handleSelectTeam = (teamId: string) => {
    const parsedTeamId = parseBasketTeamId(teamId)
    const url = new URL(window.location.href)
    const nextSearch = buildSearchWithIds(url.search, {
      teamId: parsedTeamId || null,
      matchId: null,
    })
    if (parsedTeamId) {
      window.localStorage.setItem(LAST_TEAM_ID_STORAGE_KEY, parsedTeamId)
    } else {
      window.localStorage.removeItem(LAST_TEAM_ID_STORAGE_KEY)
    }
    window.history.replaceState({}, '', `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}`)
    setCurrentMatchId('')
    setCurrentTeamId(parsedTeamId)
    setActiveTab('match')
  }

  const handleToggleFavorite = (team: FavoriteTeam) => {
    const next = favoriteTeams.some((f) => f.id === team.id)
      ? favoriteTeams.filter((f) => f.id !== team.id)
      : [team, ...favoriteTeams.filter((f) => f.id !== team.id)]
    setFavoriteTeams(next)
    saveFavoriteTeams(next)
  }

  const favoriteTeamWarnings = favoriteTeams.filter((team) => !isTorneopalTeamId(team.id))

  const clearTeamSelection = () => {
    const url = new URL(window.location.href)
    const nextSearch = buildSearchWithIds(url.search, { teamId: null })
    window.history.replaceState({}, '', `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}`)
    setCurrentTeamId('')
  }

  const saveManualIdsToUrl = (includeTeamId = true) => {
    const url = new URL(window.location.href)
    const nextSearch = buildManualIdsSearch(url.search, {
      matchId: manualMatchId,
      teamInput: manualTeamId,
      playerId: manualPlayerId,
      includeTeamId,
    })
    window.history.replaceState({}, '', `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}`)
  }

  return (
    <div className={`min-h-screen bg-[#0B132B] text-slate-100 ${isEmbed ? 'p-2 sm:p-4' : 'pb-16'}`}>
      {!isEmbed && <Header isEmbed={isEmbed} />}

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 text-xs font-semibold scrollbar-none">
          <button
            onClick={() => setActiveTab('match')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'match'
                ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Ottelukeskus
          </button>
          <button
            onClick={() => setActiveTab('points')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'points'
                ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Pistetilasto (PTS)
          </button>
          <button
            onClick={() => setActiveTab('fouls')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'fouls'
                ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Virheet & Bonus
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'standings'
                ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Sarjataulukko
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Otteluohjelma ({fixtures.length})
          </button>
          <button
            onClick={() => setActiveTab('onboarding')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'onboarding'
                ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            Lisää joukkue
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'export'
                ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            Jaa
          </button>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Lempi joukkueet</div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {favoriteTeams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleSelectTeam(team.id)}
                className={`h-11 px-4 rounded-full border whitespace-nowrap text-sm font-semibold transition-colors ${
                  team.id === currentTeamId
                    ? 'bg-[#3A506B] border-[#6FFFE9]/40 text-[#6FFFE9]'
                    : 'bg-[#1C2541]/60 border-slate-700 text-slate-200 hover:border-slate-500'
                }`}
              >
                {team.name}
              </button>
            ))}
            {!favoriteTeams.length && <span className="text-xs text-slate-500">Ei lempijoukkueita.</span>}
          </div>
          {favoriteTeamWarnings.length > 0 && (
            <p className="text-xs text-amber-400">Lisää Basket.fi team_id</p>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#5BC0BE]" />
            <p className="text-sm">Ladataan Koripallo Basket.fi -tilastoja...</p>
          </div>
        ) : match ? (
          <>
            <QuarterScoreCard match={match} />

            {activeTab === 'match' && (
              <div className="space-y-6">
                <BasketRosterCards
                  homeName={match.homeTeamName}
                  awayName={match.awayTeamName}
                  homeRoster={match.homeRoster || []}
                  awayRoster={match.awayRoster || []}
                  homeSeasonRoster={match.homeSeasonRoster || []}
                  awaySeasonRoster={match.awaySeasonRoster || []}
                  upcoming={!match.isLive && match.scoreHome === 0 && match.scoreAway === 0}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TeamFoulTracker
                    teamFoulsHome={match.teamFoulsHome}
                    teamFoulsAway={match.teamFoulsAway}
                    homeTeamName={match.homeTeamName}
                    awayTeamName={match.awayTeamName}
                  />
                  <BasketScorersTable leaders={match.leaders} />
                </div>
              </div>
            )}

            {activeTab === 'points' && (
              <div className="space-y-6">
                <BasketScorersTable leaders={match.leaders} />
              </div>
            )}

            {activeTab === 'fouls' && (
              <div className="space-y-6">
                <TeamFoulTracker
                  teamFoulsHome={match.teamFoulsHome}
                  teamFoulsAway={match.teamFoulsAway}
                  homeTeamName={match.homeTeamName}
                  awayTeamName={match.awayTeamName}
                />
              </div>
            )}

            {activeTab === 'standings' && (
              <BasketStandingsTable
                standings={standings}
                highlightTeamId={currentTeamId}
              />
            )}

            {activeTab === 'schedule' && (
              <BasketScheduleView
                fixtures={fixtures}
                onSelectMatch={handleSelectMatch}
                currentMatchId={currentMatchId}
              />
            )}

            {activeTab === 'onboarding' && (
              <BasketTeamOnboarding
                currentTeamId={currentTeamId}
                favoriteTeams={favoriteTeams}
                onToggleFavorite={handleToggleFavorite}
                onSelectTeam={handleSelectTeam}
              />
            )}

            {activeTab === 'export' && <BasketPreviewExport match={match} standings={standings} />}
          </>
        ) : (
          <div className="p-6 sm:p-8 text-center bg-[#1C2541] rounded-2xl border border-slate-700 space-y-5">
            <p className="text-slate-400">Ottelutietoja ei löytynyt.</p>
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Lempi joukkueet</div>
              <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {favoriteTeams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => handleSelectTeam(team.id)}
                    className="h-11 px-4 rounded-full border border-slate-700 bg-[#0B132B]/60 whitespace-nowrap text-sm font-semibold text-slate-200"
                  >
                    {team.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Ottelu-id</label>
                <input
                  value={manualMatchId}
                  onChange={(e) => setManualMatchId(e.target.value)}
                  className="h-11 w-full px-3 rounded-xl bg-[#0B132B] border border-slate-700 text-xs text-white font-mono"
                  placeholder="1011397"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Joukkue-id</label>
                <input
                  value={manualTeamId}
                  onChange={(e) => setManualTeamId(e.target.value)}
                  className="h-11 w-full px-3 rounded-xl bg-[#0B132B] border border-slate-700 text-xs text-white font-mono"
                  placeholder="20053"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Pelaaja-id</label>
                <input
                  value={manualPlayerId}
                  onChange={(e) => setManualPlayerId(e.target.value)}
                  className="h-11 w-full px-3 rounded-xl bg-[#0B132B] border border-slate-700 text-xs text-white font-mono"
                  placeholder="9835"
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => {
                  if (manualMatchId.trim()) {
                    clearTeamSelection()
                    saveManualIdsToUrl(false)
                    handleSelectMatch(manualMatchId.trim())
                  }
                }}
                className="h-11 px-4 rounded-xl bg-[#3A506B] text-[#6FFFE9] text-xs font-semibold"
              >
                Avaa ottelu
              </button>
              <button
                onClick={() => {
                  const parsed = parseBasketTeamId(manualTeamId)
                  if (parsed && isTorneopalTeamId(parsed)) {
                    saveManualIdsToUrl()
                    handleSelectTeam(parsed)
                  }
                }}
                className="h-11 px-4 rounded-xl bg-[#3A506B] text-[#6FFFE9] text-xs font-semibold"
              >
                Avaa joukkue
              </button>
              <button
                onClick={saveManualIdsToUrl}
                className="h-11 px-4 rounded-xl bg-[#3A506B] text-[#6FFFE9] text-xs font-semibold"
              >
                Tallenna id:t
              </button>
            </div>
          </div>
        )}

        <footer className="mt-8 pt-4 border-t border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">Basketball Stats</span>
            <span>•</span>
            <span
              data-testid="app-version-badge"
              className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-mono text-[10px] text-orange-400"
            >
              v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'} (git:{typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev'})
            </span>
          </div>
          <div className="text-[10px] opacity-75">
            Koripallotilastot & Tulospalvelu
          </div>
        </footer>
      </main>
    </div>
  )
}

export default App
