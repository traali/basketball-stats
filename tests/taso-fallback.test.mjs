import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { BasketApiError, basketUrls, fetchBasketClubs, fetchBasketMatchesByTeam } from '../src/services/basketApi.ts'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

// Exactly what taso-proxy.sakkoja.workers.dev/basket/* returned on 2026-10-08.
const PROXY_403_ENVELOPE = { call: { status: 'error', http: 403 }, error: 'upstream' }

describe('Basket.fi fetch order and error envelope', () => {
  it('signs the direct Torneopal call (sha256 hash last), then falls back to the proxy', async () => {
    const urls = await basketUrls('getMatch?match_id=42')
    const sha = createHash('sha256').update('getMatch?ysnyp4h6e9egetkc3s3v&match_id=42').digest('hex')
    assert.equal(urls[0], `https://koripallo-api.torneopal.net/taso/rest/getMatch?match_id=42&hash=${sha}`)
    assert.equal(urls[1], 'https://taso-proxy.sakkoja.workers.dev/basket/getMatch?match_id=42')
    assert.equal(urls.length, 2)
  })

  it('a signed direct answer is used without touching the proxy', async () => {
    const clubs = { call: { status: 'ok' }, clubs: [{ club_id: '1447', name: 'Leppävaaran Pyrintö', abbrevation: 'LePy', city_name: 'Espoo' }] }
    const fetchMock = mock.method(globalThis, 'fetch', async (input) => {
      const url = String(input)
      if (url.includes('taso-proxy')) return json(PROXY_403_ENVELOPE)
      if (url.includes('hash=')) return json(clubs)
      return new Response('', { status: 403 })
    })
    try {
      const list = await fetchBasketClubs()
      assert.equal(list.length, 1)
      assert.ok(!fetchMock.mock.calls.some((c) => String(c.arguments[0]).includes('taso-proxy')))
    } finally {
      fetchMock.mock.restore()
    }
  })

  it('never trusts an HTTP 200 proxy body whose call.status is error', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async (input) => {
      const url = String(input)
      if (url.includes('taso-proxy')) return json(PROXY_403_ENVELOPE)
      return new Response('', { status: 403 })
    })
    try {
      await assert.rejects(fetchBasketMatchesByTeam('5751397'), (err) => {
        assert.ok(err instanceof BasketApiError)
        assert.equal(err.notFound, false)
        assert.match(err.message, /upstream 403/)
        return true
      })
    } finally {
      fetchMock.mock.restore()
    }
  })

  it('a failed call is an error ("haku epäonnistui"), not an empty game list', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () => new Response('', { status: 403 }))
    try {
      await assert.rejects(fetchBasketMatchesByTeam('5751397'), BasketApiError)
    } finally {
      fetchMock.mock.restore()
    }
  })

  it('a successful empty answer is an empty list', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () => json({ call: { status: 'ok' }, matches: [] }))
    try {
      assert.deepEqual(await fetchBasketMatchesByTeam('5751397'), [])
    } finally {
      fetchMock.mock.restore()
    }
  })

  it('sends the page origin as Referer (strict-origin-when-cross-origin)', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () => json({ call: { status: 'ok' }, matches: [] }))
    try {
      await fetchBasketMatchesByTeam('1')
      assert.equal(fetchMock.mock.calls[0].arguments[1].referrerPolicy, 'strict-origin-when-cross-origin')
    } finally {
      fetchMock.mock.restore()
    }
  })
})
