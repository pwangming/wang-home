import { describe, it, expect, vi, afterEach } from 'vitest'
import { FOOD_LIST, FOOD_TYPES, pickFoodType } from '../../src/lib/food.js'

describe('food definitions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('has weights that add up to 100', () => {
    const total = FOOD_LIST.reduce((sum, food) => sum + food.weight, 0)
    expect(total).toBe(100)
  })

  it('returns a legal food type', () => {
    const food = pickFoodType()
    expect(FOOD_LIST).toContain(food)
  })

  it('picks food by weighted random boundaries', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.7)
      .mockReturnValueOnce(0.85)
      .mockReturnValueOnce(0.93)
      .mockReturnValueOnce(0.98)

    expect(pickFoodType()).toBe(FOOD_TYPES.NORMAL)
    expect(pickFoodType()).toBe(FOOD_TYPES.COIN)
    expect(pickFoodType()).toBe(FOOD_TYPES.SLOW)
    expect(pickFoodType()).toBe(FOOD_TYPES.GHOST)
    expect(pickFoodType()).toBe(FOOD_TYPES.DIAMOND)
  })
})
