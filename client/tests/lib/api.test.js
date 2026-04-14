import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock import.meta.env
vi.stubGlobal('import.meta', {
  env: {
    VITE_API_BASE: '/api'
  }
})

// We need to import after mocking
const { api, setSessionExpiredHandler } = await import('../../src/lib/api.js')

describe('api.js', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('request', () => {
    it('should make a fetch request with correct options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } })
      })

      const result = await api.auth.me()

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', {
        method: undefined,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      expect(result).toEqual({ id: 1 })
    })

    it('should include body for POST requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { success: true } })
      })

      await api.auth.login('test@test.com', 'password123')

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@test.com', password: 'password123' })
      }))
    })

    it('should throw error on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid input' })
      })

      await expect(api.auth.me()).rejects.toThrow('Invalid input')
    })

    it('should throw network error when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(api.auth.me()).rejects.toThrow('网络连接失败，请检查网络')
    })

    it('should throw server error when 502 returns non-JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => { throw new SyntaxError('Unexpected token <') }
      })

      await expect(api.auth.me()).rejects.toThrow('服务器异常，请稍后重试')
    })

    it('should throw invalid response error when non-500 returns non-JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => { throw new SyntaxError('Unexpected token <') }
      })

      await expect(api.auth.me()).rejects.toThrow('服务器返回了无效的响应')
    })

    it('should mark network errors with networkError flag', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      try {
        await api.auth.me()
      } catch (err) {
        expect(err.networkError).toBe(true)
      }
    })

    it('should throw server error with serverError flag for 500', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      })

      await expect(api.auth.me()).rejects.toThrow('服务器异常，请稍后重试')
    })

    it('should call onSessionExpired handler on 401', async () => {
      const handler = vi.fn()
      setSessionExpiredHandler(handler)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      })

      await expect(api.auth.login('test@test.com', 'password')).rejects.toThrow()
      expect(handler).toHaveBeenCalled()
    })

    it('should not call onSessionExpired on /auth/me endpoint', async () => {
      const handler = vi.fn()
      setSessionExpiredHandler(handler)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      })

      await expect(api.auth.me()).rejects.toThrow()
      expect(handler).not.toHaveBeenCalled()
    })

    it('should return json.data if present', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { leaderboard: [] }, page: 1 })
      })

      const result = await api.leaderboard.list()

      expect(result).toEqual({ leaderboard: [] })
    })

    it('should return full json if data is not present', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Logged out' })
      })

      const result = await api.auth.logout()

      expect(result).toEqual({ success: true, message: 'Logged out' })
    })
  })

  describe('api.auth', () => {
    it('should call register with correct params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: '123' } })
      })

      await api.auth.register('test@test.com', 'password123', 'testuser')

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@test.com', password: 'password123', username: 'testuser' })
      }))
    })

    it('should call resetRequest with email', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { message: 'Email sent' } })
      })

      await api.auth.resetRequest('test@test.com')

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/reset-request', expect.objectContaining({
        body: JSON.stringify({ email: 'test@test.com' })
      }))
    })

    it('should call resetConfirm with token and password', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { user: {} } })
      })

      await api.auth.resetConfirm('token123', 'newpassword')

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/reset-confirm', expect.objectContaining({
        body: JSON.stringify({ token: 'token123', password: 'newpassword' })
      }))
    })

    it('should call updateProfile with username', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { username: 'newname' } })
      })

      await api.auth.updateProfile('newname')

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/profile', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ username: 'newname' })
      }))
    })
  })

  describe('api.leaderboard', () => {
    it('should call list with pagination params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      })

      await api.leaderboard.list(2, 10)

      expect(mockFetch).toHaveBeenCalledWith('/api/leaderboard?page=2&pageSize=10', expect.any(Object))
    })

    it('should use default pagination values', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      })

      await api.leaderboard.list()

      expect(mockFetch).toHaveBeenCalledWith('/api/leaderboard?page=1&pageSize=20', expect.any(Object))
    })

    it('should call getMyRank', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { rank: 5 } })
      })

      await api.leaderboard.getMyRank()

      expect(mockFetch).toHaveBeenCalledWith('/api/leaderboard/rank/me', expect.any(Object))
    })

    it('should call submitScore with session data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { success: true } })
      })

      await api.leaderboard.submitScore('session-123', 100, 1.5, 2.0, '2024-01-01', 30000)

      expect(mockFetch).toHaveBeenCalledWith('/api/leaderboard', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-123',
          score: 100,
          speedMultiplier: 1.5,
          scoreMultiplier: 2.0,
          endedAt: '2024-01-01',
          durationMs: 30000
        })
      }))
    })
  })
})
