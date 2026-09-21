/**
 * Native-first WebMCP.
 *
 * Chrome (origin trial / chrome://flags/#enable-webmcp-testing) and ChatGPT
 * Desktop/Sites read the browser host object `document.modelContext`.
 * Never replace that getter — a JS polyfill is invisible to those consumers.
 *
 * Spec: https://webmachinelearning.github.io/webmcp
 */

export type JsonSchema = {
  type?: string
  properties?: Record<string, unknown>
  required?: string[]
  additionalProperties?: boolean
  [key: string]: unknown
}

export type ToolAnnotations = {
  readOnlyHint?: boolean
  untrustedContentHint?: boolean
  consequentialHint?: boolean
  debugging?: boolean
}

export type ModelContextTool = {
  name: string
  title?: string
  description: string
  inputSchema?: JsonSchema
  execute: (input: Record<string, unknown>, options?: { signal?: AbortSignal }) => Promise<unknown> | unknown
  annotations?: ToolAnnotations
}

export type RegisteredTool = {
  name: string
  title?: string
  description: string
  inputSchema?: JsonSchema
  origin?: string
  annotations?: ToolAnnotations
}

export type RegisterToolOptions = {
  signal?: AbortSignal
  exposedTo?: string[]
}

export type WebMcpMode = 'native' | 'polyfill' | 'unavailable'

export type WebMcpStatus = {
  mode: WebMcpMode
  consumer: 'chrome' | 'chatgpt' | 'unknown' | 'none'
  tools: string[]
  error?: string
}

export type NativeModelContext = {
  registerTool: (tool: ModelContextTool, options?: RegisterToolOptions) => Promise<unknown>
  getTools?: (options?: unknown) => Promise<unknown>
  executeTool?: (tool: string | RegisteredTool | unknown, input?: unknown, options?: unknown) => Promise<unknown>
  listTools?: () => Promise<{ tools: RegisteredTool[] }>
  callTool?: (params: { name: string; arguments?: Record<string, unknown> }) => Promise<unknown>
  addEventListener?: EventTarget['addEventListener']
  removeEventListener?: EventTarget['removeEventListener']
}

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/

export const POLYFILL_MARK = Symbol.for('webmcp.polyfill')

type StoredTool = ModelContextTool & { origin: string }

export class WebMcpPolyfill extends EventTarget {
  readonly [POLYFILL_MARK] = true
  #tools = new Map<string, StoredTool>()

  async registerTool(tool: ModelContextTool, options: RegisterToolOptions = {}): Promise<void> {
    if (!tool?.name || !tool.description) {
      return Promise.reject(new TypeError('Tool name and description are required'))
    }
    if (!NAME_RE.test(tool.name)) {
      return Promise.reject(new TypeError(`Invalid tool name: ${tool.name}`))
    }
    if (this.#tools.has(tool.name)) {
      return Promise.reject(new DOMException(`Tool '${tool.name}' is already registered`, 'InvalidStateError'))
    }
    if (options.signal?.aborted) {
      return Promise.reject(options.signal.reason ?? new DOMException('Aborted', 'AbortError'))
    }

    const stored: StoredTool = {
      ...tool,
      origin: typeof location !== 'undefined' ? location.origin : '',
    }
    this.#tools.set(tool.name, stored)

    const onAbort = () => {
      this.#tools.delete(tool.name)
      this.dispatchEvent(new Event('toolchange'))
    }
    options.signal?.addEventListener('abort', onAbort, { once: true })
    this.dispatchEvent(new Event('toolchange'))
  }

