import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { QuarterScoreCard } from './components/QuarterScoreCard'
import { TeamFoulTracker } from './components/TeamFoulTracker'
import { BasketScorersTable } from './components/BasketScorersTable'
import { BasketScheduleView } from './components/BasketScheduleView'
import { BasketPreviewExport } from './components/BasketPreviewExport'
import { fetchBasketMatch, fetchBasketTeamFixtures } from './services/basketApi'
import type { BasketMatchDetail, BasketTeamFixture } from './types/basketball'
import { parseIncomingCrossRepoQuery } from './types/contracts'
import { Loader2, Calendar, Award, ShieldAlert, Share2 } from 'lucide-react'

type TabType = 'match' | 'points' | 'fouls' | 'schedule' | 'export'

export function App() {
  const [match, setMatch] = useState<BasketMatchDetail | null>(null)
  const [fixtures, setFixtures] = useState<BasketTeamFixture[]>([])
  const [currentMatchId, setCurrentMatchId] = useState('1011397')
  const [activeTab, setActiveTab] = useState<TabType>('match')
  const [loading, setLoading] = useState(true)

  const searchParams = new URLSearchParams(window.location.search)
  const query = parseIncomingCrossRepoQuery(searchParams)
  const isEmbed = Boolean(query.embed)

  useEffect(() => {
    if (query.targetId) {
      setCurrentMatchId(query.targetId)
    }
  }, [query.targetId])

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
      setLoading(false)
    }

    loadData()
  }, [currentMatchId])

  const handleSelectMatch = (matchId: string) => {
    setCurrentMatchId(matchId)
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

            {activeTab === 'schedule' && (
              <BasketScheduleView
                fixtures={fixtures}
                onSelectMatch={handleSelectMatch}
                currentMatchId={currentMatchId}
              />
            )}

            {activeTab === 'export' && <BasketPreviewExport match={match} />}
          </>
        ) : (
          <div className="p-8 text-center bg-[#1C2541] rounded-2xl border border-slate-700">
            <p className="text-slate-400">Ottelutietoja ei löytynyt.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
