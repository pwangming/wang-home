import { jest } from '@jest/globals'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import request from 'supertest'

function normalizeToKoaApp(appOrRouter, middleware = []) {
  const app = new Koa()
  for (const m of middleware) {
    app.use(m)
  }
  app.use(bodyParser())
  app.use(appOrRouter.routes())
  app.use(appOrRouter.allowedMethods())
  return app
}

async function simulateRequest(appOrRouter, method, path, body = null, headers = {}, middleware = []) {
  const app = normalizeToKoaApp(appOrRouter, middleware)
  let req = request(app.callback())[method.toLowerCase()](path)
  // Add default Origin header for write methods so CSRF middleware passes in tests
  if (['post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
    req = req.set('Origin', 'http://localhost:3000')
  }
  for (const [key, value] of Object.entries(headers)) {
    req = req.set(key, value)
  }
  if (body !== null) req = req.send(body)
  const res = await req
  return { status: res.status, body: res.body }
}

// Mock auth middleware
const mockAuthMiddleware = jest.fn(async (ctx, next) => {
  const cookie = ctx.headers.cookie || ''
  if (!cookie.includes('session=')) {
    ctx.status = 401
    ctx.body = { error: 'Unauthorized' }
    return
  }
  // Set up ctx.session to simulate koa-session middleware
  if (!ctx.session) ctx.session = {}
  ctx.session.supabaseAccessToken = 'valid-token'
  ctx.state.user = { id: 'test-user-id', email: 'test@test.com' }
  await next()
})

// Mock Supabase client
const mockGetUser = jest.fn()

const mockFrom = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn(),
  maybeSingle: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  count: jest.fn().mockReturnThis()
}))

const mockCreateClient = jest.fn(() => ({
  auth: { getUser: mockGetUser },
  from: mockFrom
}))

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: mockCreateClient
}))

const leaderboardRouter = (await import('../../src/routes/leaderboard.js')).default

