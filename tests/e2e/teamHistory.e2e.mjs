/**
 * E2E: "Joukkueiden tausta" on the real TOPOLA – LePy Oranssi game (15.11.2026 18.00)
 * at a 390 px phone width. Basket.fi answers come from tests/fixtures (recorded
 * 14.11.2026), so this runs offline. Usage:
 *   npm run build && npm run test:e2e        (CHROME_PATH=/path/to/chrome optional)
 *   E2E_BASE=https://basketball-stats-byu.pages.dev E2E_LIVE=1 npm run test:e2e   (live, real API)
 */
import { spawn } from 'node:child_process'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const FX = JSON.parse(readFileSync(new URL('../fixtures/team-history.json', import.meta.url), 'utf8'))
FX['getMatch?match_id=1010385'] = JSON.parse(readFileSync(new URL('../fixtures/team-history-match-1010385.json', import.meta.url), 'utf8'))
const LIVE = process.env.E2E_LIVE === '1'
const SHOTS = process.env.E2E_SHOTS || ''
const chromePath = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => existsSync(p))

let server
let base = process.env.E2E_BASE
if (!base) {
  base = 'http://127.0.0.1:4179'
  server = spawn('npx', ['vite', 'preview', '--port', '4179', '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' })
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(base)).ok) break
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200))
  }
}

/** Scroll so the element starts just under the fixed header, then shoot the viewport. */
async function shotAt(page, locator, path) {
  await locator.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 92))
  await page.waitForTimeout(150)
  await page.screenshot({ path })
}

const browser = await chromium.launch({ executablePath: chromePath, args: ['--no-sandbox'] })
let failed = false
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Helsinki', locale: 'fi-FI' })
  if (!LIVE) {
    await page.route('https://koripallo-api.torneopal.net/**', (route) => {
      const u = route.request().url().replace('https://koripallo-api.torneopal.net/taso/rest/', '').replace(/[?&]hash=[0-9a-f]+$/, '')
      const body = FX[u] || { call: { status: 'error', error_message: `no fixture ${u}` } }
      route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
    })
  }
  await page.goto(`${base}/#/match/1010385`, { waitUntil: 'domcontentloaded' })
  const toggle = page.getByRole('button', { name: /Joukkueiden tausta/ })
  await toggle.waitFor({ timeout: 30000 })
  assert.equal(await page.locator('[data-testid="bb-team-5756346"]').count(), 0, 'section is collapsed and not loaded before opening')
  if (SHOTS) {
    mkdirSync(SHOTS, { recursive: true })
    await page.screenshot({ path: `${SHOTS}/01-collapsed-390.png` })
  }
  await toggle.click()
  const topola = page.locator('[data-testid="bb-team-5756346"]')
  const lepy = page.locator('[data-testid="bb-team-5000134"]')
  await topola.waitFor({ timeout: 60000 })
  await lepy.waitFor({ timeout: 60000 })
  const t = (await topola.innerText()).replace(/\s+/g, ' ')
  const l = (await lepy.innerText()).replace(/\s+/g, ' ')
  console.log('TOPOLA:', t)
  console.log('LePy:', l)
  assert.match(t, /Nyt: 12v tytöt II div, syksy/)
  assert.match(t, /\d+\.\/11 · \d+–\d+ · \d+–\d+/)
  assert.match(t, /Kevään lohkot julkaistaan joulun jälkeen/)
  assert.match(t, /vahvistettu: ToPoLa 11v tytöt II div/)
  assert.match(t, /25–26 11v tytöt II div/)
  assert.match(t, /Syksy 1\.\/10 · 9–1/)
  assert.match(t, /Kevät 1\.\/13 · 9–3/)
  assert.match(t, /Aluefin\. 4\./)
  assert.match(t, /pelasi 10v mikrotytöt II div \(ei tuloksia\)/)
  assert.match(t, /– ei muita/)
  assert.match(t, /Ikäluokkaa vanhemmat \(13v, 2\)/)
  assert.match(l, /Syksy 2\.\/10 · 8–2 · 515–287/)
  assert.match(l, /Kevät 6\.\/13 · 7–5 · 573–424/)
  assert.match(l, /ei tuloksia/)
  assert.match(l, /LePy Valkoinen I div/)
  assert.match(l, /LePy Sininen III div/)
  const src = await page.locator('[data-testid="bb-source"]').innerText()
  assert.match(src, /Lähde: tulospalvelu\.basket\.fi · päivitetty \d+\.\d+\. klo \d\d\.\d\d/)
  // No horizontal overflow at 390 px
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  assert.ok(overflow <= 0, `page overflows by ${overflow}px`)
  if (SHOTS) {
    await shotAt(page, topola, `${SHOTS}/02-topola-390.png`)
    await shotAt(page, lepy, `${SHOTS}/03-lepy-oranssi-390.png`)
    await page.screenshot({ path: `${SHOTS}/04-fullpage-390.png`, fullPage: true })
  }
  // One age up opens on tap
  await topola.locator('[data-testid="bb-older-toggle"]').click()
  assert.match((await topola.locator('[data-testid="bb-older"]').innerText()).replace(/\s+/g, ' '), /I div.*II div/)
  // Picker lists the three 2025-26 ToPoLa girls teams
  await topola.locator('[data-testid="bb-pick"]').click()
  const picker = topola.locator('[data-testid="bb-picker"]')
  await picker.getByRole('button', { name: /ToPoLa · 11v tytöt II div/ }).waitFor({ timeout: 30000 })
  const pickerText = (await picker.innerText()).replace(/\s+/g, ' ')
  assert.match(pickerText, /12v tytöt I div/)
  assert.match(pickerText, /12v tytöt II div/)
  assert.match(pickerText, /Tero Niskanen/)
  if (SHOTS) {
    await shotAt(page, topola.locator('[data-testid="bb-older-toggle"]'), `${SHOTS}/05-topola-one-age-up-390.png`)
    await shotAt(page, picker, `${SHOTS}/06-topola-picker-390.png`)
  }
  console.log('E2E PASS')
} catch (err) {
  failed = true
  console.error(err)
} finally {
  await browser.close()
  server?.kill()
}
process.exit(failed ? 1 : 0)
