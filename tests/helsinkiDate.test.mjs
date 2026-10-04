import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { helsinkiDateISO } from '../src/utils/matchContext.ts'

describe('helsinkiDateISO', () => {
  it('is the next Finnish morning when UTC is still the previous evening', () => {
    assert.equal(helsinkiDateISO(new Date('2026-10-04T22:30:00Z')), '2026-10-05')
  })
})
