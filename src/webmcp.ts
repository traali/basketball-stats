/**
 * WebMCP (https://webmachinelearning.github.io/webmcp).
 *
 * Tools are registered with `document.modelContext.registerTool(tool, { signal })`
 * through Google's `use-webmcp-tool` hook (see components/WebMcpTools.tsx).
 * Aborting the signal unregisters a tool. Chrome 146+ exposes the API behind
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
