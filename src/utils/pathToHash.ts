/**
 * The app uses a hash router (#/match/123). Links in path form
 * (/match/123, /team/5, …) reach Cloudflare Pages, which serves index.html
 * for every path (public/_redirects). This rewrites such a URL to the hash
 * form before the app starts, keeping the query string.
 *
 * Self-contained on purpose: vite.config.ts inlines `pathToHashUrl.toString()`
 * into index.html so the redirect runs before any asset loads.
 */
export function pathToHashUrl(pathname: string, search: string, hash: string): string | null {
  const ROUTES = ['match', 'team', 'player', 'club', 'group', 'competition', 'search', 'browse', 'favorites']
  if (hash && hash.indexOf('#/') === 0) return null
  const clean = pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '')
  if (!clean || clean === '/index.html') return null
  const first = clean.split('/')[1] || ''
  if (ROUTES.indexOf(first) === -1) return null
  return '/#' + clean + (search || '')
}
