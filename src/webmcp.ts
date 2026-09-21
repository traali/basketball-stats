/**
 * Spec-shaped WebMCP (document.modelContext).
 * Draft: https://webmachinelearning.github.io/webmcp (17 Sep 2026)
 *
 * Uses the native browser API when present. Otherwise installs an EventTarget
 * polyfill that matches registerTool / getTools / executeTool.
 */

export type JsonSchema = {
  type?: string
  properties?: Record<string, unknown>
  required?: string[]
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

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/

type StoredTool = ModelContextTool & { origin: string }

export class WebMcpPolyfill extends EventTarget {
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
    tool: RegisteredTool | string,
    inputObject: unknown = {},
    options: { signal?: AbortSignal } = {},
  ): Promise<string> {
    const name = typeof tool === 'string' ? tool : tool?.name
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
    const tools = await this.getTools()
    return { tools }
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

export function isNativeModelContext(value: unknown): value is WebMcpPolyfill {
  return Boolean(
    value &&
      typeof value === 'object' &&
      value instanceof EventTarget &&
      typeof (value as WebMcpPolyfill).registerTool === 'function' &&
      typeof (value as WebMcpPolyfill).getTools === 'function',
  )
}

let messageHandler: ((event: MessageEvent) => void) | null = null

export function installModelContext(): WebMcpPolyfill | undefined {
  if (typeof window === 'undefined' || typeof document === 'undefined') return undefined

  const current = (document as Document & { modelContext?: unknown }).modelContext
  if (isNativeModelContext(current)) {
    bindMessageBridge(current)
    aliasNavigator(current)
    return current
  }

  const polyfill = new WebMcpPolyfill()
  try {
    Object.defineProperty(document, 'modelContext', {
      value: polyfill,
      configurable: true,
      enumerable: true,
    })
  } catch {
    ;(document as Document & { modelContext?: WebMcpPolyfill }).modelContext = polyfill
  }
  aliasNavigator(polyfill)
  bindMessageBridge(polyfill)
  return polyfill
}

function aliasNavigator(mc: WebMcpPolyfill) {
  if (typeof navigator === 'undefined') return
  const existing = (navigator as Navigator & { modelContext?: unknown }).modelContext
  if (isNativeModelContext(existing)) return
  try {
    Object.defineProperty(navigator, 'modelContext', {
      value: mc,
      configurable: true,
      enumerable: true,
    })
  } catch {
    ;(navigator as Navigator & { modelContext?: WebMcpPolyfill }).modelContext = mc
  }
}

function bindMessageBridge(mc: WebMcpPolyfill) {
  if (messageHandler) window.removeEventListener('message', messageHandler)
  messageHandler = async (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return
    const data = event.data
    if (!data || data.type !== 'webmcp:request' || !data.id) return
    try {
      if (data.method === 'tools/list' || data.method === 'listTools') {
        const result =
          typeof mc.listTools === 'function' ? await mc.listTools() : { tools: await mc.getTools() }
        window.postMessage({ type: 'webmcp:response', id: data.id, result }, window.location.origin)
      } else if (data.method === 'tools/call' || data.method === 'callTool') {
        let result: unknown
        if (typeof mc.callTool === 'function') {
          result = await mc.callTool(data.params || { name: '', arguments: {} })
        } else {
          const tools = await mc.getTools()
          const name = data.params?.name as string
          const tool = tools.find((t) => t.name === name)
          if (!tool) throw new Error(`Tool '${name}' not found`)
          const raw = await mc.executeTool(tool, data.params?.arguments || {})
          const parsed = JSON.parse(raw) as unknown
          result =
            parsed && typeof parsed === 'object' && 'content' in (parsed as object)
              ? parsed
              : { content: [{ type: 'text', text: typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2) }] }
        }
        window.postMessage({ type: 'webmcp:response', id: data.id, result }, window.location.origin)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'WebMCP execution failed'
      window.postMessage({ type: 'webmcp:response', id: data.id, error: { message } }, window.location.origin)
    }
  }
  window.addEventListener('message', messageHandler)
}
