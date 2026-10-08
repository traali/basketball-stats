/**
 * One place that decides what a Basket.fi (TASO) game row is allowed to show.
 *
 * Verified against real koripallo-api.torneopal.net data on 2026-10-08
 * (see docs/DATA_FIELDS.md and tests/fixtures):
 * - Only status "Played" carries a final score. The single-game call sends
 *   fs_A/fs_B "0"/"0" for unplayed games; the list call sends "".
 * - Some past games stay "Fixture" forever (no result was ever reported).
 * - Walkovers: the list call says status "Forfeited", the single-game call
 *   says "Played" with walkover=1 and forfeit_A/forfeit_B = "match".
 * - "Live"/"Break" can be left behind on old games; only today counts as live.
 */
import { helsinkiDateISO, isKickoffUpcoming } from './matchContext.ts'

export type MatchState =
  | 'played'
  | 'forfeit'
  | 'live'
  | 'upcoming'
  | 'unscheduled'
  | 'unreported'
  | 'unconfirmed'
  | 'postponed'
  | 'cancelled'

export type Side = 'home' | 'away'

export interface RawMatchLike {
  status?: unknown
  date?: unknown
  time?: unknown
  walkover?: unknown
  forfeit_A?: unknown
  forfeit_B?: unknown
  fs_A?: unknown
  fs_B?: unknown
  winner?: unknown
  [key: string]: unknown
}

const LIVE_STATUSES = new Set(['live', 'break', 'halftime', 'half-time', 'overtime', 'periodbreak'])
const POSTPONED_STATUSES = new Set(['reschedule', 'rescheduled', 'postponed', 'delayed'])
const CANCELLED_STATUSES = new Set(['cancelled', 'canceled', 'abandoned', 'void'])

function text(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

/** A score number only when the field really has digits. "" and missing stay undefined. */
export function scoreValue(v: unknown): number | undefined {
  const s = text(v)
  if (!/^\d+$/.test(s)) return undefined
  return Number(s)
}

export function forfeitedBy(m: RawMatchLike): Side | undefined {
  if (text(m.forfeit_A)) return 'home'
  if (text(m.forfeit_B)) return 'away'
  return undefined
}

export function isForfeit(m: RawMatchLike): boolean {
  const st = text(m.status).toLowerCase()
  return st === 'forfeited' || st === 'forfeit' || text(m.walkover) === '1' || Boolean(forfeitedBy(m))
}

export function winnerSide(m: RawMatchLike): Side | undefined {
  const w = text(m.winner).toLowerCase()
  if (w === 'home' || w === 'a') return 'home'
  if (w === 'away' || w === 'b') return 'away'
  const by = forfeitedBy(m)
  if (by) return by === 'home' ? 'away' : 'home'
  return undefined
}

export function classifyMatch(m: RawMatchLike, now = new Date()): MatchState {
  const st = text(m.status).toLowerCase()
  const date = text(m.date)
  const time = text(m.time)
  if (isForfeit(m)) return 'forfeit'
  if (st === 'played' || st === 'finished' || st === 'final') return 'played'
  if (CANCELLED_STATUSES.has(st)) return 'cancelled'
  if (POSTPONED_STATUSES.has(st)) return 'postponed'
  if (LIVE_STATUSES.has(st)) {
    return date === helsinkiDateISO(now) ? 'live' : 'unconfirmed'
  }
  if (!date) return 'unscheduled'
  if (isKickoffUpcoming(date, time, now)) return 'upcoming'
  return 'unreported'
}

/** Scores we may print. Only played games, and live games of today. */
export function visibleScore(
  m: RawMatchLike,
  state: MatchState = classifyMatch(m),
): { home: number; away: number } | undefined {
  if (state !== 'played' && state !== 'live') return undefined
  const home = scoreValue(m.fs_A)
  const away = scoreValue(m.fs_B)
  if (home === undefined || away === undefined) return undefined
  return { home, away }
}

export const STATE_LABEL: Record<MatchState, string> = {
  played: 'Lopputulos',
  forfeit: 'Luovutus',
  live: 'Live',
  upcoming: 'Tuleva',
  unscheduled: 'Aika avoin',
  unreported: 'Ei tulosta',
  unconfirmed: 'Tulos vahvistamatta',
  postponed: 'Siirretty',
  cancelled: 'Peruttu',
}

export const STATE_HINT: Record<MatchState, string> = {
  played: '',
  forfeit: 'Ottelu ratkesi luovutuksella, sitä ei pelattu.',
  live: 'Ottelu on käynnissä.',
  upcoming: '',
  unscheduled: 'Basket.fi ei ole vielä julkaissut ottelun aikaa.',
  unreported: 'Ottelun aika on mennyt, mutta Basket.fi:ssä ei ole tulosta.',
  unconfirmed: 'Ottelu jäi Basket.fi:ssä keskeneräiseksi. Lopputulosta ei ole vahvistettu.',
  postponed: 'Ottelu on merkitty siirrettäväksi. Uutta aikaa ei ole julkaistu.',
  cancelled: 'Ottelu on peruttu.',
}

export function forfeitText(homeTeam: string, awayTeam: string, m: RawMatchLike): string {
  const by = forfeitedBy(m)
  if (by === 'home') return `${homeTeam} luovutti`
  if (by === 'away') return `${awayTeam} luovutti`
  const w = winnerSide(m)
  if (w === 'home') return `${homeTeam} voitti luovutuksella`
  if (w === 'away') return `${awayTeam} voitti luovutuksella`
  return 'Luovutus'
}

export interface PeriodScore {
  /** 1–4 are quarters, 5 is overtime. */
  quarter: number
  scoreHome: number | null
  scoreAway: number | null
  winner?: Side
}

/**
 * Per-period scores straight from p{n}s_A / p{n}s_B. A blank side stays null,
 * a period with both sides blank is left out. Nothing is filled with 0.
 */
export function periodScores(m: RawMatchLike): PeriodScore[] {
  const out: PeriodScore[] = []
  for (let q = 1; q <= 5; q++) {
    const home = scoreValue(m[`p${q}s_A`])
    const away = scoreValue(m[`p${q}s_B`])
    if (home === undefined && away === undefined) continue
    const w = text(m[`p${q}_winner`]).toUpperCase()
    out.push({
      quarter: q,
      scoreHome: home ?? null,
      scoreAway: away ?? null,
      winner: w === 'A' ? 'home' : w === 'B' ? 'away' : undefined,
    })
  }
  return out
}
