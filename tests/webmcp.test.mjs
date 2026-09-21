import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { WebMcpPolyfill, isNativeModelContext } from '../src/webmcp.ts'

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

  it('does not treat a plain object registry as native WebMCP', () => {
    const fake = { registerTool() {}, getTools() {} }
    assert.equal(isNativeModelContext(fake), false)
    assert.equal(isNativeModelContext(new WebMcpPolyfill()), true)
  })

  it('callTool wraps unknown tools as text errors instead of dummy data', async () => {
    const mc = new WebMcpPolyfill()
    const res = await mc.callTool({ name: 'missing', arguments: {} })
    assert.match(res.content[0].text, /not found/i)
  })
})
