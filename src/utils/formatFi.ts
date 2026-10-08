/**
 * Finnish date/time text. TASO sends date "YYYY-MM-DD" and time "HH:MM:SS"
 * already in Helsinki local time (time_zone "Europe/Helsinki"), so these are
 * formatted as-is — never shifted through the device's own time zone.
 */
import { helsinkiDateISO, helsinkiStamp } from './matchContext.ts'

const WEEKDAYS = ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la']

function parts(date: string): { y: number; m: number; d: number } | null {
  const hit = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date || ''))
  if (!hit) return null
  return { y: Number(hit[1]), m: Number(hit[2]), d: Number(hit[3]) }
}

/** "la 4.10." this year, "la 4.10.2025" other years, "" when no date. */
export function formatGameDay(date: string, now = new Date()): string {
  const p = parts(date)
  if (!p) return ''
  const weekday = WEEKDAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()]
  const thisYear = Number(helsinkiDateISO(now).slice(0, 4))
  return `${weekday} ${p.d}.${p.m}.${p.y === thisYear ? '' : p.y}`
}

/** "18.45" from "18:45:00"; "" when missing. */
export function formatGameClock(time: string): string {
  const hit = /^(\d{1,2}):(\d{2})/.exec(String(time || '').trim())
  if (!hit) return ''
  return `${hit[1].padStart(2, '0')}.${hit[2]}`
}

/** "la 4.10. klo 18.45" — Helsinki time. */
export function formatGameDateTime(date: string, time: string, now = new Date()): string {
  const day = formatGameDay(date, now)
  const clock = formatGameClock(time)
  if (!day) return clock ? `klo ${clock}` : ''
  return clock ? `${day} klo ${clock}` : day
}

/** Current Helsinki time, e.g. "8.10.2026 klo 07.15". */
export function formatHelsinkiNow(now = new Date()): string {
  const s = helsinkiStamp(now)
  const p = parts(s)
  if (!p) return ''
  return `${p.d}.${p.m}.${p.y} klo ${s.slice(11, 13)}.${s.slice(14, 16)}`
}
