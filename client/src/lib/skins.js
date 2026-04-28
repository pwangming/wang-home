export const DEFAULT_SKIN_ID = 'default'

export const SKINS = {
  default: {
    id: DEFAULT_SKIN_ID,
    name: '经典绿',
    free: true,
    snake: '#4ade80',
    snakeHead: '#22c55e',
    food: {
      normal: '#4ade80',
      coin: '#fbbf24',
      slow: '#3b82f6',
      ghost: '#a855f7',
      diamond: '#e0e7ff'
    },
    bg: '#0f172a',
    grid: '#1e293b'
  },
  retro: {
    id: 'retro',
    name: '复古绿屏',
    free: true,
    snake: '#76ff03',
    snakeHead: '#ccff00',
    food: {
      normal: '#76ff03',
      coin: '#ffeb3b',
      slow: '#00e5ff',
      ghost: '#b388ff',
      diamond: '#ffffff'
    },
    bg: '#000000',
    grid: '#143d14'
  },
  neon_v1: {
    id: 'neon_v1',
    name: '霓虹光辉',
    free: false,
    entitlementId: 'skin_pack_v1',
    snake: '#ec4899',
    snakeHead: '#f472b6',
    food: {
      normal: '#ec4899',
      coin: '#fbbf24',
      slow: '#06b6d4',
      ghost: '#8b5cf6',
      diamond: '#ffffff'
    },
    bg: '#1e1b4b',
    grid: '#4338ca',
    unlockLabel: '暂未开放'
  },
  monochrome: {
    id: 'monochrome',
    name: '极简黑白',
    free: false,
    entitlementId: 'skin_pack_v1',
    snake: '#e5e5e5',
    snakeHead: '#ffffff',
    food: {
      normal: '#e5e5e5',
      coin: '#ffffff',
      slow: '#a3a3a3',
      ghost: '#737373',
      diamond: '#ffffff'
    },
    bg: '#171717',
    grid: '#404040',
    unlockLabel: '暂未开放'
  }
}

export const SKIN_LIST = Object.values(SKINS)

export function isSkinUnlocked(skin, entitlements = []) {
  if (!skin) return false
  return skin.free || entitlements.includes(skin.entitlementId)
}
