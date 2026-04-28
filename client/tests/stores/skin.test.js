import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { DEFAULT_SKIN_ID, SKINS } from '../../src/lib/skins.js'
import { useSkinStore } from '../../src/stores/skin.js'

describe('skin Store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('starts with the default skin when nothing is stored', () => {
    const skinStore = useSkinStore()

    expect(skinStore.activeSkinId).toBe(DEFAULT_SKIN_ID)
    expect(skinStore.activeSkin).toBe(SKINS[DEFAULT_SKIN_ID])
  })

  it('switches to a free skin and persists it', () => {
    const skinStore = useSkinStore()

    expect(skinStore.setActive('retro')).toBe(true)

    expect(skinStore.activeSkinId).toBe('retro')
    expect(skinStore.activeSkin).toBe(SKINS.retro)
    expect(localStorage.getItem('activeSkin')).toBe('retro')
  })

  it('rejects locked skins without entitlements', () => {
    const skinStore = useSkinStore()

    expect(skinStore.setActive('neon_v1')).toBe(false)

    expect(skinStore.activeSkinId).toBe(DEFAULT_SKIN_ID)
    expect(localStorage.getItem('activeSkin')).toBeNull()
  })

  it('shows only free skins until entitlements are present', () => {
    const skinStore = useSkinStore()

    expect(skinStore.availableSkins.map((skin) => skin.id)).toEqual(['default', 'retro'])

    skinStore.entitlements = ['skin_pack_v1']

    expect(skinStore.availableSkins.map((skin) => skin.id)).toEqual([
      'default',
      'retro',
      'neon_v1',
      'monochrome'
    ])
  })

  it('falls back when storage contains a locked skin', () => {
    localStorage.setItem('activeSkin', 'monochrome')
    setActivePinia(createPinia())

    const skinStore = useSkinStore()

    expect(skinStore.activeSkinId).toBe('monochrome')
    expect(skinStore.activeSkin).toBe(SKINS[DEFAULT_SKIN_ID])
  })

  it('keeps session state when localStorage persistence fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const skinStore = useSkinStore()

    expect(skinStore.setActive('retro')).toBe(true)
    expect(skinStore.activeSkin).toBe(SKINS.retro)

    spy.mockRestore()
  })
})
