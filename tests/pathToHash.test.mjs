import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToHashUrl } from '../src/utils/pathToHash.ts'

describe('path-form links open the hash route', () => {
  it('rewrites app routes to the hash form and keeps the query string', () => {
    assert.equal(pathToHashUrl('/match/970996', '', ''), '/#/match/970996')
    assert.equal(pathToHashUrl('/match/970996/', '?embed=true', ''), '/#/match/970996?embed=true')
    assert.equal(pathToHashUrl('/team/5751397', '', ''), '/#/team/5751397')
    assert.equal(pathToHashUrl('/player/16639', '', ''), '/#/player/16639')
    assert.equal(pathToHashUrl('/club/1447', '', ''), '/#/club/1447')
    assert.equal(pathToHashUrl('/group/etekp2627/85/303075', '', ''), '/#/group/etekp2627/85/303075')
    assert.equal(pathToHashUrl('/search', '?q=LePy', ''), '/#/search?q=LePy')
  })

  it('leaves the root, files, unknown paths and existing hash routes alone', () => {
    assert.equal(pathToHashUrl('/', '', ''), null)
    assert.equal(pathToHashUrl('/index.html', '', ''), null)
    assert.equal(pathToHashUrl('/mcp-basket.html', '?matchId=1', ''), null)
    assert.equal(pathToHashUrl('/assets/index-abc.js', '', ''), null)
    assert.equal(pathToHashUrl('/match/1', '', '#/match/970996'), null)
  })

  it('is self-contained, so the inlined copy in index.html behaves the same', () => {
    const inlined = new Function(`return (${pathToHashUrl.toString()})`)()
    assert.equal(inlined('/match/970996', '?a=1', ''), '/#/match/970996?a=1')
    assert.equal(inlined('/', '', ''), null)
  })

  it('vite builds absolute asset paths and inlines the redirect', () => {
    const cfg = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')
    assert.match(cfg, /base: '\/'/)
    assert.doesNotMatch(cfg, /base: '\.\/'/)
    assert.match(cfg, /pathToHashUrl\.toString\(\)/)
    assert.match(cfg, /plugins: \[react\(\), pathToHashPlugin\]/)
  })
})
