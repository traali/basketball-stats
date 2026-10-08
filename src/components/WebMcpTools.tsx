import { useEffect, useRef, useState } from 'react'
import { useWebMCP } from 'use-webmcp-tool'
import { BASKETBALL_TOOLS } from '../mcp-app'
import { publishWebMcpStatus, type WebMcpTool } from '../webmcp'

type ToolState = { supported: boolean; registered: boolean; error: Error | null }

function ToolRegistration({ tool, onState }: { tool: WebMcpTool; onState: (name: string, s: ToolState) => void }) {
  const state = useWebMCP({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: tool.annotations,
    execute: (args: Record<string, unknown>) => tool.execute(args || {}),
  })
  useEffect(() => {
    onState(tool.name, state)
  }, [tool.name, state, onState])
  return null
}

/**
 * Registers the basketball tools on `document.modelContext` with Google's
 * `use-webmcp-tool` hook. No-op in browsers without WebMCP. Renders nothing.
 */
export function WebMcpTools() {
  const states = useRef(new Map<string, ToolState>())
  const [onState] = useState(() => (name: string, s: ToolState) => {
    states.current.set(name, s)
    const all = [...states.current.entries()]
    const error = all.find(([, v]) => v.error)
    publishWebMcpStatus({
      supported: all.some(([, v]) => v.supported),
      tools: all.filter(([, v]) => v.registered).map(([k]) => k).sort(),
      error: error ? `${error[0]}: ${error[1].error?.message}` : undefined,
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
