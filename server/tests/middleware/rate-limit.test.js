import { describe, it, expect } from '@jest/globals'
import { createLoginRateLimiter, createRegisterRateLimiter, createLeaderboardRateLimiter } from '../../src/middleware/rateLimit.js'

describe('Rate limiter', () => {
  const noop = async () => {}

  describe('createLoginRateLimiter', () => {
    it('blocks requests exceeding max (5 per window)', async () => {
      const limiter = createLoginRateLimiter()

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

      for (let i = 0; i < 5; i++) {
        const ctx = { ip: `10.0.0.${i}`, status: 200, body: null }
        await limiter(ctx, noop)
        expect(ctx.status).toBe(200)
      }
    })
  })

  describe('createRegisterRateLimiter', () => {
    it('blocks requests exceeding max (3 per window)', async () => {
      const limiter = createRegisterRateLimiter()

      for (let i = 0; i < 3; i++) {
        const ctx = { ip: '2.3.4.5', status: 200, body: null }
        await limiter(ctx, noop)
        expect(ctx.status).toBe(200)
      }

      const ctx = { ip: '2.3.4.5', status: 200, body: null }
      await limiter(ctx, noop)
      expect(ctx.status).toBe(429)
    })

    it('allows requests from different IPs', async () => {
      const limiter = createRegisterRateLimiter()

      for (let i = 0; i < 3; i++) {
        const ctx = { ip: `20.0.0.${i}`, status: 200, body: null }
        await limiter(ctx, noop)
        expect(ctx.status).toBe(200)
      }
    })
  })

  describe('createLeaderboardRateLimiter', () => {
    it('blocks requests exceeding max (10 per window)', async () => {
      const limiter = createLeaderboardRateLimiter()

      for (let i = 0; i < 10; i++) {
        const ctx = { ip: '3.4.5.6', state: { user: { id: 'user-1' } }, status: 200, body: null }
        await limiter(ctx, noop)
        expect(ctx.status).toBe(200)
      }

      const ctx = { ip: '3.4.5.6', state: { user: { id: 'user-1' } }, status: 200, body: null }
      await limiter(ctx, noop)
      expect(ctx.status).toBe(429)
    })

    it('uses user id as rate limit key, not IP', async () => {
      const limiter = createLeaderboardRateLimiter()

      // Same IP but different user IDs should have separate limits
      for (let i = 0; i < 10; i++) {
        const ctx = { ip: '3.4.5.6', state: { user: { id: 'user-a' } }, status: 200, body: null }
        await limiter(ctx, noop)
        expect(ctx.status).toBe(200)
      }

      // Different user on same IP should still be allowed
      const ctx = { ip: '3.4.5.6', state: { user: { id: 'user-b' } }, status: 200, body: null }
      await limiter(ctx, noop)
      expect(ctx.status).toBe(200)
    })

    it('falls back to IP when user is not set', async () => {
      const limiter = createLeaderboardRateLimiter()

      for (let i = 0; i < 10; i++) {
        const ctx = { ip: '4.5.6.7', state: {}, status: 200, body: null }
        await limiter(ctx, noop)
        expect(ctx.status).toBe(200)
      }

      const ctx = { ip: '4.5.6.7', state: {}, status: 200, body: null }
      await limiter(ctx, noop)
      expect(ctx.status).toBe(429)
    })
  })
})