  async getTools(): Promise<RegisteredTool[]> {
    return [...this.#tools.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => ({
        name: t.name,
        title: t.title,
        description: t.description,
        inputSchema: t.inputSchema,
        origin: t.origin,
        annotations: t.annotations,
      }))
  }

  async executeTool(
    tool: RegisteredTool | string | unknown,
    inputObject: unknown = {},
    options: { signal?: AbortSignal } = {},
  ): Promise<string> {
    const name =
      typeof tool === 'string'
        ? tool
        : tool && typeof tool === 'object' && 'name' in tool
          ? String((tool as { name: string }).name)
          : undefined
    const stored = name ? this.#tools.get(name) : undefined
    if (!stored) {
      return Promise.reject(new DOMException(`Tool '${String(name)}' not found`, 'NotFoundError'))
    }
    if (options.signal?.aborted) {
      return Promise.reject(options.signal.reason ?? new DOMException('Aborted', 'AbortError'))
    }
    const input =
      inputObject && typeof inputObject === 'object' && !Array.isArray(inputObject)
        ? (inputObject as Record<string, unknown>)
        : {}
    const result = await stored.execute(input, { signal: options.signal })
    return JSON.stringify(result ?? null)
  }

  async unregisterTool(name: string): Promise<void> {
    this.#tools.delete(name)
    this.dispatchEvent(new Event('toolchange'))
  }

  async listTools() {
    return { tools: await this.getTools() }
  }

  async callTool(params: { name: string; arguments?: Record<string, unknown> }) {
    try {
      const raw = await this.executeTool(params.name, params.arguments || {})
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === 'object' && 'content' in (parsed as object)) {
        return parsed
      }
      return {
        content: [{ type: 'text', text: typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2) }],
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { content: [{ type: 'text', text: `Error: ${message}` }] }
    }
  }
}

/** Native if the host object exposes registerTool. Do not require getTools or EventTarget. */
export function isOurPolyfill(value: unknown): value is WebMcpPolyfill {
  return Boolean(value && typeof value === 'object' && POLYFILL_MARK in (value as object))
}

export function getNativeModelContext(): NativeModelContext | null {
  const doc = globalThis.document as (Document & { modelContext?: NativeModelContext }) | undefined
  const nav = globalThis.navigator as (Navigator & { modelContext?: NativeModelContext }) | undefined
  if (!doc) return null
  for (const mc of [doc.modelContext, nav?.modelContext]) {
    if (mc && typeof mc.registerTool === 'function' && !isOurPolyfill(mc)) return mc
  }
  return null
}

export function detectWebMcpConsumer(): WebMcpStatus['consumer'] {
  const nav = globalThis.navigator
  if (!nav) return 'none'
  const ua = nav.userAgent || ''
  const brands =
    (nav as Navigator & { userAgentData?: { brands?: Array<{ brand: string }> } }).userAgentData?.brands || []
  const brandStr = brands.map((b) => b.brand).join(' ')
  if (/ChatGPT|OpenAI/i.test(ua) || /ChatGPT|OpenAI/i.test(brandStr)) return 'chatgpt'
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua)) return 'chrome'
  if (/Edg\//.test(ua)) return 'chrome'
  return 'unknown'
}

export function isNativeModelContext(value: unknown): value is NativeModelContext {
  return Boolean(value && typeof value === 'object' && typeof (value as NativeModelContext).registerTool === 'function')
}

let messageHandler: ((event: MessageEvent) => void) | null = null
let lastStatus: WebMcpStatus = { mode: 'unavailable', consumer: 'none', tools: [] }

export function getWebMcpStatus(): WebMcpStatus {
  return lastStatus
}

export function publishWebMcpStatus(next: WebMcpStatus) {
  lastStatus = next
  const win = globalThis.window
  if (!win) return
  win.__WEBMCP_STATUS__ = next
  win.dispatchEvent(new CustomEvent('webmcp:status', { detail: next }))
}

function asHost(mc: WebMcpPolyfill): NativeModelContext {
  return mc as unknown as NativeModelContext
}

/**
 * Connect to native Chrome/ChatGPT modelContext when present.
 * Never overwrite a host getter. Polyfill only when the API is absent.
 */
