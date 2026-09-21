import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { WebMcpPolyfill, isNativeModelContext, getNativeModelContext, connectModelContext } from '../src/webmcp.ts'

describe('WebMCP polyfill (spec-shaped)', () => {
  it('registers tools, lists them async, and executeTool takes a RegisteredTool', async () => {
    const mc = new WebMcpPolyfill()
    await mc.registerTool({
      name: 'get_basketball_game_card',
      description: 'Match card',
      inputSchema: { type: 'object', properties: { matchId: { type: 'string' } }, required: ['matchId'] },
      execute: async (input) => ({ ok: true, matchId: input.matchId }),
    })
    const tools = await mc.getTools()
    assert.equal(tools.length, 1)
    assert.equal(tools[0].name, 'get_basketball_game_card')
    assert.equal(typeof tools[0].execute, 'undefined')

    const raw = await mc.executeTool(tools[0], { matchId: '42' })
    const parsed = JSON.parse(raw)
    assert.deepEqual(parsed, { ok: true, matchId: '42' })
  })

  it('rejects duplicate names and empty name/description', async () => {
    const mc = new WebMcpPolyfill()
    const tool = {
      name: 'get_basketball_standings',
      description: 'Standings',
      execute: async () => ({ teams: [] }),
    }
    await mc.registerTool(tool)
    await assert.rejects(() => mc.registerTool(tool), /already registered/)
    await assert.rejects(
      () => mc.registerTool({ name: '', description: 'x', execute: async () => 1 }),
      /required/,
    )
  })

  it('unregisters when AbortSignal aborts', async () => {
    const mc = new WebMcpPolyfill()
    const ctrl = new AbortController()
    await mc.registerTool(
      { name: 'temp_tool', description: 'temp', execute: async () => 1 },
      { signal: ctrl.signal },
    )
    assert.equal((await mc.getTools()).length, 1)
    ctrl.abort()
    assert.equal((await mc.getTools()).length, 0)
  })

  it('treats registerTool-only host objects as native (Chrome / ChatGPT)', () => {
    const fake = { registerTool() {} }
    assert.equal(isNativeModelContext(fake), true)
    assert.equal(isNativeModelContext({ getTools() {} }), false)
  })

  it('callTool wraps unknown tools as text errors instead of dummy data', async () => {
    const mc = new WebMcpPolyfill()
    const res = await mc.callTool({ name: 'missing', arguments: {} })
    assert.match(res.content[0].text, /not found/i)
  })
})

describe('native Chrome/ChatGPT consumer', () => {
  it('does not treat a missing document as native', () => {
    assert.equal(getNativeModelContext(), null)
  })

  it('never overwrites an existing registerTool host object', () => {
    const calls = []
    const host = {
      registerTool: async (tool) => {
        calls.push(tool.name)
      },
    }
    globalThis.document = { modelContext: host }
    try {
      const { mode, mc } = connectModelContext()
      assert.equal(mode, 'native')
      assert.equal(mc, host)
      assert.equal(globalThis.document.modelContext, host)
    } finally {
      delete globalThis.document
    }
  })

  it('second connect keeps polyfill mode and does not report native', () => {
    globalThis.document = {}
    try {
      const first = connectModelContext()
      assert.equal(first.mode, 'polyfill')
      const second = connectModelContext()
      assert.equal(second.mode, 'polyfill')
      assert.equal(second.mc, first.mc)
    } finally {
      delete globalThis.document
    }
  })
})
