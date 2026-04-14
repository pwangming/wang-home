import { jest } from '@jest/globals'

// Mock supabase before importing app
const mockGetUser = jest.fn()
const mockSetSession = jest.fn()
const mockFrom = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockResolvedValue({ data: [], error: null }),
  eq: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  insert: jest.fn().mockResolvedValue({ data: null, error: null }),
  update: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  count: jest.fn().mockReturnThis()
}))

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: mockGetUser, setSession: mockSetSession },
    from: mockFrom
  }))
}))

// Prevent app.listen from actually binding a port
const originalListen = (await import('koa')).default.prototype.listen
let app

beforeAll(async () => {
  // Temporarily stub listen to prevent port binding
  const Koa = (await import('koa')).default
  Koa.prototype.listen = jest.fn(function () { return { close: jest.fn() } })

  const mod = await import('../src/index.js')
  app = mod.default

  // Restore original listen
  Koa.prototype.listen = originalListen
})

const request = (await import('supertest')).default

describe('App integration', () => {
  describe('GET /api/health', () => {
    it('returns status ok', async () => {
      const res = await request(app.callback()).get('/api/health')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ status: 'ok' })
    })
  })

  describe('CORS middleware', () => {
    it('sets CORS headers for allowed origin', async () => {
      const res = await request(app.callback())
        .get('/api/health')
        .set('Origin', 'http://localhost:3000')
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000')
      expect(res.headers['access-control-allow-credentials']).toBe('true')
    })

    it('does not set CORS headers for disallowed origin', async () => {
      const res = await request(app.callback())
        .get('/api/health')
        .set('Origin', 'http://evil.com')
      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    })

    it('returns 204 for OPTIONS preflight', async () => {
      const res = await request(app.callback())
        .options('/api/health')
        .set('Origin', 'http://localhost:3000')
      expect(res.status).toBe(204)
    })
  })

  describe('Security headers', () => {
    it('includes security headers on responses', async () => {
      const res = await request(app.callback()).get('/api/health')
      expect(res.headers['x-content-type-options']).toBe('nosniff')
      expect(res.headers['x-frame-options']).toBe('DENY')
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    })
  })

  describe('Supabase context', () => {
    it('attaches supabase to context for route handlers', async () => {
      // The leaderboard GET route uses ctx.supabase — if it works, supabase is attached
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [], error: null })
      })
      const res = await request(app.callback()).get('/api/leaderboard?page=1&pageSize=10')
      expect(res.status).toBe(200)
    })
  })

  describe('404 fallthrough', () => {
    it('returns 404 for unknown routes', async () => {
      const res = await request(app.callback()).get('/api/nonexistent')
      expect(res.status).toBe(404)
    })
  })
})
