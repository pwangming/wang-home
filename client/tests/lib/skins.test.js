import { describe, it, expect } from 'vitest'
import { SKINS, SKIN_LIST, DEFAULT_SKIN_ID, isSkinUnlocked } from '../../src/lib/skins.js'

describe('skin definitions', () => {
  it('has the default skin available for fallback', () => {
    expect(SKINS[DEFAULT_SKIN_ID]).toBeTruthy()
    expect(SKINS[DEFAULT_SKIN_ID].free).toBe(true)
  })

  it('defines two free skins and two locked placeholders', () => {
    expect(SKIN_LIST.filter((skin) => skin.free)).toHaveLength(2)
    expect(SKIN_LIST.filter((skin) => !skin.free)).toHaveLength(2)
  })

  it('keeps each food type distinguishable in every skin', () => {
    for (const skin of SKIN_LIST) {
      expect(Object.keys(skin.food).sort()).toEqual(['coin', 'diamond', 'ghost', 'normal', 'slow'])
    }
  })

  it('checks future entitlement unlocks without payment APIs', () => {
    expect(isSkinUnlocked(SKINS.neon_v1, [])).toBe(false)
    expect(isSkinUnlocked(SKINS.neon_v1, ['skin_pack_v1'])).toBe(true)
  })
})
