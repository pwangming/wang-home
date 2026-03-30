import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock api before importing store
vi.mock('../../src/lib/api.js', () => ({
  api: {
    auth: {
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      me: vi.fn()
    }
  }
}))

// Import store after mock
const { authStore } = await import('../../src/stores/auth.js')

describe('auth Store', () => {
  beforeEach(() => {
    authStore.user = null
    authStore.isLoading = false
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have user as null initially', () => {
      expect(authStore.user).toBeNull()
    })

    it('should have isLoading as false initially', () => {
      expect(authStore.isLoading).toBe(false)
    })
  })

  describe('init()', () => {
    it('should remain logged out when /me has no session', async () => {
      const { api } = await import('../../src/lib/api.js')
      api.auth.me.mockRejectedValue(new Error('Missing session'))
      await authStore.init()
      expect(authStore.user).toBeNull()
    })

    it('should set user when cookie session is valid', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      const { api } = await import('../../src/lib/api.js')
      api.auth.me.mockResolvedValue({ user: mockUser })

      await authStore.init()
      expect(authStore.user).toEqual(mockUser)
    })

    it('should reset user when cookie session is invalid', async () => {
      const { api } = await import('../../src/lib/api.js')
      api.auth.me.mockRejectedValue(new Error('Invalid token'))

      await authStore.init()
      expect(authStore.user).toBeNull()
    })
  })

  describe('login()', () => {
    it('should set user on success and rely on cookie session', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      const { api } = await import('../../src/lib/api.js')
      api.auth.login.mockResolvedValue({ user: mockUser })

      await authStore.login('test@test.com', 'password123')

      expect(authStore.user).toEqual(mockUser)
    })

    it('should throw error on failure', async () => {
      const { api } = await import('../../src/lib/api.js')
      api.auth.login.mockRejectedValue(new Error('Invalid credentials'))

      await expect(authStore.login('test@test.com', 'wrong')).rejects.toThrow('Invalid credentials')
      expect(authStore.user).toBeNull()
    })
  })

  describe('register()', () => {
    it('should set user on success when server creates cookie session', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      const { api } = await import('../../src/lib/api.js')
      api.auth.register.mockResolvedValue({ user: mockUser })

      await authStore.register('test@test.com', 'password123', 'testuser')

      expect(authStore.user).toEqual(mockUser)
    })

    it('should throw error on failure', async () => {
      const { api } = await import('../../src/lib/api.js')
      api.auth.register.mockRejectedValue(new Error('Registration failed'))

      await expect(authStore.register('test@test.com', 'password', 'user')).rejects.toThrow('Registration failed')
    })
  })

  describe('logout()', () => {
    it('should clear user even if logout API fails', async () => {
      const { api } = await import('../../src/lib/api.js')
      api.auth.logout.mockRejectedValue(new Error('Network error'))

      await authStore.logout()

      expect(authStore.user).toBeNull()
    })

    it('should clear user on successful logout', async () => {
      const { api } = await import('../../src/lib/api.js')
      api.auth.logout.mockResolvedValue({ error: null })

      authStore.user = { id: '123' }
      await authStore.logout()

      expect(authStore.user).toBeNull()
    })
  })
})
