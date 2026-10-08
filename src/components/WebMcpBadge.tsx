import { useSyncExternalStore } from 'react'
import { getWebMcpStatus, subscribeWebMcpStatus } from '../webmcp'

export function WebMcpBadge() {
  const status = useSyncExternalStore(subscribeWebMcpStatus, getWebMcpStatus, getWebMcpStatus)
  const on = status.supported && status.tools.length > 0
  const label = on ? `WebMCP · ${status.tools.length} työkalua` : 'WebMCP off'
  const title = on
    ? `document.modelContext: ${status.tools.join(', ')}`
    : status.supported
      ? `document.modelContext is present but registration failed${status.error ? ` (${status.error})` : ''}.`
      : 'This browser has no document.modelContext. Chrome 146+: enable chrome://flags/#enable-webmcp-testing.'

  return (
    <span
      title={title}
      className={`hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
        on ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-court text-slate-500 border-hairline'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-emerald-400' : 'bg-slate-600'}`} />
      {label}
    </span>
  )
}
