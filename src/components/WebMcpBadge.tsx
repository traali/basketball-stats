import { useEffect, useState } from 'react'
import { getWebMcpStatus, type WebMcpStatus } from '../webmcp'

export function WebMcpBadge() {
  const [status, setStatus] = useState<WebMcpStatus>(() =>
    typeof window !== 'undefined' && window.__WEBMCP_STATUS__ ? window.__WEBMCP_STATUS__ : getWebMcpStatus(),
  )

  useEffect(() => {
    const onStatus = (event: Event) => {
      const detail = (event as CustomEvent<WebMcpStatus>).detail
      if (detail) setStatus(detail)
    }
    window.addEventListener('webmcp:status', onStatus)
    if (window.__WEBMCP_STATUS__) setStatus(window.__WEBMCP_STATUS__)
    return () => window.removeEventListener('webmcp:status', onStatus)
  }, [])

  const native = status.mode === 'native'
  const label = native
    ? status.consumer === 'chatgpt'
      ? 'WebMCP · ChatGPT'
      : status.consumer === 'chrome'
        ? 'WebMCP · Chrome'
        : 'WebMCP · native'
    : status.mode === 'polyfill'
      ? 'WebMCP · polyfill'
      : 'WebMCP off'

  const title = native
    ? `Native document.modelContext — ${status.tools.length} tools for Chrome / ChatGPT Desktop`
    : status.mode === 'polyfill'
      ? 'No host WebMCP. Enable chrome://flags/#enable-webmcp-testing or open in ChatGPT Desktop.'
      : 'Host modelContext present but registerTool is disabled (origin trial / Permissions-Policy tools).'

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
        native
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-court text-slate-500 border-hairline'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${native ? 'bg-emerald-400' : 'bg-slate-600'}`} />
      {label}
    </span>
  )
}
