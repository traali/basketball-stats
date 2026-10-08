import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createFavoritesStore, parseFavorites, FAVORITES_KEY } from '../src/utils/favoritesStore.ts'
import {
  federationClubUrl,
  federationGroupUrl,
  federationMatchUrl,
  federationTeamUrl,
} from '../src/utils/federationLinks.ts'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => (data[k] = String(v)) }
}

describe('favourites saved on the phone', () => {
  it('survive a reload (a new store over the same storage)', () => {
    const storage = memoryStorage()
    const a = createFavoritesStore(storage)
    a.toggle({ kind: 'team', id: '5751397', name: 'LePy', subtitle: '16-vuotiaat pojat' })
    a.toggle({ kind: 'player', id: '16639', name: 'Etu639 Suku639' })
    a.toggle({ kind: 'club', id: '1447', name: 'Leppävaaran Pyrintö' })
    const b = createFavoritesStore(storage)
    assert.deepEqual(b.get().map((f) => `${f.kind}:${f.id}`), ['club:1447', 'player:16639', 'team:5751397'])
  })

  it('toggle removes an existing favourite and notifies listeners', () => {
    const store = createFavoritesStore(memoryStorage())
    let calls = 0
    store.subscribe(() => calls++)
    const item = { kind: 'player', id: '16639', name: 'P' }
    store.toggle(item)
    store.toggle(item)
    assert.equal(store.get().length, 0)
    assert.equal(calls, 2)
  })

  it('loads v1 data and drops invalid or duplicate entries', () => {
    const raw = JSON.stringify([
      { kind: 'team', id: '5751397', name: 'LePy' },
      { kind: 'team', id: '5751397', name: 'dup' },
      { kind: 'team', id: 'custom-1', name: 'Fake team' },
      { kind: 'player', id: '', name: 'No id' },
      { kind: 'coach', id: '1', name: 'Unknown kind' },
      null,
    ])
    assert.deepEqual(parseFavorites(raw), [{ kind: 'team', id: '5751397', name: 'LePy' }])
    assert.deepEqual(parseFavorites('not json'), [])
  })

  it('rejects a non-numeric id instead of saving it', () => {
    const storage = memoryStorage()
    const store = createFavoritesStore(storage)
    store.toggle({ kind: 'team', id: 'abc', name: 'X' })
    assert.equal(store.get().length, 0)
    assert.equal(storage.data[FAVORITES_KEY], undefined)
  })

  it('keeps working when storage throws', () => {
    const store = createFavoritesStore({
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('quota')
      },
    })
    store.toggle({ kind: 'club', id: '1447', name: 'LePy' })
    assert.equal(store.get().length, 1)
  })
})

describe('federation links: exact pages, never guessed', () => {
  it('builds tulospalvelu.basket.fi routes', () => {
    assert.equal(federationMatchUrl('1009819'), 'https://tulospalvelu.basket.fi/match/1009819')
    assert.equal(federationTeamUrl('5751397'), 'https://tulospalvelu.basket.fi/team/5751397')
    assert.equal(federationClubUrl('1447'), 'https://tulospalvelu.basket.fi/club/1447')
    assert.equal(
      federationGroupUrl('etekp2627', '85', '303075'),
      'https://tulospalvelu.basket.fi/category/85!etekp2627/group/303075/',
    )
  })

  it('returns nothing when an id is missing or not an id', () => {
    assert.equal(federationMatchUrl(''), undefined)
    assert.equal(federationTeamUrl(undefined), undefined)
    assert.equal(federationClubUrl('LePy'), undefined)
    assert.equal(federationGroupUrl('etekp2627', '85', ''), undefined)
  })
})
