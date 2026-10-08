import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { helsinkiDateISO } from '../src/utils/matchContext.ts'
import { formatGameDateTime, formatGameDay, formatHelsinkiNow } from '../src/utils/formatFi.ts'
import { classifyMatch } from '../src/utils/matchStatus.ts'

describe('helsinkiDateISO', () => {
  it('is the next Finnish morning when UTC is still the previous evening', () => {
    assert.equal(helsinkiDateISO(new Date('2026-10-04T22:30:00Z')), '2026-10-05')
  })
})

describe('Finnish game time (TASO times are already Helsinki local)', () => {
  const now = new Date('2026-10-08T04:00:00Z')
  it('formats weekday, date and clock without shifting time zones', () => {
    assert.equal(formatGameDateTime('2026-10-08', '18:20:00', now), 'to 8.10. klo 18.20')
    assert.equal(formatGameDateTime('2025-03-02', '10:00:00', now), 'su 2.3.2025 klo 10.00')
    assert.equal(formatGameDay('', now), '')
    assert.equal(formatGameDateTime('', '', now), '')
  })
  it('prints the current Helsinki clock', () => {
    assert.equal(formatHelsinkiNow(new Date('2026-10-08T21:30:00Z')), '9.10.2026 klo 00.30')
  })
  it('upcoming vs past is decided on Helsinki time, not UTC', () => {
    // 21:30 UTC = 00:30 Helsinki next day: a 20:40 game "today" (UTC) is already past in Helsinki.
    const late = new Date('2026-10-08T21:30:00Z')
    assert.equal(classifyMatch({ status: 'Fixture', date: '2026-10-08', time: '20:40:00' }, late), 'unreported')
    assert.equal(classifyMatch({ status: 'Fixture', date: '2026-10-09', time: '10:00:00' }, late), 'upcoming')
  })
})
