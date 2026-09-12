import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { QuarterScoreCard } from './components/QuarterScoreCard'
import { TeamFoulTracker } from './components/TeamFoulTracker'
import { BasketScorersTable } from './components/BasketScorersTable'
import { BasketStandingsTable } from './components/BasketStandingsTable'
import { BasketScheduleView } from './components/BasketScheduleView'
import { BasketTeamOnboarding } from './components/BasketTeamOnboarding'
import { BasketPreviewExport } from './components/BasketPreviewExport'
import { fetchBasketMatch, fetchBasketTeamFixtures, fetchBasketStandings } from './services/basketApi'
import type { BasketMatchDetail, BasketTeamFixture, BasketStandingRow } from './types/basketball'
import { parseIncomingCrossRepoQuery } from './types/contracts'
import { Loader2, Calendar, Award, ShieldAlert, Share2, Trophy, PlusCircle } from 'lucide-react'

type TabType = 'match' | 'points' | 'fouls' | 'standings' | 'schedule' | 'onboarding' | 'export'

function getInitialMatchId(search: string): string {
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname
    const matchMatch = pathname.match(/\/match\/([^/]+)/)
    if (matchMatch) return decodeURIComponent(matchMatch[1])
  }
  const q = parseIncomingCrossRepoQuery(new URLSearchParams(search))
  return q.targetId || '1011397'
}

export function App() {
  const [match, setMatch] = useState<BasketMatchDetail | null>(null)
  const [fixtures, setFixtures] = useState<BasketTeamFixture[]>([])
  const [standings, setStandings] = useState<BasketStandingRow[]>([])
  const [currentMatchId, setCurrentMatchId] = useState(() => getInitialMatchId(window.location.search))
  const [currentTeamId, setCurrentTeamId] = useState('honka-u14')
  const [activeTab, setActiveTab] = useState<TabType>('match')
  const [loading, setLoading] = useState(true)

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
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [matchData, fixturesData] = await Promise.all([
        fetchBasketMatch(currentMatchId),
        fetchBasketTeamFixtures('etekp2627'),
      ])

      if (matchData) {
        setMatch(matchData)
      }
      setFixtures(fixturesData)
      setStandings(fetchBasketStandings())
      setLoading(false)
    }

    loadData()
  }, [currentMatchId, currentTeamId])

  const handleSelectMatch = (matchId: string) => {
    setCurrentMatchId(matchId)
    setActiveTab('match')
  }

  const handleSelectTeam = (teamId: string) => {
    setCurrentTeamId(teamId)
    setActiveTab('match')
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#5BC0BE]" />
            <p className="text-sm">Ladataan Koripallo Basket.fi -tilastoja...</p>
          </div>
        ) : match ? (
          <>
            <QuarterScoreCard match={match} />

            {activeTab === 'match' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TeamFoulTracker
                  teamFoulsHome={match.teamFoulsHome}
                  teamFoulsAway={match.teamFoulsAway}
                  homeTeamName={match.homeTeamName}
                  awayTeamName={match.awayTeamName}
                />
                <BasketScorersTable leaders={match.leaders} />
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
                onSelectTeam={handleSelectTeam}
              />
            )}

            {activeTab === 'export' && <BasketPreviewExport match={match} standings={standings} />}
          </>
        ) : (
          <div className="p-8 text-center bg-[#1C2541] rounded-2xl border border-slate-700">
            <p className="text-slate-400">Ottelutietoja ei löytynyt.</p>
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
