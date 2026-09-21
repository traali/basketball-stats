import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { parseBasketResourceFromLocation } from '../services/basketApi'

export function Layout() {
  const isEmbed =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '').get('embed') === 'true'

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.__APP_BUILD_INFO__ = {
      version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0',
      commit: typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev',
      buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString(),
    }

    const p = window.location.pathname
    if (!window.location.hash && (p.startsWith('/match/') || p.startsWith('/team/') || p.startsWith('/player/') || p.startsWith('/search') || p.startsWith('/browse') || p.startsWith('/club/') || p.startsWith('/competition/') || p.startsWith('/favorites') || p.startsWith('/group/'))) {
      window.location.replace('/#' + p + window.location.search)
      return
    }

    const hash = window.location.hash || ''
    if (!hash.startsWith('#/')) {
      const parsed = parseBasketResourceFromLocation(window.location.href)
      if (parsed.kind !== 'none') {
        const q = isEmbed ? '?embed=true' : ''
        window.location.replace(`/#/${parsed.kind}/${encodeURIComponent(parsed.id)}${q}`)
      }
    }
  }, [isEmbed])

  return (
    <div className={`min-h-screen bg-[#0B132B] text-slate-100 flex flex-col justify-between ${
      isEmbed ? 'p-2' : 'pb-20'
    }`}>
      <div className="flex-1 w-full">
        {!isEmbed && <Header isEmbed={isEmbed} />}
        <main className="py-2">
          <Outlet />
        </main>
      </div>

      {!isEmbed && <BottomNav />}
    </div>
  )
}
