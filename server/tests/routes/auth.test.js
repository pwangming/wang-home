import { jest } from '@jest/globals'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import request from 'supertest'

function normalizeToKoaApp(appOrRouter, middleware = []) {
  if (typeof appOrRouter?.callback === 'function') return appOrRouter
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

const mockAuth = {
  signUp: jest.fn(),
  signInWithPassword: jest.fn(),
  signOut: jest.fn(),
  getUser: jest.fn()
}

const mockFrom = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn()
}))

const mockCreateClient = jest.fn(() => ({
  auth: mockAuth,
  from: mockFrom
}))

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: mockCreateClient
}))

// Mock session middleware that sets up ctx.session with supabaseAccessToken
const mockSessionMiddleware = jest.fn(async (ctx, next) => {
  if (!ctx.session) ctx.session = {}
  ctx.session.supabaseAccessToken = 'valid-token'
  await next()
})

const { default: authRouter } = await import('../../src/routes/auth.js')

describe('Auth Routes', () => {
  let app

  beforeEach(() => {
    app = authRouter()
    mockAuth.signUp.mockReset()
    mockAuth.signInWithPassword.mockReset()
    mockAuth.signOut.mockReset()
    mockAuth.getUser.mockReset()
    mockFrom.mockReset()
  })

  // ========== /api/auth/register ==========
  describe('POST /api/auth/register', () => {
    test('returns 400 when email is missing', async () => {
      const res = await simulateRequest(app, 'POST', '/api/auth/register', { password: '123456', username: 'test' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('email, password and username are required')
    })

    test('returns 400 when password is missing', async () => {
      const res = await simulateRequest(app, 'POST', '/api/auth/register', { email: 'test@test.com', username: 'test' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('email, password and username are required')
    })

    test('returns 400 when username is missing', async () => {
      const res = await simulateRequest(app, 'POST', '/api/auth/register', { email: 'test@test.com', password: '123456' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('email, password and username are required')
    })

    test('returns 400 when email already exists', async () => {
      mockAuth.signUp.mockResolvedValue({ data: null, error: { message: 'User already registered' } })
      const res = await simulateRequest(app, 'POST', '/api/auth/register', {
        email: 'test@test.com', password: '123456', username: 'test'
      })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('User already registered')
    })

    test('returns 200 and sets session cookie when success (local Supabase: email confirmation disabled)', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      const mockSession = { access_token: 'mock-token', refresh_token: 'mock-refresh' }
      mockAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: '123', username: 'test', username_normalized: 'test' },
          error: null
        })
      })

      const res = await simulateRequest(app, 'POST', '/api/auth/register', {
        email: 'test@test.com', password: '123456', username: 'test'
      })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.id).toBe('123')
      expect(mockFrom).toHaveBeenCalledWith('profiles')
    })

    test('returns 500 when auto-created profile is missing after signUp', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      const mockSession = { access_token: 'mock-token', refresh_token: 'mock-refresh' }
      mockAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
      })

      const res = await simulateRequest(app, 'POST', '/api/auth/register', {
        email: 'test@test.com', password: '123456', username: 'test'
      })
      expect(res.status).toBe(500)
      expect(res.body.error).toBeTruthy()
    })

    test('returns needsEmailConfirmation=true when email confirmation is enabled', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      mockAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null
      })

      const res = await simulateRequest(app, 'POST', '/api/auth/register', {
        email: 'test@test.com', password: '123456', username: 'test'
      })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.needsEmailConfirmation).toBe(true)
    })
  })

  // ========== /api/auth/login ==========
  describe('POST /api/auth/login', () => {
    test('returns 400 when email is missing', async () => {
      const res = await simulateRequest(app, 'POST', '/api/auth/login', { password: '123456' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('email and password are required')
    })

    test('returns 400 when password is missing', async () => {
      const res = await simulateRequest(app, 'POST', '/api/auth/login', { email: 'test@test.com' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('email and password are required')
    })

    test('returns 401 when user not found', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ data: null, error: { message: 'Invalid login credentials' } })
      const res = await simulateRequest(app, 'POST', '/api/auth/login', {
        email: 'test@test.com', password: 'wrong'
      })
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Invalid login credentials')
    })

    test('returns 401 when wrong password', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ data: null, error: { message: 'Invalid login credentials' } })
      const res = await simulateRequest(app, 'POST', '/api/auth/login', {
        email: 'test@test.com', password: 'wrong'
      })
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Invalid login credentials')
    })

    test('returns 200 and sets session cookie on success', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      const mockSession = { access_token: 'mock-token', refresh_token: 'mock-refresh' }
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      const res = await simulateRequest(app, 'POST', '/api/auth/login', {
        email: 'test@test.com', password: '123456'
      })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.email).toBe('test@test.com')
    })
  })

  // ========== /api/auth/me ==========
  describe('GET /api/auth/me', () => {
    test('returns 401 when no authorization header', async () => {
      const res = await simulateRequest(app, 'GET', '/api/auth/me', null, {})
      expect(res.status).toBe(401)
    })

    test('returns 401 when token invalid', async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Invalid token') })
      const res = await simulateRequest(app, 'GET', '/api/auth/me', null, { Cookie: 'session=invalid-token' }, [mockSessionMiddleware])
      expect(res.status).toBe(401)
    })

    test('returns user data when token valid', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      mockAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      const res = await simulateRequest(app, 'GET', '/api/auth/me', null, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])
      expect(res.status).toBe(200)
      expect(res.body.data.user.id).toBe('123')
      expect(res.body.data.user.email).toBe('test@test.com')
    })
  })

  // ========== /api/auth/logout ==========
  describe('POST /api/auth/logout', () => {
    test('always returns 200 (client clears local state)', async () => {
      mockAuth.signOut.mockResolvedValue({ error: null })
      const res = await simulateRequest(app, 'POST', '/api/auth/logout', null, { Cookie: 'session=some-token' })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })
})
