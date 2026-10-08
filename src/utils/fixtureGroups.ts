import type { BasketTeamFixture } from '../types/basketball'

const byKickoff = (a: BasketTeamFixture, b: BasketTeamFixture) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)

/**
 * Split games by what TASO actually says. A past-dated "Fixture" is never
 * upcoming, a walkover is never upcoming or 0–0.
 */
export function splitFixtures(list: BasketTeamFixture[]) {
  // Today: live games and games whose kickoff passed without a result yet.
  const live = list.filter((f) => f.state === 'live' || f.state === 'awaiting').sort(byKickoff)
  const upcoming = list.filter((f) => f.state === 'upcoming').sort(byKickoff)
  const played = list.filter((f) => f.state === 'played' || f.state === 'forfeit').sort((a, b) => byKickoff(b, a))
  const other = list
    .filter((f) => !['live', 'awaiting', 'upcoming', 'played', 'forfeit'].includes(f.state))
    .sort((a, b) => byKickoff(b, a))
  return { live, upcoming, played, other }
}

/** Seasons present in the data (TASO competition_season), newest first. */
export function teamSeasons(list: BasketTeamFixture[]): string[] {
  return [...new Set(list.map((f) => f.season).filter((s): s is string => Boolean(s)))].sort().reverse()
}
