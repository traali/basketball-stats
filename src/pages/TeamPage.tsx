import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Trophy, Users, Loader2, Heart } from 'lucide-react'
import clsx from 'clsx'
import { fetchBasketTeamProfile, fetchBasketGroup, pickCurrentGroup, mapGroupTeamsToStandings } from '../services/basketApi'
import type { BasketStandingRow, BasketTeamFixture, BasketTeamProfile } from '../types/basketball'
import { BasketStandingsTable } from '../components/BasketStandingsTable'
import { MatchRow } from '../components/MatchRow'
import { LoadError } from '../components/LoadError'
import { FederationLink } from '../components/FederationLink'
import { federationTeamUrl } from '../utils/federationLinks'
import { useFavorites } from '../hooks/useFavorites'
import { writeLastTeamId } from '../utils/teamSelection'
import { splitFixtures, teamSeasons } from '../utils/fixtureGroups'

type TeamTab = 'schedule' | 'roster' | 'standings'

export function TeamPage() {
  const { teamId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isFavorite, toggle } = useFavorites()

  const [profile, setProfile] = useState<BasketTeamProfile | null>(null)
  const [standings, setStandings] = useState<BasketStandingRow[]>([])
  const [standingsFailed, setStandingsFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [season, setSeason] = useState<string>('')

  const initialTab = (searchParams.get('tab') as TeamTab) || 'schedule'
  const [activeTab, setActiveTab] = useState<TeamTab>(initialTab)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    let p: BasketTeamProfile | null = null
    try {
      p = await fetchBasketTeamProfile(teamId)
    } catch {
      setFailed(true)
      setLoading(false)
      return
    }
    setProfile(p)
    setLoading(false)
    const current = p ? pickCurrentGroup(p.groups) : null
    if (p) setSeason(current?.seasonId || teamSeasons(p.fixtures)[0] || '')
    if (current) {
      try {
        const detail = await fetchBasketGroup(current.competitionId, current.categoryId, current.groupId)
        if (detail) setStandings(mapGroupTeamsToStandings(detail.teams, detail.matches))
      } catch {
        setStandingsFailed(true)
      }
    }
  }, [teamId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    writeLastTeamId(teamId)
  }, [teamId])

  const handleTabChange = (tab: TeamTab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const seasons = useMemo(() => teamSeasons(profile?.fixtures || []), [profile?.fixtures])
  const inSeason = useMemo<BasketTeamFixture[]>(
    () => (profile?.fixtures || []).filter((f) => !season || f.season === season),
    [profile?.fixtures, season],
  )
  const groups = useMemo(() => splitFixtures(inSeason), [inSeason])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-sm">Ladataan joukkuetta…</p>
      </div>
    )
  }

  if (failed) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <LoadError what={`Joukkuetta #${teamId}`} onRetry={() => void load()} />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-sm text-rose-400">
        Basket.fi:ssä ei ole joukkuetta tunnuksella #{teamId}.
      </div>
    )
  }

  const teamName = profile.teamName
  const fav = isFavorite('team', teamId)

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-5">
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-xl bg-court hover:bg-slate-800 text-slate-300 transition-colors border border-hairline"
          aria-label="Takaisin"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">{teamName}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {[profile.clubName, profile.categoryName].filter(Boolean).join(' · ')}
          </p>
          {profile.clubId ? (
            <button
              type="button"
              onClick={() => navigate(`/club/${profile.clubId}`)}
              className="text-xs font-semibold text-ice mt-1 min-h-11"
            >
              Seuran joukkueet →
            </button>
          ) : null}
          <div>
            <FederationLink href={federationTeamUrl(teamId)} label="Joukkue Basket.fi-tulospalvelussa" />
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            toggle({
              kind: 'team',
              id: teamId,
              name: teamName,
              subtitle: [profile.clubName, profile.categoryName].filter(Boolean).join(' · '),
            })
          }
          className={`p-2.5 rounded-full border shrink-0 ${fav ? 'border-rose-400 text-rose-400' : 'border-slate-700 text-slate-400'}`}
          aria-label={fav ? 'Poista suosikeista' : 'Lisää suosikkeihin'}
        >
          <Heart className={`w-5 h-5 ${fav ? 'fill-current' : ''}`} />
        </button>
      </div>

      {seasons.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {seasons.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeason(s)}
              className={clsx('chip whitespace-nowrap', season === s && 'chip-active')}
            >
              Kausi {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 border-b border-hairline pb-1 text-xs font-semibold overflow-x-auto">
        {(
          [
            { id: 'schedule', label: `Ottelut (${inSeason.length})`, icon: Calendar },
            { id: 'roster', label: `Pelaajat (${profile.players.length})`, icon: Users },
            { id: 'standings', label: 'Sarjataulukko', icon: Trophy },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3.5 min-h-11 rounded-xl transition-all whitespace-nowrap',
              activeTab === t.id ? 'bg-lane text-ice' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60',
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'schedule' && (
        <div className="space-y-5">
          {(
            [
              ['Tänään', groups.live],
              ['Tulevat', groups.upcoming],
              ['Pelatut', groups.played],
              ['Muut', groups.other],
            ] as const
          ).map(([title, list]) =>
            list.length ? (
              <section key={title} className="space-y-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {title} ({list.length})
                </h2>
                {list.map((f) => (
                  <MatchRow key={f.matchId} fixture={f} highlightTeamId={teamId} onOpen={(id) => navigate(`/match/${id}`)} />
                ))}
              </section>
            ) : null,
          )}
          {inSeason.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              Basket.fi:ssä ei ole tämän joukkueen otteluita{season ? ` kaudella ${season}` : ''}.
            </p>
          )}
        </div>
      )}

      {activeTab === 'roster' && (
        <div className="bg-court rounded-2xl p-4 border border-hairline space-y-3">
          <p className="text-xs text-slate-400">
            Pelaajalista Basket.fi:stä. Pisteet näkyvät kunkin ottelun sivulla, kun pöytäkirja on tallennettu.
          </p>
          {profile.players.length === 0 ? (
            <p className="text-sm text-slate-500">Basket.fi ei näytä tälle joukkueelle pelaajalistaa.</p>
          ) : (
            <ul className="divide-y divide-hairline/60">
              {[...profile.players]
                .sort((a, b) => Number(a.shirtNumber || 999) - Number(b.shirtNumber || 999))
                .map((p) => (
                  <li key={p.playerId || p.fullName}>
                    <button
                      type="button"
                      disabled={!p.playerId}
                      onClick={() => navigate(`/player/${p.playerId}`)}
                      className="w-full flex items-center justify-between gap-3 py-2.5 min-h-11 text-left"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-8 font-mono text-slate-400 text-xs">{p.shirtNumber ? `#${p.shirtNumber}` : ''}</span>
                        <span className="font-semibold text-sm text-white truncate">{p.fullName}</span>
                        {p.isCaptain ? (
                          <span className="text-[9px] font-bold px-1 rounded bg-amber-500/20 text-amber-300">C</span>
                        ) : null}
                      </span>
                      <span className="text-xs text-slate-500">{p.birthYear || ''}</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'standings' &&
        (standingsFailed ? (
          <LoadError what="Sarjataulukkoa" onRetry={() => void load()} />
        ) : (
          <BasketStandingsTable standings={standings} highlightTeamId={teamId} />
        ))}
    </div>
  )
}