describe('Leaderboard Routes', () => {
  let app

  beforeEach(() => {
    mockFrom.mockReset()
    mockGetUser.mockReset()
    // Configure getUser to return valid user for authenticated requests
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@test.com' } },
      error: null
    })
    mockAuthMiddleware.mockReset()
    mockAuthMiddleware.mockImplementation(async (ctx, next) => {
      const cookie = ctx.headers.cookie || ''
      if (!cookie.includes('session=')) {
        ctx.status = 401
        ctx.body = { error: 'Unauthorized' }
        return
      }
      if (!ctx.session) ctx.session = {}
      ctx.session.supabaseAccessToken = 'valid-token'
      ctx.state.user = { id: 'test-user-id', email: 'test@test.com' }
      await next()
    })
  })

  // ========== GET /api/leaderboard ==========
  describe('GET /api/leaderboard', () => {
    test('returns paginated ranking ordered by best_score desc', async () => {
      const mockData = [
        { user_id: '1', username: 'alice', best_score: 100, best_score_at: '2024-01-01' },
        { user_id: '2', username: 'bob', best_score: 80, best_score_at: '2024-01-02' }
      ]
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockData, error: null })
      })

      app = leaderboardRouter()
      const res = await simulateRequest(app, 'GET', '/api/leaderboard?page=1&pageSize=20')
      expect(res.status).toBe(200)
      expect(res.body.data.leaderboard).toEqual(mockData)
    })

    test('returns empty array when no scores', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [], error: null })
      })

      app = leaderboardRouter()
      const res = await simulateRequest(app, 'GET', '/api/leaderboard?page=1&pageSize=20')
      expect(res.status).toBe(200)
      expect(res.body.data.leaderboard).toEqual([])
    })

    test('verifies correct sort order fields', async () => {
      const mockOrder = jest.fn().mockReturnThis()
      const mockRange = jest.fn().mockResolvedValue({ data: [], error: null })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: mockOrder,
        range: mockRange
      })

      app = leaderboardRouter()
      await simulateRequest(app, 'GET', '/api/leaderboard?page=1&pageSize=20')

      expect(mockOrder).toHaveBeenCalledTimes(3)
      expect(mockOrder).toHaveBeenNthCalledWith(1, 'best_score', { ascending: false })
      expect(mockOrder).toHaveBeenNthCalledWith(2, 'best_score_at', { ascending: true })
      expect(mockOrder).toHaveBeenNthCalledWith(3, 'user_id', { ascending: true })
    })

    test('returns 500 when database query fails', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
      })

      app = leaderboardRouter()
      const res = await simulateRequest(app, 'GET', '/api/leaderboard?page=1&pageSize=20')
      expect(res.status).toBe(500)
      expect(res.body.error).toBe('Failed to fetch leaderboard')
    })
  })

  // ========== GET /api/leaderboard/rank/me ==========
  describe('GET /api/leaderboard/rank/me', () => {
    test('returns 401 when no authorization header', async () => {
      app = leaderboardRouter()
      const res = await simulateRequest(app, 'GET', '/api/leaderboard/rank/me', null, {})
      expect(res.status).toBe(401)
    })

    test('returns null when user has no score', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
      })

      app = leaderboardRouter()
      const res = await simulateRequest(app, 'GET', '/api/leaderboard/rank/me', null, {
        Cookie: 'session=valid-token'
      }, [mockAuthMiddleware])
      expect(res.status).toBe(200)
      expect(res.body.data.rank).toBeNull()
    })

    test('returns 500 when database query fails', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
      })

      app = leaderboardRouter()
      const res = await simulateRequest(app, 'GET', '/api/leaderboard/rank/me', null, {
        Cookie: 'session=valid-token'
      }, [mockAuthMiddleware])
      expect(res.status).toBe(500)
      expect(res.body.error).toBe('Failed to fetch rank')
    })

    test('returns rank when user has score', async () => {
      const mockRankData = {
        user_id: 'test-user-id',
        username: 'testuser',
        best_score: 50,
        best_score_at: '2024-01-01'
      }

      // The rank endpoint makes TWO calls to from():
      // 1. from().select().eq().maybeSingle() - get user's best score
      // 2. from().select().gt().count() - count users with higher scores
      let callCount = 0
      mockFrom.mockImplementation(() => {
        const currentCall = callCount++
        if (currentCall === 0) {
          // First call: user's best score query
          const chain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: mockRankData, error: null })
          }
          return chain
        }
        // Second call: count users with higher scores
        // After .gt(), the count property should be accessible for destructuring
        const gtResult = { count: 0 }
        const chain = {
          select: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnValue(gtResult)
        }
        return chain
      })

      app = leaderboardRouter()
      const res = await simulateRequest(app, 'GET', '/api/leaderboard/rank/me', null, {
        Cookie: 'session=valid-token'
      }, [mockAuthMiddleware])
      expect(res.status).toBe(200)
      expect(res.body.data.rank).toEqual({ ...mockRankData, rank: 1 })
    })
  })

  // ========== POST /api/leaderboard ==========
  describe('POST /api/leaderboard', () => {
    test('returns 401 when unauthenticated', async () => {
      app = leaderboardRouter()
      const res = await simulateRequest(app, 'POST', '/api/leaderboard', {
        score: 100,
        speedMultiplier: 1.0,
        scoreMultiplier: 1.0
      }, {})
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Missing authenticated session')
    })

    test('returns 400 when score is missing', async () => {
      app = leaderboardRouter()
      const res = await simulateRequest(app, 'POST', '/api/leaderboard', {
        speedMultiplier: 1.0,
        scoreMultiplier: 1.0
      }, { Cookie: 'session=valid-token' }, [mockAuthMiddleware])
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('score, speedMultiplier and scoreMultiplier are required')
    })

    test('returns 400 when score is negative', async () => {
      app = leaderboardRouter()
      const res = await simulateRequest(app, 'POST', '/api/leaderboard', {
        score: -10,
        speedMultiplier: 1.0,
        scoreMultiplier: 1.0
      }, { Cookie: 'session=valid-token' }, [mockAuthMiddleware])
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('score must be a non-negative integer')
    })

    test('returns 400 when speedMultiplier is invalid', async () => {
      app = leaderboardRouter()
      const res = await simulateRequest(app, 'POST', '/api/leaderboard', {
        score: 100,
        speedMultiplier: 0,
        scoreMultiplier: 1.0
      }, { Cookie: 'session=valid-token' }, [mockAuthMiddleware])
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('speedMultiplier must be a positive number')
    })

    test('inserts score via user-scoped client on success', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'session-id', score: 100 },
        error: null
      })
      mockFrom.mockReturnValue({
        insert: mockInsert
      })

      app = leaderboardRouter()
      const res = await simulateRequest(app, 'POST', '/api/leaderboard', {
        score: 100,
        speedMultiplier: 1.5,
        scoreMultiplier: 2.0
      }, { Cookie: 'session=valid-token' }, [mockAuthMiddleware])
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(mockInsert).toHaveBeenCalled()
    })

    test('returns 400 when speedMultiplier is not in valid list', async () => {
      app = leaderboardRouter()
      const res = await simulateRequest(app, 'POST', '/api/leaderboard', {
        score: 100,
        speedMultiplier: 1.3,
        scoreMultiplier: 1.5
      }, { Cookie: 'session=valid-token' }, [mockAuthMiddleware])
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('speedMultiplier must be one of: 1.0, 1.2, 1.5, 2.0')
    })

    test('returns 400 when scoreMultiplier does not match speedMultiplier mapping', async () => {
      app = leaderboardRouter()
      const res = await simulateRequest(app, 'POST', '/api/leaderboard', {
        score: 100,
        speedMultiplier: 1.5,
        scoreMultiplier: 1.0
      }, { Cookie: 'session=valid-token' }, [mockAuthMiddleware])
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('scoreMultiplier does not match speedMultiplier mapping')
    })

    test('returns 400 when score exceeds reasonable limit', async () => {
      app = leaderboardRouter()
      const res = await simulateRequest(app, 'POST', '/api/leaderboard', {
        score: 10000,
        speedMultiplier: 1.0,
        scoreMultiplier: 1.0
      }, { Cookie: 'session=valid-token' }, [mockAuthMiddleware])
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Score exceeds reasonable limit')
    })
  })

  // ========== POST /api/leaderboard (sessionId two-phase flow) ==========
  describe('POST /api/leaderboard with sessionId (two-phase)', () => {
    test('completes session successfully with valid sessionId', async () => {
      const mockSession = {
        id: 'test-session-id',
        is_verified: false,
        ended_at: null
      }
      let callCount = 0
      mockFrom.mockImplementation(() => {
        const currentCall = callCount++
        if (currentCall === 0) {
          // First call: SELECT for session verification
          return {
            select: jest.fn(function() { return this }),
            eq: jest.fn(function() { return this }),
            maybeSingle: jest.fn().mockResolvedValue({ data: mockSession, error: null })
          }
        } else {
          // Second call: UPDATE chain — .from().update().eq().eq()
          // The second .eq() is the terminal call that returns the result
          let eqCallCount = 0
          const updateChain = {
            update: jest.fn(() => updateChain),
            eq: jest.fn(() => {
              eqCallCount++
              if (eqCallCount >= 2) {
                return Promise.resolve({ error: null })
              }
              return updateChain
            })
          }
          return updateChain
        }
      })

      app = leaderboardRouter()
      const res = await simulateRequest(app, 'POST', '/api/leaderboard', {
        sessionId: 'test-session-id',
        score: 100,
        speedMultiplier: 1.0,
        scoreMultiplier: 1.0,
        durationMs: 30000
      }, { Cookie: 'session=valid-token' }, [mockAuthMiddleware])
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    test('returns 400 when sessionId is invalid or expired', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
      })

      app = leaderboardRouter()
      const res = await simulateRequest(app, 'POST', '/api/leaderboard', {
        sessionId: 'invalid-session-id',
        score: 100,
        speedMultiplier: 1.0,
        scoreMultiplier: 1.0
      }, { Cookie: 'session=valid-token' }, [mockAuthMiddleware])
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Invalid or expired game session')
    })

    test('returns 409 when score already submitted for session', async () => {
      const mockSession = {
        id: 'test-session-id',
        is_verified: true,
        ended_at: '2024-01-01'
      }
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockSession, error: null })
      })

      app = leaderboardRouter()
      const res = await simulateRequest(app, 'POST', '/api/leaderboard', {
        sessionId: 'test-session-id',
        score: 100,
        speedMultiplier: 1.0,
        scoreMultiplier: 1.0
      }, { Cookie: 'session=valid-token' }, [mockAuthMiddleware])
      expect(res.status).toBe(409)
      expect(res.body.error).toBe('Score already submitted for this session')
    })

    test('returns 400 when durationMs is too short', async () => {
      const mockSession = {
        id: 'test-session-id',
        is_verified: false,
        ended_at: null
      }
      mockFrom.mockImplementation(() => {
        const chain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: mockSession, error: null })
        }
        return chain
      })

      app = leaderboardRouter()
      const res = await simulateRequest(app, 'POST', '/api/leaderboard', {
        sessionId: 'test-session-id',
        score: 100,
        speedMultiplier: 1.0,
        scoreMultiplier: 1.0,
        durationMs: 500
      }, { Cookie: 'session=valid-token' }, [mockAuthMiddleware])
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('durationMs must be between 1000 and 600000')
    })

    test('returns 400 when durationMs is too long', async () => {
      const mockSession = {
        id: 'test-session-id',
        is_verified: false,
        ended_at: null
      }
      mockFrom.mockImplementation(() => {
        const chain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: mockSession, error: null })
        }
        return chain
      })

      app = leaderboardRouter()
      const res = await simulateRequest(app, 'POST', '/api/leaderboard', {
        sessionId: 'test-session-id',
        score: 100,
        speedMultiplier: 1.0,
        scoreMultiplier: 1.0,
        durationMs: 700000
      }, { Cookie: 'session=valid-token' }, [mockAuthMiddleware])
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('durationMs must be between 1000 and 600000')
    })

    test('returns 500 when update fails', async () => {
      const mockSession = {
        id: 'test-session-id',
        is_verified: false,
        ended_at: null
      }
      let callCount = 0
      mockFrom.mockImplementation(() => {
        const currentCall = callCount++
        if (currentCall === 0) {
          // First call: SELECT for session verification
          return {
            select: jest.fn(function() { return this }),
            eq: jest.fn(function() { return this }),
            maybeSingle: jest.fn().mockResolvedValue({ data: mockSession, error: null })
          }
        } else {
          // Second call: UPDATE chain — .from().update().eq().eq()
          let eqCallCount = 0
          const updateChain = {
            update: jest.fn(() => updateChain),
            eq: jest.fn(() => {
              eqCallCount++
              if (eqCallCount >= 2) {
                return Promise.resolve({ error: { message: 'Update failed' } })
              }
              return updateChain
            })
          }
          return updateChain
        }
      })

      app = leaderboardRouter()
      const res = await simulateRequest(app, 'POST', '/api/leaderboard', {
        sessionId: 'test-session-id',
        score: 100,
        speedMultiplier: 1.0,
        scoreMultiplier: 1.0
      }, { Cookie: 'session=valid-token' }, [mockAuthMiddleware])
      expect(res.status).toBe(500)
      expect(res.body.error).toBe('Failed to submit score')
    })
  })
})
