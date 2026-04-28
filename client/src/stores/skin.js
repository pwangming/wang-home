import { defineStore } from 'pinia'
import { DEFAULT_SKIN_ID, SKINS, SKIN_LIST, isSkinUnlocked } from '../lib/skins.js'

const STORAGE_KEY = 'activeSkin'

function readStoredSkinId() {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_SKIN_ID
  } catch {
    return DEFAULT_SKIN_ID
  }
}

function persistSkinId(skinId) {
  try {
    localStorage.setItem(STORAGE_KEY, skinId)
  } catch {
    // Skin selection still works for the current session.
  }
}

export const useSkinStore = defineStore('skin', {
  state: () => ({
    activeSkinId: readStoredSkinId(),
    entitlements: []
  }),

  getters: {
    activeSkin: (state) => {
      const skin = SKINS[state.activeSkinId]
      return isSkinUnlocked(skin, state.entitlements) ? skin : SKINS[DEFAULT_SKIN_ID]
    },
    availableSkins: (state) => {
      return SKIN_LIST.filter((skin) => isSkinUnlocked(skin, state.entitlements))
    },
    allSkins: () => SKIN_LIST
  },

  actions: {
    setActive(skinId) {
      const skin = SKINS[skinId]
      if (!isSkinUnlocked(skin, this.entitlements)) return false

      this.activeSkinId = skinId
      persistSkinId(skinId)
      return true
    }
  }
})
