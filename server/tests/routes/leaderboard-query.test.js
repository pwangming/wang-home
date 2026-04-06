import { describe, it, expect } from '@jest/globals'

describe('Leaderboard pagination logic', () => {
  it('calculates correct range from page and pageSize', () => {
    const page = 2
    const pageSize = 20
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    expect(from).toBe(20)
    expect(to).toBe(39)
  })

  it('clamps pageSize to max 100', () => {
    const rawPageSize = 200
    const pageSize = Math.min(rawPageSize, 100)
    expect(pageSize).toBe(100)
  })
})
