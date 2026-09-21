import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { fetchBasketClubs } from '../src/services/basketApi.ts'

describe('TASO proxy error envelope', () => {
  it('skips proxy upstream 403 JSON and falls through to origin', async () => {
    const clubs = {
      call: { status: 'ok' },
      clubs: [{ club_id: '1', name: 'Tapiolan Honka', abbrevation: 'Honka', city_name: 'Espoo' }],
    }
    const fetchMock = mock.method(globalThis, 'fetch', async (input) => {
      const url = String(input)
      if (url.includes('taso-proxy')) {
        return new Response(JSON.stringify({ call: { status: 'error', http: 403 }, error: 'upstream' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify(clubs), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    try {
      const list = await fetchBasketClubs()
      assert.equal(list.length, 1)
      assert.equal(list[0].name, 'Tapiolan Honka')
      assert.ok(fetchMock.mock.calls.some((c) => String(c.arguments[0]).includes('koripallo-api.torneopal.net')))
    } finally {
      fetchMock.mock.restore()
    }
  })
})
