import { useEffect, useReducer, useRef, useState } from 'react'
import { BASKETBALL_TOOLS } from '../mcp-app'
import { hasModelContext, publishWebMcpStatus, registerWithBrowser, type WebMcpTool } from '../webmcp'

type ToolState = { supported: boolean; registered: boolean; error: Error | null }

/**
 * Registers one tool on document.modelContext while mounted. Modelled on
 * Google's use-webmcp-tool hook (late-injection re-check, abort to
 * unregister), but it awaits registerTool so a rejected registration is
 * never reported as registered.
 */
function useBrowserTool(tool: WebMcpTool): ToolState {
  const [state, setState] = useState<ToolState>({ supported: false, registered: false, error: null })
  const [tick, redetect] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!hasModelContext(document)) {
      setState({ supported: false, registered: false, error: null })
      // Extensions can inject the API late: re-check for 10 s.
      let attempts = 0
      const timer = setInterval(() => {
        if (hasModelContext(document)) {
          clearInterval(timer)
          redetect()
        } else if (++attempts >= 20) clearInterval(timer)
      }, 500)
      return () => clearInterval(timer)
    }
    const controller = new AbortController()
    setState({ supported: true, registered: false, error: null })
    const mc = (document as unknown as { modelContext: Parameters<typeof registerWithBrowser>[0] }).modelContext
    void registerWithBrowser(mc, tool, controller.signal).then((res) => {
      if (!controller.signal.aborted) setState({ supported: true, ...res })
    })
    return () => controller.abort()
  }, [tool, tick])

  return state
}

function ToolRegistration({ tool, onState }: { tool: WebMcpTool; onState: (name: string, s: ToolState) => void }) {
  const state = useBrowserTool(tool)
  useEffect(() => {
    onState(tool.name, state)
  }, [tool.name, state, onState])
  return null
}

/** Registers the basketball tools on `document.modelContext`. No-op without WebMCP. Renders nothing. */
export function WebMcpTools() {
  const states = useRef(new Map<string, ToolState>())
  const [onState] = useState(() => (name: string, s: ToolState) => {
    states.current.set(name, s)
    const all = [...states.current.entries()]
    const failed = all.filter(([, v]) => v.error)
    publishWebMcpStatus({
      supported: all.some(([, v]) => v.supported),
      tools: all.filter(([, v]) => v.registered).map(([k]) => k).sort(),
      error: failed.length ? failed.map(([k, v]) => `${k}: ${v.error?.message}`).join('; ') : undefined,
    })
  })

  return (
    <>
      {BASKETBALL_TOOLS.map((tool) => (
        <ToolRegistration key={tool.name} tool={tool} onState={onState} />
      ))}
    </>
  )
}
