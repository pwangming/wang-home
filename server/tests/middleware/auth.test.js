import { jest } from '@jest/globals'

// Mock Supabase
const mockGetUser = jest.fn()
const mockSetSession = jest.fn()
jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: mockGetUser, setSession: mockSetSession }
  }))
}))

const { authMiddleware } = await import('../../src/middleware/auth.js')

describe('authMiddleware', () => {
  let ctx, next

  beforeEach(() => {
    ctx = {
      headers: {},
      status: 200,
      body: null,
      session: {},
      state: {}
    }
    next = jest.fn()
    mockGetUser.mockReset()
    mockSetSession.mockReset()
  })

  test('should return 401 when no authenticated session exists', async () => {
    await authMiddleware(ctx, next)
    expect(ctx.status).toBe(401)
    expect(ctx.body.error).toBe('Missing authenticated session')
    expect(next).not.toHaveBeenCalled()
  })

  test('should return 401 when token is invalid', async () => {
    ctx.session = { supabaseAccessToken: 'invalid-token' }
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Invalid') })

    await authMiddleware(ctx, next)
    expect(ctx.status).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  test('should call next and set user when token is valid', async () => {
    const mockUser = { id: '123', email: 'test@test.com' }
    ctx.session = { supabaseAccessToken: 'valid-token' }
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })

    await authMiddleware(ctx, next)
    expect(ctx.state.user).toEqual(mockUser)
    expect(next).toHaveBeenCalled()
  })

  test('should refresh token and continue when access token expired but refresh succeeds', async () => {
    const mockUser = { id: '123', email: 'test@test.com' }
    ctx.session = {
      supabaseAccessToken: 'expired-token',
      supabaseRefreshToken: 'valid-refresh-token'
    }
    // First call: token expired
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Token expired') })
    // setSession succeeds with new tokens
    mockSetSession.mockResolvedValue({
      data: { session: { access_token: 'new-access', refresh_token: 'new-refresh' } },
      error: null
    })
    // Second call with new token: success
    mockGetUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null })

    await authMiddleware(ctx, next)
    expect(ctx.session.supabaseAccessToken).toBe('new-access')
    expect(ctx.session.supabaseRefreshToken).toBe('new-refresh')
    expect(ctx.state.user).toEqual(mockUser)
    expect(next).toHaveBeenCalled()
  })

  test('should return 401 and clear session when refresh token also fails', async () => {
    ctx.session = {
      supabaseAccessToken: 'expired-token',
      supabaseRefreshToken: 'expired-refresh-token'
    }
    // First call: token expired
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Token expired') })
    // setSession fails
    mockSetSession.mockResolvedValue({
      data: { session: null },
      error: new Error('Refresh token expired')
    })

    await authMiddleware(ctx, next)
    expect(ctx.status).toBe(401)
    expect(ctx.session).toBeNull()
    expect(next).not.toHaveBeenCalled()
  })
})