export function connectModelContext(): { mode: WebMcpMode; mc: NativeModelContext } {
  const native = getNativeModelContext()
  if (native) {
    return { mode: 'native', mc: native }
  }

  const doc = globalThis.document as (Document & { modelContext?: NativeModelContext }) | undefined
  const existing = doc?.modelContext
  if (isOurPolyfill(existing)) {
    bindMessageBridge(existing)
    return { mode: 'polyfill', mc: existing }
  }

  const poly = new WebMcpPolyfill()
  const host = asHost(poly)
  if (!doc) {
    return { mode: 'unavailable', mc: host }
  }
  const hostHasGetter = 'modelContext' in doc

  if (!hostHasGetter) {
    try {
      Object.defineProperty(doc, 'modelContext', {
        value: poly,
        configurable: true,
        enumerable: true,
      })
    } catch {
      /* ignore */
    }
  }

  const after = getNativeModelContext()
  if (after && after !== poly) {
    return { mode: 'native', mc: after }
  }

  if (!hostHasGetter) {
    aliasNavigatorIfEmpty(host)
    bindMessageBridge(host)
    return { mode: 'polyfill', mc: host }
  }

  bindMessageBridge(host)
  if (typeof globalThis.window !== 'undefined') {
    globalThis.window.__WEBMCP_POLYFILL__ = poly
  }
  return { mode: 'unavailable', mc: host }
}

function aliasNavigatorIfEmpty(mc: NativeModelContext) {
  const nav = globalThis.navigator as (Navigator & { modelContext?: NativeModelContext }) | undefined
  if (!nav) return
  const existing = nav.modelContext
  if (existing && typeof existing.registerTool === 'function') return
  try {
    Object.defineProperty(nav, 'modelContext', {
      value: mc,
      configurable: true,
      enumerable: true,
    })
  } catch {
    /* host getter */
  }
}

function bindMessageBridge(mc: NativeModelContext) {
  const win = globalThis.window
  if (!win) return
  if (messageHandler) win.removeEventListener('message', messageHandler)
  messageHandler = async (event: MessageEvent) => {
    if (event.origin !== win.location.origin) return
    const data = event.data
    if (!data || data.type !== 'webmcp:request' || !data.id) return
    const poly = mc as WebMcpPolyfill
    try {
      if (data.method === 'tools/list' || data.method === 'listTools') {
        const result =
          typeof poly.listTools === 'function'
            ? await poly.listTools()
            : { tools: typeof mc.getTools === 'function' ? await mc.getTools() : [] }
        win.postMessage({ type: 'webmcp:response', id: data.id, result }, win.location.origin)
      } else if (data.method === 'tools/call' || data.method === 'callTool') {
        let result: unknown
        if (typeof poly.callTool === 'function') {
          result = await poly.callTool(data.params || { name: '', arguments: {} })
        } else if (typeof mc.executeTool === 'function') {
          const tools = typeof mc.getTools === 'function' ? ((await mc.getTools()) as RegisteredTool[]) : []
          const name = data.params?.name as string
          const tool = Array.isArray(tools) ? tools.find((t) => t.name === name) : undefined
          const raw = await mc.executeTool(tool || name, data.params?.arguments || {})
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
          result =
            parsed && typeof parsed === 'object' && 'content' in (parsed as object)
              ? parsed
              : { content: [{ type: 'text', text: JSON.stringify(parsed) }] }
        } else {
          throw new Error('executeTool not available')
        }
        win.postMessage({ type: 'webmcp:response', id: data.id, result }, win.location.origin)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'WebMCP execution failed'
      win.postMessage({ type: 'webmcp:response', id: data.id, error: { message } }, win.location.origin)
    }
  }
  win.addEventListener('message', messageHandler)
}

declare global {
  interface Window {
    __WEBMCP_STATUS__?: WebMcpStatus
    __WEBMCP_POLYFILL__?: WebMcpPolyfill
    __WEBMCP_READY__?: Promise<unknown>
  }
}
