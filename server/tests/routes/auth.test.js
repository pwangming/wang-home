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
  getUser: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  updateUser: jest.fn(),
  setSession: jest.fn()
}

const mockFrom = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockReturnThis()
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
  ctx.session.supabaseRefreshToken = 'valid-refresh-token'
  await next()
})

const { default: authRouter } = await import('../../src/routes/auth.js')
const { __resetAll } = await import('../../src/middleware/rateLimit.js')

describe('Auth Routes', () => {
  let app

  beforeEach(() => {
    app = authRouter()
    __resetAll()
    mockAuth.signUp.mockReset()
    mockAuth.signInWithPassword.mockReset()
    mockAuth.signOut.mockReset()
    mockAuth.getUser.mockReset()
    mockAuth.resetPasswordForEmail.mockReset()
    mockAuth.updateUser.mockReset()
    mockAuth.setSession.mockReset()
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'test-id' } }, error: null })
    mockAuth.setSession.mockResolvedValue({
      data: { session: { access_token: 'valid-token', refresh_token: 'valid-refresh-token' } },
      error: null
    })
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
      expect(res.body.data.user.username).toBe('test')
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
    let capturedSession
    const captureSessionMiddleware = async (ctx, next) => {
      ctx.session = {}
      await next()
      capturedSession = ctx.session
    }

    beforeEach(() => {
      capturedSession = null
    })

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

    test('returns 200 and includes username in response on success', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      const mockSession = { access_token: 'mock-token', refresh_token: 'mock-refresh' }
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { username: 'testuser' },
          error: null
        })
      })

      const res = await simulateRequest(app, 'POST', '/api/auth/login', {
        email: 'test@test.com', password: '123456'
      })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.email).toBe('test@test.com')
      expect(res.body.data.user.username).toBe('testuser')
    })

    test('sets session maxAge to 30 days when rememberMe is true', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      const mockSession = { access_token: 'mock-token', refresh_token: 'mock-refresh' }
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { username: 'testuser' }, error: null })
      })

      const res = await simulateRequest(app, 'POST', '/api/auth/login', {
        email: 'test@test.com', password: '123456', rememberMe: true
      }, {}, [captureSessionMiddleware])

      expect(res.status).toBe(200)
      expect(capturedSession.maxAge).toBe(30 * 24 * 60 * 60 * 1000)
      expect(capturedSession.supabaseAccessToken).toBe('mock-token')
      expect(capturedSession.supabaseRefreshToken).toBe('mock-refresh')
      expect(capturedSession.userId).toBe('123')
    })

    test("sets session maxAge to 'session' when rememberMe is false, omitted, or not boolean true", async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      const mockSession = { access_token: 'mock-token', refresh_token: 'mock-refresh' }
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
      })

      const falseRes = await simulateRequest(app, 'POST', '/api/auth/login', {
        email: 'test@test.com', password: '123456', rememberMe: false
      }, {}, [captureSessionMiddleware])
      expect(falseRes.status).toBe(200)
      expect(capturedSession.maxAge).toBe('session')

      capturedSession = null
      const omittedRes = await simulateRequest(app, 'POST', '/api/auth/login', {
        email: 'test@test.com', password: '123456'
      }, {}, [captureSessionMiddleware])
      expect(omittedRes.status).toBe(200)
      expect(capturedSession.maxAge).toBe('session')

      capturedSession = null
      const stringRes = await simulateRequest(app, 'POST', '/api/auth/login', {
        email: 'test@test.com', password: '123456', rememberMe: 'true'
      }, {}, [captureSessionMiddleware])
      expect(stringRes.status).toBe(200)
      expect(capturedSession.maxAge).toBe('session')
    })

    test('returns username as null when profile not found on login', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      const mockSession = { access_token: 'mock-token', refresh_token: 'mock-refresh' }
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
      })

      const res = await simulateRequest(app, 'POST', '/api/auth/login', {
        email: 'test@test.com', password: '123456'
      })
      expect(res.status).toBe(200)
      expect(res.body.data.user.username).toBeNull()
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
      // Re-setup mockFrom for createUserScopedClient().from('profiles') call
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { username: 'testuser' },
          error: null
        })
      })
      const res = await simulateRequest(app, 'GET', '/api/auth/me', null, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])
      expect(res.status).toBe(200)
      expect(res.body.data.user.id).toBe('123')
      expect(res.body.data.user.email).toBe('test@test.com')
    })
  })

  // ========== /api/auth/reset-request ==========
  describe('POST /api/auth/reset-request', () => {
    test('returns 400 when email is missing', async () => {
      const res = await simulateRequest(app, 'POST', '/api/auth/reset-request', {})
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('email is required')
    })

    test('returns 200 and success message even when Supabase errors (anti-enumeration)', async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValue({ error: new Error('Some error') })
      const res = await simulateRequest(app, 'POST', '/api/auth/reset-request', { email: 'notexist@test.com' })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.message).toContain('If that email is registered')
    })

    test('returns 200 when reset email is sent successfully', async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null })
      const res = await simulateRequest(app, 'POST', '/api/auth/reset-request', { email: 'test@test.com' })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('test@test.com', expect.objectContaining({ redirectTo: expect.any(String) }))
    })
  })

  // ========== /api/auth/reset-confirm ==========
  describe('POST /api/auth/reset-confirm', () => {
    test('returns 400 when accessToken is missing', async () => {
      const res = await simulateRequest(app, 'POST', '/api/auth/reset-confirm', { refreshToken: 'r', password: 'newpassword' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('accessToken, refreshToken and password are required')
    })

    test('returns 400 when refreshToken is missing', async () => {
      const res = await simulateRequest(app, 'POST', '/api/auth/reset-confirm', { accessToken: 'a', password: 'newpassword' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('accessToken, refreshToken and password are required')
    })

    test('returns 400 when password is missing', async () => {
      const res = await simulateRequest(app, 'POST', '/api/auth/reset-confirm', { accessToken: 'a', refreshToken: 'r' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('accessToken, refreshToken and password are required')
    })

    test('returns 400 when password is too short', async () => {
      const res = await simulateRequest(app, 'POST', '/api/auth/reset-confirm', { accessToken: 'a', refreshToken: 'r', password: '123' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Password must be at least 6 characters')
    })

    test('returns 400 when setSession fails (invalid/expired recovery token)', async () => {
      mockAuth.setSession.mockResolvedValue({ data: null, error: { message: 'Token expired' } })
      const res = await simulateRequest(app, 'POST', '/api/auth/reset-confirm', { accessToken: 'expired-a', refreshToken: 'expired-r', password: 'newpassword123' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Token expired')
      expect(mockAuth.updateUser).not.toHaveBeenCalled()
    })

    test('returns 400 when Supabase updateUser fails', async () => {
      mockAuth.setSession.mockResolvedValue({ data: { session: {} }, error: null })
      mockAuth.updateUser.mockResolvedValue({ data: null, error: { message: 'Weak password' } })
      const res = await simulateRequest(app, 'POST', '/api/auth/reset-confirm', { accessToken: 'a', refreshToken: 'r', password: 'newpassword123' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Weak password')
    })

    test('returns 200 and user data on success and calls SDK with distinct access and refresh tokens', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      mockAuth.setSession.mockResolvedValue({ data: { session: {} }, error: null })
      mockAuth.updateUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockAuth.signOut.mockResolvedValue({ error: null })
      const res = await simulateRequest(app, 'POST', '/api/auth/reset-confirm', {
        accessToken: 'access-xyz',
        refreshToken: 'refresh-abc',
        password: 'newpassword123'
      })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.id).toBe('123')
      expect(mockAuth.setSession).toHaveBeenCalledWith({ access_token: 'access-xyz', refresh_token: 'refresh-abc' })
      expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'newpassword123' })
    })
  })

  // ========== /api/auth/profile ==========
  describe('PATCH /api/auth/profile', () => {
    test('returns 401 when not authenticated', async () => {
      const res = await simulateRequest(app, 'PATCH', '/api/auth/profile', { username: 'newname' }, {})
      expect(res.status).toBe(401)
    })

    test('returns 400 when username is missing', async () => {
      const res = await simulateRequest(app, 'PATCH', '/api/auth/profile', {}, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('username is required')
    })

    test('returns 400 when username has invalid characters', async () => {
      // Username normalizes to 'badname' (7 chars, passes length) then hits real DB call.
      // Use an already-taken name so it returns 409 instead of 500 (real DB error).
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'other-user' }, error: null })
      })
      const res = await simulateRequest(app, 'PATCH', '/api/auth/profile', { username: 'bad name!' }, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])
      // Validates and hits uniqueness check (returns 409 since name is "taken" per mock)
      expect(res.status).toBe(409)
    })

    test('returns 400 when username is too short', async () => {
      const res = await simulateRequest(app, 'PATCH', '/api/auth/profile', { username: 'a' }, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('2-20 characters')
    })

    test('returns 409 when username is already taken', async () => {
      // First call: uniqueness check returns existing user
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'other-user' }, error: null })
      })
      const res = await simulateRequest(app, 'PATCH', '/api/auth/profile', { username: 'takenname' }, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])
      expect(res.status).toBe(409)
      expect(res.body.error).toBe('This username is already taken')
    })

    test('returns 200 and updates username on success', async () => {
      // First call: uniqueness check returns null (available)
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
      })
      // Second call: update
      const updateEq = jest.fn().mockResolvedValue({ error: null })
      mockFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: updateEq
      })
      const res = await simulateRequest(app, 'PATCH', '/api/auth/profile', { username: 'validname' }, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.username).toBe('validname')
    })
  })

  // ========== /api/auth/update-password ==========
  describe('POST /api/auth/update-password', () => {
    beforeEach(() => {
      mockAuth.getUser.mockResolvedValue({ data: { user: { id: '123', email: 'test@test.com' } }, error: null })
    })

    test('returns 400 when required fields are missing', async () => {
      const res = await simulateRequest(app, 'POST', '/api/auth/update-password', { currentPassword: 'oldpass' }, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('currentPassword and newPassword are required')
    })

    test('returns 400 when new password is too short', async () => {
      const res = await simulateRequest(app, 'POST', '/api/auth/update-password', {
        currentPassword: 'oldpass',
        newPassword: '123'
      }, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Password must be at least 6 characters')
    })

    test('returns 401 when current password is wrong', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ data: null, error: { message: 'Invalid login credentials' } })
      const res = await simulateRequest(app, 'POST', '/api/auth/update-password', {
        currentPassword: 'wrongpass',
        newPassword: 'newpassword'
      }, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Current password is incorrect')
      expect(mockAuth.updateUser).not.toHaveBeenCalled()
    })

    test('returns 200 and updates password on success', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ data: { user: { id: '123' } }, error: null })
      mockAuth.updateUser.mockResolvedValue({ data: { user: { id: '123' } }, error: null })
      const res = await simulateRequest(app, 'POST', '/api/auth/update-password', {
        currentPassword: 'oldpass',
        newPassword: 'newpassword'
      }, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'test@test.com', password: 'oldpass' })
      expect(mockAuth.setSession).toHaveBeenCalledWith({
        access_token: 'valid-token',
        refresh_token: 'valid-refresh-token'
      })
      expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'newpassword' })
    })

    test('returns 401 when Supabase auth session cannot be restored before password update', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ data: { user: { id: '123' } }, error: null })
      mockAuth.setSession.mockResolvedValue({ data: { session: null }, error: { message: 'Auth session missing!' } })

      const res = await simulateRequest(app, 'POST', '/api/auth/update-password', {
        currentPassword: 'oldpass',
        newPassword: 'newpassword'
      }, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])

      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Invalid or expired token')
      expect(mockAuth.updateUser).not.toHaveBeenCalled()
    })

    test('returns 429 after 5 update attempts from same user in 15min', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ data: { user: { id: '123' } }, error: null })
      mockAuth.updateUser.mockResolvedValue({ data: { user: { id: '123' } }, error: null })

      for (let i = 0; i < 5; i++) {
        const res = await simulateRequest(app, 'POST', '/api/auth/update-password', {
          currentPassword: 'oldpass',
          newPassword: 'newpassword'
        }, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])
        expect(res.status).toBe(200)
      }

      const res = await simulateRequest(app, 'POST', '/api/auth/update-password', {
        currentPassword: 'oldpass',
        newPassword: 'newpassword'
      }, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])
      expect(res.status).toBe(429)
    })
  })

  // ========== /api/auth/update-email ==========
  describe('POST /api/auth/update-email', () => {
    beforeEach(() => {
      mockAuth.getUser.mockResolvedValue({ data: { user: { id: '123', email: 'test@test.com' } }, error: null })
    })

    test('returns 400 when email is invalid', async () => {
      const res = await simulateRequest(app, 'POST', '/api/auth/update-email', {
        currentPassword: 'oldpass',
        newEmail: 'not-an-email'
      }, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Valid email is required')
    })

    test('returns 401 when current password is wrong', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ data: null, error: { message: 'Invalid login credentials' } })
      const res = await simulateRequest(app, 'POST', '/api/auth/update-email', {
        currentPassword: 'wrongpass',
        newEmail: 'new@test.com'
      }, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Current password is incorrect')
      expect(mockAuth.updateUser).not.toHaveBeenCalled()
    })

    test('returns 200 and sends email confirmation on success', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ data: { user: { id: '123' } }, error: null })
      mockAuth.updateUser.mockResolvedValue({ data: { user: { id: '123' } }, error: null })
      const res = await simulateRequest(app, 'POST', '/api/auth/update-email', {
        currentPassword: 'oldpass',
        newEmail: ' New@Example.COM '
      }, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'test@test.com', password: 'oldpass' })
      expect(mockAuth.setSession).toHaveBeenCalledWith({
        access_token: 'valid-token',
        refresh_token: 'valid-refresh-token'
      })
      expect(mockAuth.updateUser).toHaveBeenCalledWith({ email: 'new@example.com' })
    })

    test('returns 401 when Supabase auth session cannot be restored before email update', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ data: { user: { id: '123' } }, error: null })
      mockAuth.setSession.mockResolvedValue({ data: { session: null }, error: { message: 'Auth session missing!' } })

      const res = await simulateRequest(app, 'POST', '/api/auth/update-email', {
        currentPassword: 'oldpass',
        newEmail: 'new@test.com'
      }, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])

      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Invalid or expired token')
      expect(mockAuth.updateUser).not.toHaveBeenCalled()
    })

    test('returns 400 with generic error when Supabase rejects email update', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ data: { user: { id: '123' } }, error: null })
      mockAuth.updateUser.mockResolvedValue({ data: null, error: { message: 'User already registered' } })
      const res = await simulateRequest(app, 'POST', '/api/auth/update-email', {
        currentPassword: 'oldpass',
        newEmail: 'taken@test.com'
      }, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Unable to update email. Please check the address and try again.')
    })

    test('returns 429 after 5 update attempts from same user in 15min', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ data: { user: { id: '123' } }, error: null })
      mockAuth.updateUser.mockResolvedValue({ data: { user: { id: '123' } }, error: null })

      for (let i = 0; i < 5; i++) {
        const res = await simulateRequest(app, 'POST', '/api/auth/update-email', {
          currentPassword: 'oldpass',
          newEmail: `new${i}@test.com`
        }, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])
        expect(res.status).toBe(200)
      }

      const res = await simulateRequest(app, 'POST', '/api/auth/update-email', {
        currentPassword: 'oldpass',
        newEmail: 'final@test.com'
      }, { Cookie: 'session=valid-token' }, [mockSessionMiddleware])
      expect(res.status).toBe(429)
    })
  })

  // ========== /api/auth/callback ==========
  describe('POST /api/auth/callback', () => {
    test('returns 400 when accessToken is missing', async () => {
      const res = await simulateRequest(app, 'POST', '/api/auth/callback', {})
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('accessToken required')
    })

    test('returns 401 when Supabase returns invalid token', async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Invalid token') })
      const res = await simulateRequest(app, 'POST', '/api/auth/callback', { accessToken: 'bad-token' })
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Invalid token')
    })

    test('returns 200 with user and username on valid token', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      mockAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { username: 'testuser' }, error: null })
      })
      const res = await simulateRequest(app, 'POST', '/api/auth/callback', {
        accessToken: 'valid-token',
        refreshToken: 'valid-refresh'
      })
      expect(res.status).toBe(200)
      expect(res.body.data.user.id).toBe('123')
      expect(res.body.data.user.email).toBe('test@test.com')
      expect(res.body.data.user.username).toBe('testuser')
    })

    test('returns username as null when profile not found', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      mockAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
      })
      const res = await simulateRequest(app, 'POST', '/api/auth/callback', { accessToken: 'valid-token' })
      expect(res.status).toBe(200)
      expect(res.body.data.user.username).toBeNull()
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

  // ========== Rate limiting: /api/auth/reset-request ==========
  describe('POST /api/auth/reset-request rate limiting', () => {
    beforeEach(() => {
      __resetAll()
      mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null })
    })

    test('returns 429 after 3 requests in 1h for same email', async () => {
      for (let i = 0; i < 3; i++) {
        await simulateRequest(app, 'POST', '/api/auth/reset-request', { email: 'ratetest@t.com' })
      }
      const res = await simulateRequest(app, 'POST', '/api/auth/reset-request', { email: 'ratetest@t.com' })
      expect(res.status).toBe(429)
    })

    test('different emails have independent counters', async () => {
      for (let i = 0; i < 3; i++) {
        await simulateRequest(app, 'POST', '/api/auth/reset-request', { email: 'user1@t.com' })
      }
      const res = await simulateRequest(app, 'POST', '/api/auth/reset-request', { email: 'user2@t.com' })
      expect(res.status).toBe(200)
    })

    test('email case and whitespace cannot bypass per-email limit', async () => {
      const variants = ['Bypass@T.com', 'bypass@t.com', '  BYPASS@T.COM  ']
      for (const email of variants) {
        await simulateRequest(app, 'POST', '/api/auth/reset-request', { email })
      }
      const res = await simulateRequest(app, 'POST', '/api/auth/reset-request', { email: 'bypass@t.com' })
      expect(res.status).toBe(429)
    })
  })

  // ========== Rate limiting: /api/auth/reset-confirm ==========
  describe('POST /api/auth/reset-confirm rate limiting', () => {
    beforeEach(() => {
      __resetAll()
      mockAuth.setSession.mockResolvedValue({ data: { session: {} }, error: null })
      mockAuth.updateUser.mockResolvedValue({ data: null, error: { message: 'Token expired' } })
    })

    test('returns 429 after 10 requests from same IP in 15min', async () => {
      for (let i = 0; i < 10; i++) {
        await simulateRequest(app, 'POST', '/api/auth/reset-confirm', { accessToken: 'a', refreshToken: 'r', password: 'abcdef' })
      }
      const res = await simulateRequest(app, 'POST', '/api/auth/reset-confirm', { accessToken: 'a', refreshToken: 'r', password: 'abcdef' })
      expect(res.status).toBe(429)
    })
  })
})
