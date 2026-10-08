import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Award, Trophy, Share2, Loader2, Users } from 'lucide-react'
import clsx from 'clsx'
import { QuarterScoreCard } from '../components/QuarterScoreCard'
import { BasketScorersTable } from '../components/BasketScorersTable'
import { BasketStandingsTable } from '../components/BasketStandingsTable'
import { BasketPreviewExport } from '../components/BasketPreviewExport'
import { BasketRosterCards } from '../components/BasketRosterCards'
import { LoadError } from '../components/LoadError'
import { FederationLink } from '../components/FederationLink'
import { federationMatchUrl } from '../utils/federationLinks'
import {
  fetchBasketMatch,
  fetchBasketGroup,
  fetchBasketTeamRoster,
  fetchBasketTeamFixtures,
  mapGroupTeamsToStandings,
} from '../services/basketApi'
import { sameDayPool } from '../utils/matchContext'
import { formatGameClock } from '../utils/formatFi'
import type { BasketMatchDetail, BasketStandingRow, BasketRosterPlayer, BasketTeamFixture } from '../types/basketball'

type MatchTab = 'match' | 'roster' | 'points' | 'standings' | 'export'

function settled<T>(r: PromiseSettledResult<T>, fallback: T): T {
  return r.status === 'fulfilled' ? r.value : fallback
}

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
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    let m: BasketMatchDetail | null = null
    try {
      m = await fetchBasketMatch(matchId)
    } catch {
      setFailed(true)
      setLoading(false)
      return
    }
    setMatch(m)
    setLoading(false)
    if (!m) return
    const [group, home, away, hfx, afx] = await Promise.allSettled([
      m.competitionId && m.categoryId && m.groupId
        ? fetchBasketGroup(m.competitionId, m.categoryId, m.groupId)
        : Promise.resolve(null),
      m.homeTeamId && !m.homeRoster.length ? fetchBasketTeamRoster(m.homeTeamId) : Promise.resolve([]),
      m.awayTeamId && !m.awayRoster.length ? fetchBasketTeamRoster(m.awayTeamId) : Promise.resolve([]),
      m.homeTeamId ? fetchBasketTeamFixtures(m.homeTeamId) : Promise.resolve([]),
      m.awayTeamId ? fetchBasketTeamFixtures(m.awayTeamId) : Promise.resolve([]),
    ])
    const g = settled(group, null)
    if (g) setStandings(mapGroupTeamsToStandings(g.teams, g.matches))
    setHomeRoster(settled(home, []))
    setAwayRoster(settled(away, []))
    setHomeFx(settled(hfx, []))
    setAwayFx(settled(afx, []))
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
  }, [matchId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-sm">Ladataan ottelua…</p>
      </div>
    )
  }

  if (failed) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <LoadError what={`Ottelua #${matchId}`} onRetry={() => void load()} />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-rose-400 text-sm">Basket.fi:ssä ei ole ottelua tunnuksella #{matchId}.</p>
        <button type="button" onClick={() => navigate('/')} className="btn-ice">
          Palaa etusivulle
        </button>
      </div>
    )
  }

  const dayGames = sameDayPool([homeFx, awayFx], match.date, {
    matchId: match.matchId,
    date: match.date,
    time: match.time,
    homeTeam: match.homeTeamName,
    awayTeam: match.awayTeamName,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    isHome: true,
    state: match.phase,
    venueName: match.venueName,
    categoryName: match.categoryName,
    score: match.scoreHome !== null && match.scoreAway !== null ? `${match.scoreHome}–${match.scoreAway}` : undefined,
  })

  const tabs: Array<{ id: MatchTab; label: string; icon: typeof Calendar }> = [
    { id: 'match', label: 'Ottelu', icon: Calendar },
    { id: 'roster', label: 'Kokoonpano', icon: Users },
    ...(match.leaders.length ? [{ id: 'points' as const, label: 'Pisteet', icon: Award }] : []),
    { id: 'standings', label: 'Sarjataulukko', icon: Trophy },
    { id: 'export', label: 'Jaa', icon: Share2 },
  ]

  const roster = (
    <BasketRosterCards
      homeName={match.homeTeamName}
      awayName={match.awayTeamName}
      homeRoster={match.homeRoster}
      awayRoster={match.awayRoster}
      homeSeasonRoster={homeRoster}
      awaySeasonRoster={awayRoster}
      onPlayer={(id) => navigate(`/player/${id}`)}
    />
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-5">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 min-h-11 px-3 rounded-xl bg-court hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors border border-hairline"
      >
        <ArrowLeft className="w-4 h-4" />
        Takaisin
      </button>

      <QuarterScoreCard
        match={match}
        onOpenHome={match.homeTeamId ? () => navigate(`/team/${match.homeTeamId}`) : undefined}
        onOpenAway={match.awayTeamId ? () => navigate(`/team/${match.awayTeamId}`) : undefined}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 -mt-2">
        {match.competitionId && match.categoryId && match.groupId ? (
          <button
            type="button"
            onClick={() => navigate(`/group/${match.competitionId}/${match.categoryId}/${match.groupId}`)}
            className="text-xs font-semibold text-ice min-h-11"
          >
            Lohkon ottelut ja taulukko →
          </button>
        ) : (
          <span />
        )}
        <FederationLink href={federationMatchUrl(match.matchId)} label="Ottelu Basket.fi-tulospalvelussa" />
      </div>

      {dayGames.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {dayGames.map((g) => (
            <button
              key={g.matchId}
              type="button"
              onClick={() => navigate(`/match/${g.matchId}`)}
              className={clsx(
                'shrink-0 px-3 py-2 rounded-xl border text-[11px] font-semibold min-h-11',
                g.matchId === match.matchId ? 'border-accent bg-lane text-ice' : 'border-hairline bg-court text-slate-300',
              )}
            >
              {formatGameClock(g.time) || '–'} · {g.homeTeam} {g.score || '–'} {g.awayTeam}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 pb-1 border-b border-hairline text-xs font-semibold overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3.5 min-h-11 rounded-xl transition-all whitespace-nowrap',
              activeTab === tab.id ? 'bg-lane text-ice' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60',
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'match' && (
        <div className="space-y-5">
          {match.leaders.length > 0 && (
            <BasketScorersTable leaders={match.leaders} onPlayer={(id) => navigate(`/player/${id}`)} />
          )}
          {roster}
        </div>
      )}

      {activeTab === 'roster' && roster}

      {activeTab === 'points' && (
        <BasketScorersTable leaders={match.leaders} onPlayer={(id) => navigate(`/player/${id}`)} />
      )}

      {activeTab === 'standings' && (
        <BasketStandingsTable standings={standings} highlightTeamId={match.homeTeamId} />
      )}

      {activeTab === 'export' && <BasketPreviewExport match={match} standings={standings} />}
    </div>
  )
}
