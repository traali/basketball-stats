/**
 * Build info shown in the footer. The Hakemisto / golden checks in
 * traali/sports-federation look for `app-version-badge` and
 * `window.__APP_BUILD_INFO__` (set in Layout) in the live bundle.
 */
export function AppVersionBadge() {
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'
  const commit = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev'
  const iso = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : ''
  const built = iso
    ? new Date(iso).toLocaleString('fi-FI', { timeZone: 'Europe/Helsinki', dateStyle: 'short', timeStyle: 'short' })
    : ''
  return (
    <footer className="mt-8 mb-4 px-4 text-center">
      <div className="inline-flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-400">Koripallo · tiedot: Basket.fi-tulospalvelu</span>
        <span aria-hidden>•</span>
        <span
          data-testid="app-version-badge"
          title={built ? `Koottu ${built} (Helsinki)` : undefined}
          className="px-2 py-0.5 rounded-md bg-court border border-hairline font-mono text-[10px] text-emerald-400"
        >
          v{version} (git:{commit})
        </span>
      </div>
    </footer>
  )
}
