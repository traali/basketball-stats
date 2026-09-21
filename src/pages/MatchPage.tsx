import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Award,
  ShieldAlert,
  Trophy,
  Share2,
  Loader2,
  Users,
} from 'lucide-react'
import clsx from 'clsx'
import { QuarterScoreCard } from '../components/QuarterScoreCard'
import { TeamFoulTracker } from '../components/TeamFoulTracker'
import { BasketScorersTable } from '../components/BasketScorersTable'
import { BasketStandingsTable } from '../components/BasketStandingsTable'
import { BasketPreviewExport } from '../components/BasketPreviewExport'
import { BasketRosterCards } from '../components/BasketRosterCards'
import {
  fetchBasketMatch,
  fetchBasketGroup,
  fetchBasketTeamRoster,
  fetchBasketTeamFixtures,
  mapGroupTeamsToStandings,
} from '../services/basketApi'
import { sameDayPool } from '../utils/matchContext'
import type {
  BasketMatchDetail,
  BasketStandingRow,
  BasketRosterPlayer,
  BasketTeamFixture,
} from '../types/basketball'

type MatchTab = 'match' | 'roster' | 'points' | 'fouls' | 'standings' | 'export'

export function MatchPage() {
  const { matchId = '' } = useParams()
  const navigate = useNavigate()

  const [match, setMatch] = useState<BasketMatchDetail | null>(null)
  const [standings, setStandings] = useState<BasketStandingRow[]>([])
  const [homeRoster, setHomeRoster] = useState<BasketRosterPlayer[]>([])
  const [awayRoster, setAwayRoster] = useState<BasketRosterPlayer[]>([])
  const [homeFx, setHomeFx] = useState<BasketTeamFixture[]>([])
  const [awayFx, setAwayFx] = useState<BasketTeamFixture[]>([])
  const [activeTab, setActiveTab] = useState<MatchTab>('match')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMatch() {
      setLoading(true)
      const m = await fetchBasketMatch(matchId)

      if (m) {
        setMatch(m)
        setHomeRoster(m.homeRoster || [])
        setAwayRoster(m.awayRoster || [])
        const [group, home, away, hfx, afx] = await Promise.all([
          m.competitionId && m.categoryId && m.groupId
            ? fetchBasketGroup(m.competitionId, m.categoryId, m.groupId)
            : Promise.resolve(null),
          m.homeTeamId ? fetchBasketTeamRoster(m.homeTeamId) : Promise.resolve([]),
          m.awayTeamId ? fetchBasketTeamRoster(m.awayTeamId) : Promise.resolve([]),
          m.homeTeamId ? fetchBasketTeamFixtures(m.homeTeamId) : Promise.resolve([]),
          m.awayTeamId ? fetchBasketTeamFixtures(m.awayTeamId) : Promise.resolve([]),
        ])
        if (group) setStandings(mapGroupTeamsToStandings(group.teams, group.matches))
        if (home.length) setHomeRoster((current) => (current.length ? current : home))
        if (away.length) setAwayRoster((current) => (current.length ? current : away))
        setHomeFx(hfx)
        setAwayFx(afx)
        const startTime = m.date ? `${m.date}T${(m.time || '00:00').padEnd(5, '0')}:00` : ''
        try {
          window.parent?.postMessage(
            {
              type: 'matchday-context',
              payload: {
                eventId: m.matchId,
                sport: 'basketball',
                startTime,
                homeTeam: m.homeTeamName,
                awayTeam: m.awayTeamName,
                venueName: m.venueName,
                association: 'basket',
                externalId: m.matchId,
              },
            },
            '*',
          )
        } catch {
          /* embed parent optional */
        }
      }
      setLoading(false)
    }

    loadMatch()
  }, [matchId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-sm">Ladataan koripallo-ottelun tilastoja...</p>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-rose-400 text-sm">Ottelua ei löytynyt tunnuksella #{matchId}.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="btn-ice"
        >
          Palaa etusivulle
        </button>
      </div>
    )
  }

  const upcoming = match.phase === 'upcoming'
  const dayGames = sameDayPool(
    [homeFx, awayFx],
    match.date,
    {
      matchId: match.matchId,
      date: match.date,
      time: match.time,
      homeTeam: match.homeTeamName,
      awayTeam: match.awayTeamName,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      isHome: true,
      venueName: match.venueName,
      categoryName: match.categoryName,
      score: upcoming ? undefined : `${match.scoreHome}–${match.scoreAway}`,
    },
  )

  const tabs: Array<{ id: MatchTab; label: string; icon: typeof Calendar }> = [
    { id: 'match', label: 'Ottelukeskus', icon: Calendar },
    { id: 'roster', label: 'Kokoonpano', icon: Users },
    { id: 'points', label: 'Pistetilasto (PTS)', icon: Award },
    { id: 'fouls', label: 'Virheet & Bonus', icon: ShieldAlert },
    { id: 'standings', label: 'Sarjataulukko', icon: Trophy },
    { id: 'export', label: 'Jaa', icon: Share2 },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 min-h-11 px-3 rounded-xl bg-court hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors border border-hairline"
        >
          <ArrowLeft className="w-4 h-4" />
          Takaisin
        </button>
        <div className="flex items-center gap-3 min-w-0">
          {match.homeTeamId ? (
            <button
              type="button"
              onClick={() => navigate(`/team/${match.homeTeamId}`)}
              className="text-xs text-ice hover:underline font-semibold truncate"
            >
              {match.homeTeamName} →
            </button>
          ) : null}
          {match.awayTeamId ? (
            <button
              type="button"
              onClick={() => navigate(`/team/${match.awayTeamId}`)}
              className="text-xs text-ice hover:underline font-semibold truncate"
            >
              {match.awayTeamName} →
            </button>
          ) : null}
        </div>
      </div>

      <QuarterScoreCard
        match={match}
        onOpenHome={match.homeTeamId ? () => navigate(`/team/${match.homeTeamId}`) : undefined}
        onOpenAway={match.awayTeamId ? () => navigate(`/team/${match.awayTeamId}`) : undefined}
      />

      {dayGames.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {dayGames.map((g) => (
            <button
              key={g.matchId}
              type="button"
              onClick={() => navigate(`/match/${g.matchId}`)}
              className={clsx(
                'shrink-0 px-3 py-2 rounded-xl border text-[11px] font-semibold',
                g.matchId === match.matchId
                  ? 'border-accent bg-lane text-ice'
                  : 'border-hairline bg-court text-slate-300',
              )}
            >
              {(g.time || '').slice(0, 5) || '–'} · {g.homeTeam} {g.score || 'vs'} {g.awayTeam}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-hairline text-xs font-semibold">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-lane text-ice shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60',
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'match' && (
        <div className="space-y-6">
          <BasketRosterCards
            homeName={match.homeTeamName}
            awayName={match.awayTeamName}
            homeRoster={match.homeRoster || []}
            awayRoster={match.awayRoster || []}
            homeSeasonRoster={match.homeSeasonRoster?.length ? match.homeSeasonRoster : homeRoster}
            awaySeasonRoster={match.awaySeasonRoster?.length ? match.awaySeasonRoster : awayRoster}
            upcoming={upcoming}
            onPlayer={(id) => navigate(`/player/${id}`)}
          />
          {!upcoming && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TeamFoulTracker
                teamFoulsHome={match.teamFoulsHome}
                teamFoulsAway={match.teamFoulsAway}
                homeTeamName={match.homeTeamName}
                awayTeamName={match.awayTeamName}
              />
              <BasketScorersTable
                leaders={match.leaders}
                onPlayer={(id) => navigate(`/player/${id}`)}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'roster' && (
        <BasketRosterCards
          homeName={match.homeTeamName}
          awayName={match.awayTeamName}
          homeRoster={match.homeRoster || []}
          awayRoster={match.awayRoster || []}
          homeSeasonRoster={match.homeSeasonRoster?.length ? match.homeSeasonRoster : homeRoster}
          awaySeasonRoster={match.awaySeasonRoster?.length ? match.awaySeasonRoster : awayRoster}
          upcoming={upcoming}
          onPlayer={(id) => navigate(`/player/${id}`)}
        />
      )}

      {activeTab === 'points' && (
        <BasketScorersTable
          leaders={match.leaders}
          onPlayer={(id) => navigate(`/player/${id}`)}
        />
      )}

      {activeTab === 'fouls' && (
        <TeamFoulTracker
          teamFoulsHome={match.teamFoulsHome}
          teamFoulsAway={match.teamFoulsAway}
          homeTeamName={match.homeTeamName}
          awayTeamName={match.awayTeamName}
        />
      )}

      {activeTab === 'standings' && (
        <BasketStandingsTable standings={standings} highlightTeamId={match.homeTeamId} />
      )}

      {activeTab === 'export' && <BasketPreviewExport match={match} standings={standings} />}
    </div>
  )
}
