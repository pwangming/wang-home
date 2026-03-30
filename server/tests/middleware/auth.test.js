import { jest } from '@jest/globals'

// Mock Supabase
const mockGetUser = jest.fn()
jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: mockGetUser }
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
})
