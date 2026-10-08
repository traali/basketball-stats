import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { pathToHashUrl } from './src/utils/pathToHash'

const commitHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'prod'
  }
})()
const buildTime = new Date().toISOString()

const webmcpHeaders = {
  'Origin-Agent-Cluster': '?1',
  'Permissions-Policy': 'tools=(self)',
}

/** Path-form links (/match/123) -> hash form (#/match/123) before the app loads. */
const pathToHashPlugin: Plugin = {
  name: 'path-to-hash-redirect',
  transformIndexHtml(html) {
    const script = `<script>(function(){try{var f=${pathToHashUrl.toString()};var u=f(location.pathname,location.search,location.hash);if(u)location.replace(u)}catch(e){}})()</script>`
    return html.replace('<head>', `<head>\n    ${script}`)
  },
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify('1.0.0'),
    __COMMIT_HASH__: JSON.stringify(commitHash),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [react(), pathToHashPlugin],
  // Absolute asset paths: index.html is also served for /match/123 (SPA fallback).
  base: '/',
  server: { headers: webmcpHeaders },
  preview: { headers: webmcpHeaders },
})
