import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  TOOL_NAME_RE,
  hasModelContext,
  getWebMcpStatus,
  publishWebMcpStatus,
  subscribeWebMcpStatus,
  registerWithBrowser,
  toToolResponse,
  toErrorResponse,
} from '../src/webmcp.ts'

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const TOOL = { name: 'search_basketball', description: 'Search', inputSchema: { type: 'object', properties: {} }, execute: async () => 'ok' }

describe('a tool counts as registered only if the browser accepted it', () => {
  it('resolved registerTool -> registered, and execute results are normalised', async () => {
    let registered
    const mc = { registerTool: async (tool) => { registered = tool } }
    const res = await registerWithBrowser(mc, TOOL, new AbortController().signal)
    assert.deepEqual(res, { registered: true, error: null })
    assert.deepEqual(await registered.execute({}), { content: [{ type: 'text', text: 'ok' }] })
  })

  it('a rejected promise (e.g. NotAllowedError) is not registered', async () => {
    const mc = { registerTool: () => Promise.reject(new DOMException('tools policy', 'NotAllowedError')) }
    const res = await registerWithBrowser(mc, TOOL, new AbortController().signal)
    assert.equal(res.registered, false)
    assert.match(res.error.message, /tools policy/)
  })

  it('a synchronous throw is not registered', async () => {
    const mc = { registerTool: () => { throw new TypeError('bad schema') } }
    const res = await registerWithBrowser(mc, TOOL, new AbortController().signal)
    assert.equal(res.registered, false)
    assert.match(res.error.message, /bad schema/)
  })

  it('aborted before the browser answered: not registered', async () => {
    const ctrl = new AbortController()
    const mc = { registerTool: async () => { ctrl.abort() } }
    const res = await registerWithBrowser(mc, TOOL, ctrl.signal)
    assert.equal(res.registered, false)
  })

  it('a throwing tool returns an isError result, never a success', async () => {
    let registered
    const mc = { registerTool: async (tool) => { registered = tool } }
    await registerWithBrowser(mc, { ...TOOL, execute: async () => { throw new Error('Basket.fi call failed') } }, new AbortController().signal)
    assert.deepEqual(await registered.execute({}), { content: [{ type: 'text', text: 'Basket.fi call failed' }], isError: true })
    assert.deepEqual(toToolResponse({ a: 1 }), { content: [{ type: 'text', text: '{"a":1}' }] })
    assert.equal(toErrorResponse('x').isError, true)
  })

  it('the component awaits registration and is mounted in main.tsx', () => {
    const comp = src('src/components/WebMcpTools.tsx')
    assert.match(comp, /registerWithBrowser\(/)
    assert.match(comp, /\.then\(\(res\)/)
    assert.match(src('src/main.tsx'), /<WebMcpTools \/>/)
  })
})

describe('WebMCP uses document.modelContext.registerTool', () => {
  it('detects only a browser-provided document.modelContext', () => {
    assert.equal(hasModelContext(undefined), false)
    assert.equal(hasModelContext({}), false)
    assert.equal(hasModelContext({ modelContext: {} }), false)
    assert.equal(hasModelContext({ modelContext: { registerTool() {} } }), true)
  })

  it('never defines, aliases or polyfills modelContext', () => {
    for (const file of ['src/webmcp.ts', 'src/mcp-app.ts', 'src/components/WebMcpTools.tsx', 'src/main.tsx']) {
      const code = src(file)
      assert.doesNotMatch(code, /defineProperty\([^)]*modelContext/, file)
      assert.doesNotMatch(code, /navigator\.modelContext\s*=|document\.modelContext\s*=/, file)
      assert.doesNotMatch(code, /navigator\.modelContext/, file)
    }
  })

  it('has no postMessage bridge that lets other pages list or call tools', () => {
    for (const file of ['src/webmcp.ts', 'src/mcp-app.ts', 'src/components/WebMcpTools.tsx', 'src/main.tsx', 'public/mcp-basket.html']) {
      const code = src(file)
      assert.doesNotMatch(code, /webmcp:request|tools\/call|callTool|executeTool/, file)
    }
    assert.doesNotMatch(src('src/webmcp.ts'), /addEventListener\(\s*['"]message/)
  })
})

describe('tool definitions', () => {
  const code = src('src/mcp-app.ts')
  const names = [...code.matchAll(/^\s{4}name: '([^']+)'/gm)].map((m) => m[1])

  it('every tool has a valid unique name, a description and an object schema', () => {
    assert.ok(names.length >= 6, `found ${names.length} tools`)
    assert.equal(new Set(names).size, names.length)
    for (const n of names) assert.match(n, TOOL_NAME_RE)
    assert.equal((code.match(/inputSchema: \{\s*type: 'object'/g) || []).length, names.length)
  })

  it('only spec annotations are used (readOnlyHint, untrustedContentHint)', () => {
    assert.doesNotMatch(code, /consequentialHint/)
    assert.match(code, /untrustedContentHint: true/)
  })
})

describe('status store for the header badge', () => {
  it('publishes changes once and ignores identical updates', () => {
    let calls = 0
    const off = subscribeWebMcpStatus(() => calls++)
    publishWebMcpStatus({ supported: true, tools: ['a', 'b'] })
    publishWebMcpStatus({ supported: true, tools: ['a', 'b'] })
    off()
    assert.equal(calls, 1)
    assert.deepEqual(getWebMcpStatus().tools, ['a', 'b'])
  })
})

describe('build info badge (Hakemisto / golden checks)', () => {
  it('Layout exposes window.__APP_BUILD_INFO__ and renders the app-version-badge', () => {
    const layout = src('src/components/Layout.tsx')
    assert.match(layout, /window\.__APP_BUILD_INFO__ = \{/)
    assert.match(layout, /<AppVersionBadge \/>/)
    const badge = src('src/components/AppVersionBadge.tsx')
    assert.match(badge, /data-testid="app-version-badge"/)
    assert.match(badge, /v\{version\} \(git:\{commit\}\)/)
  })
})
