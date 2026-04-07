import { describe, it, expect } from '@jest/globals'
import { createLoginRateLimiter } from '../../src/middleware/rateLimit.js'

describe('Rate limiter', () => {
  it('blocks requests exceeding max', async () => {
    const limiter = createLoginRateLimiter()
    const noop = async () => {}

    for (let i = 0; i < 5; i++) {
      const ctx = { ip: '1.2.3.4', status: 200, body: null }
      await limiter(ctx, noop)
      expect(ctx.status).toBe(200)
    }

    const ctx = { ip: '1.2.3.4', status: 200, body: null }
    await limiter(ctx, noop)
    expect(ctx.status).toBe(429)
  })

  it('allows requests from different IPs', async () => {
    const limiter = createLoginRateLimiter()
    const noop = async () => {}

    for (let i = 0; i < 5; i++) {
      const ctx = { ip: `10.0.0.${i}`, status: 200, body: null }
      await limiter(ctx, noop)
      expect(ctx.status).toBe(200)
    }
  })
})
