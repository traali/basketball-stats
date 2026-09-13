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
import {
  fetchBasketMatch,
  fetchBasketMatchesByPlayer,
  fetchBasketMatchesByTeam,
  fetchBasketStandings,
  parseBasketResourceFromLocation,
  type BasketResource,
} from './services/basketApi'
import type { BasketMatchDetail, BasketTeamFixture, BasketStandingRow } from './types/basketball'
import { parseIncomingCrossRepoQuery } from './types/contracts'
import { Loader2, Calendar, Award, ShieldAlert, Share2, Trophy, PlusCircle } from 'lucide-react'

type TabType = 'match' | 'points' | 'fouls' | 'standings' | 'schedule' | 'onboarding' | 'export'

function getNowInHelsinki() {
  const date = new Date()
  const day = date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Helsinki' })
  const time = date.toLocaleTimeString('sv-SE', {
    timeZone: 'Europe/Helsinki',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return { day, time }
}

function fixtureStatus(f: BasketTeamFixture): string {
  return String(f.status || '').toLowerCase()
}

function chooseHeroMatchId(fixtures: BasketTeamFixture[]): string {
  if (!fixtures.length) return ''
  const { day: today, time: nowTime } = getNowInHelsinki()

  const liveToday = fixtures.find((f) => f.date === today && fixtureStatus(f) === 'live' && f.matchId)
  if (liveToday?.matchId) return liveToday.matchId

  const upcoming = fixtures
    .filter((f) => {
      const status = fixtureStatus(f)
      const time = (f.time || '').slice(0, 5)
      const futureDate = f.date > today
      const futureToday = f.date === today && (!time || time >= nowTime)
      return f.matchId && (status === 'fixture' || status === 'upcoming' || futureDate || futureToday)
    })
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  if (upcoming[0]?.matchId) return upcoming[0].matchId

  const played = fixtures
    .filter((f) => f.matchId && (fixtureStatus(f) === 'played' || Boolean(f.score)))
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
  if (played[0]?.matchId) return played[0].matchId

  return fixtures[0]?.matchId || ''
}

export function App() {
  const [match, setMatch] = useState<BasketMatchDetail | null>(null)
  const [fixtures, setFixtures] = useState<BasketTeamFixture[]>([])
  const [standings, setStandings] = useState<BasketStandingRow[]>([])
  const [currentResource, setCurrentResource] = useState<BasketResource>(() => parseBasketResourceFromLocation(window.location.href))
  const [currentMatchId, setCurrentMatchId] = useState(() => (currentResource.kind === 'match' ? currentResource.id : ''))
  const [currentTeamId, setCurrentTeamId] = useState(() => (currentResource.kind === 'team' ? currentResource.id : ''))
  const [, setCurrentPlayerId] = useState(() => (currentResource.kind === 'player' ? currentResource.id : ''))
  const [manualMatchId, setManualMatchId] = useState('')
  const [manualTeamId, setManualTeamId] = useState('')
  const [manualPlayerId, setManualPlayerId] = useState('')
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
      const parsed = parseBasketResourceFromLocation(window.location.href)
      setCurrentResource(parsed)
      setCurrentMatchId(parsed.kind === 'match' ? parsed.id : '')
      setCurrentTeamId(parsed.kind === 'team' ? parsed.id : '')
      setCurrentPlayerId(parsed.kind === 'player' ? parsed.id : '')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setStandings(fetchBasketStandings())

      if (currentResource.kind === 'match') {
        const matchData = await fetchBasketMatch(currentResource.id)
        setMatch(matchData)
        setFixtures([])
        if (matchData?.homeTeamId) setCurrentTeamId(matchData.homeTeamId)
        setCurrentMatchId(currentResource.id)
        setLoading(false)
        return
      }

      if (currentResource.kind === 'team') {
        const fixturesData = await fetchBasketMatchesByTeam(currentResource.id)
        const heroMatchId = chooseHeroMatchId(fixturesData)
        const matchData = heroMatchId ? await fetchBasketMatch(heroMatchId) : null
        setFixtures(fixturesData)
        setMatch(matchData)
        setCurrentTeamId(currentResource.id)
        setCurrentMatchId(heroMatchId)
        setLoading(false)
        return
      }

      if (currentResource.kind === 'player') {
        const playerFixtures = await fetchBasketMatchesByPlayer(currentResource.id)
        const heroMatchId = chooseHeroMatchId(playerFixtures)
        const matchData = heroMatchId ? await fetchBasketMatch(heroMatchId) : null
        setFixtures(playerFixtures)
        setMatch(matchData)
        setCurrentPlayerId(currentResource.id)
        setCurrentMatchId(heroMatchId)
        if (matchData?.homeTeamId) setCurrentTeamId(matchData.homeTeamId)
        setLoading(false)
        return
      }

      setMatch(null)
      setFixtures([])
      setCurrentMatchId('')
      setLoading(false)
    }

    loadData()
  }, [currentResource])

  const handleSelectMatch = (matchId: string) => {
    setCurrentMatchId(matchId)
    setCurrentResource({ kind: 'match', id: matchId })
    setActiveTab('match')
  }

  const handleSelectTeam = (teamId: string) => {
    setCurrentTeamId(teamId)
    setCurrentResource({ kind: 'team', id: teamId })
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
                onSelectTeam={handleSelectTeam}
              />
            )}

            {activeTab === 'export' && <BasketPreviewExport match={match} standings={standings} />}
          </>
        ) : currentResource.kind === 'none' ? (
          <div className="p-6 sm:p-8 bg-[#1C2541] rounded-2xl border border-slate-700 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Aloita oikealla ID:llä</h3>
              <p className="text-sm text-slate-400">
                Anna Ottelu-id, Joukkue-id tai Pelaaja-id URL-parametrina tai syöttämällä arvo alle.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-xs text-slate-300">
                <span>Ottelu-id</span>
                <input
                  value={manualMatchId}
                  onChange={(e) => setManualMatchId(e.target.value)}
                  placeholder="esim. 1012345"
                  className="w-full px-3 py-2 rounded-lg bg-[#0B132B] border border-slate-700 text-slate-100"
                />
              </label>
              <label className="space-y-1 text-xs text-slate-300">
                <span>Joukkue-id</span>
                <input
                  value={manualTeamId}
                  onChange={(e) => setManualTeamId(e.target.value)}
                  placeholder="esim. 20053"
                  className="w-full px-3 py-2 rounded-lg bg-[#0B132B] border border-slate-700 text-slate-100"
                />
              </label>
              <label className="space-y-1 text-xs text-slate-300">
                <span>Pelaaja-id</span>
                <input
                  value={manualPlayerId}
                  onChange={(e) => setManualPlayerId(e.target.value)}
                  placeholder="esim. 9835"
                  className="w-full px-3 py-2 rounded-lg bg-[#0B132B] border border-slate-700 text-slate-100"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => manualMatchId.trim() && setCurrentResource({ kind: 'match', id: manualMatchId.trim() })}
                className="px-3 py-2 rounded-lg bg-[#3A506B] text-[#6FFFE9] text-xs font-semibold"
              >
                Avaa ottelu
              </button>
              <button
                type="button"
                onClick={() => manualTeamId.trim() && setCurrentResource({ kind: 'team', id: manualTeamId.trim() })}
                className="px-3 py-2 rounded-lg bg-[#3A506B] text-[#6FFFE9] text-xs font-semibold"
              >
                Avaa joukkue
              </button>
              <button
                type="button"
                onClick={() => manualPlayerId.trim() && setCurrentResource({ kind: 'player', id: manualPlayerId.trim() })}
                className="px-3 py-2 rounded-lg bg-[#3A506B] text-[#6FFFE9] text-xs font-semibold"
              >
                Avaa pelaaja
              </button>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <p>Esimerkit:</p>
              <p className="font-mono">/match/1012345</p>
              <p className="font-mono">?teamId=20053</p>
              <p className="font-mono">?playerId=9835</p>
              <p className="font-mono">?url=https://tulospalvelu.basket.fi/team/?team_id=20053</p>
            </div>
          </div>
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
