export const FOOD_TYPES = {
  NORMAL: { id: 'normal', color: '#4ade80', score: 1, weight: 70, effect: null },
  COIN: { id: 'coin', color: '#fbbf24', score: 5, weight: 15, effect: null },
  SLOW: {
    id: 'slow',
    color: '#3b82f6',
    score: 1,
    weight: 8,
    effect: { type: 'speed', multiplier: 0.6, durationMs: 5000 }
  },
  GHOST: {
    id: 'ghost',
    color: '#a855f7',
    score: 1,
    weight: 5,
    effect: { type: 'ghost', durationMs: 3000 }
  },
  DIAMOND: { id: 'diamond', color: '#e0e7ff', score: 20, weight: 2, effect: null }
}

export const FOOD_LIST = Object.values(FOOD_TYPES)

export function pickFoodType() {
  const total = FOOD_LIST.reduce((sum, food) => sum + food.weight, 0)
  let roll = Math.random() * total

  for (const food of FOOD_LIST) {
    if (roll < food.weight) return food
    roll -= food.weight
  }

  return FOOD_TYPES.NORMAL
}
