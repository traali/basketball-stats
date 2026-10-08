/**
 * WebMCP (https://webmachinelearning.github.io/webmcp).
 *
 * Tools are registered with `document.modelContext.registerTool(tool, { signal })`
 * (components/WebMcpTools.tsx). The hook there follows Google's
 * `use-webmcp-tool` (Apache-2.0) but awaits registerTool: a tool counts as
 * registered only after the browser's promise resolved. Aborting the signal
 * unregisters a tool. Chrome 146+ exposes the API behind
 * chrome://flags/#enable-webmcp-testing.
 *
 * Rules kept here:
 * - Never define, replace or polyfill modelContext (on document or navigator).
 *   A JS polyfill is invisible to browser agents and can shadow the real host object.
 * - No postMessage bridge: embedded or embedding pages cannot list or call tools.
 *   Only the browser's own agent (same document) can.
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
}

export type WebMcpTool = {
  name: string
  title?: string
  description: string
  inputSchema: JsonSchema
  annotations?: ToolAnnotations
  execute: (input: Record<string, unknown>) => Promise<unknown> | unknown
}

/** Tool names agents accept: letters, digits, `_`, `-`, `.`; max 128. */
export const TOOL_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/

export type WebMcpStatus = {
  /** `document.modelContext` exists in this browser. */
  supported: boolean
  /** Tools currently registered with the browser. */
  tools: string[]
  error?: string
}

/** True when the browser itself provides `document.modelContext.registerTool`. */
export function hasModelContext(doc: unknown = globalThis.document): boolean {
  const mc = (doc as { modelContext?: { registerTool?: unknown } } | undefined)?.modelContext
  return Boolean(mc && typeof mc.registerTool === 'function')
}

let status: WebMcpStatus = { supported: false, tools: [] }
const listeners = new Set<() => void>()

export function getWebMcpStatus(): WebMcpStatus {
  return status
}

export function subscribeWebMcpStatus(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function publishWebMcpStatus(next: WebMcpStatus) {
  const same =
    next.supported === status.supported &&
    next.error === status.error &&
    next.tools.length === status.tools.length &&
    next.tools.every((t, i) => t === status.tools[i])
  if (same) return
  status = next
  listeners.forEach((l) => l())
}

export type ToolResponse = { content: Array<{ type: 'text'; text: string }>; isError?: boolean }

/** Whatever a tool returns becomes an MCP tool result (same rules as use-webmcp-tool). */
export function toToolResponse(value: unknown): ToolResponse {
  if (value && typeof value === 'object' && Array.isArray((value as { content?: unknown }).content)) {
    return value as ToolResponse
  }
  if (value === undefined || value === null) return { content: [] }
  if (typeof value === 'string') return { content: [{ type: 'text', text: value }] }
  return { content: [{ type: 'text', text: JSON.stringify(value) }] }
}

/** A thrown failure is an explicit error result, never a success. */
export function toErrorResponse(error: unknown): ToolResponse {
  const text =
    error instanceof Error ? error.message : typeof error === 'string' ? error : (() => {
      try {
        return JSON.stringify(error)
      } catch {
        return String(error)
      }
    })()
  return { content: [{ type: 'text', text }], isError: true }
}

type BrowserModelContext = {
  registerTool: (tool: Record<string, unknown>, options: { signal: AbortSignal }) => unknown
}

export type RegistrationResult = { registered: boolean; error: Error | null }

/**
 * Register one tool and report the truth: `registered` is true only when
 * registerTool returned (or its promise resolved) and the signal is still live.
 * A synchronous throw or a rejected promise (e.g. NotAllowedError from the
 * `tools` permissions policy) is `registered: false` with the error.
 */
export async function registerWithBrowser(
  mc: BrowserModelContext,
  tool: WebMcpTool,
  signal: AbortSignal,
): Promise<RegistrationResult> {
  try {
    await mc.registerTool(
      {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
        async execute(args: Record<string, unknown>) {
          try {
            return toToolResponse(await tool.execute(args || {}))
          } catch (err) {
            return toErrorResponse(err)
          }
        },
      },
      { signal },
    )
    return { registered: !signal.aborted, error: null }
  } catch (err) {
    return { registered: false, error: err instanceof Error ? err : new Error(String(err)) }
  }
}
