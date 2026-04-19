import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAuthCallback } from '../../src/composables/useAuthCallback.js'

describe('useAuthCallback', () => {
  const originalHash = window.location.hash

  afterEach(() => {
    history.replaceState(null, '', window.location.pathname)
    vi.restoreAllMocks()
  })

  it('does nothing when hash has no type=signup', async () => {
    window.location.hash = '#something=else'
    const mockApi = { auth: { callback: vi.fn() } }
    const { handleCallback } = useAuthCallback({
      api: mockApi, authStore: {}, router: {}, message: {}
    })
    await handleCallback()
    expect(mockApi.auth.callback).not.toHaveBeenCalled()
  })

  it('does nothing when hash is empty', async () => {
    history.replaceState(null, '', window.location.pathname)
    const mockApi = { auth: { callback: vi.fn() } }
    const { handleCallback } = useAuthCallback({
      api: mockApi, authStore: {}, router: {}, message: {}
    })
    await handleCallback()
    expect(mockApi.auth.callback).not.toHaveBeenCalled()
  })

  it('calls api.auth.callback with tokens parsed from hash', async () => {
    window.location.hash = '#access_token=TOKEN123&refresh_token=REFRESH456&type=signup'
    const mockApi = {
      auth: {
        callback: vi.fn().mockResolvedValue({
          user: { id: '1', email: 'a@b.com', username: 'testuser' }
        })
      }
    }
    const mockAuthStore = { user: null, _startHeartbeat: vi.fn() }
    const mockMessage = { success: vi.fn(), error: vi.fn() }
    const mockRouter = { push: vi.fn() }

    const { handleCallback } = useAuthCallback({
      api: mockApi, authStore: mockAuthStore, router: mockRouter, message: mockMessage
    })
    await handleCallback()

    expect(mockApi.auth.callback).toHaveBeenCalledWith('TOKEN123', 'REFRESH456')
    expect(mockAuthStore.user).toEqual({ id: '1', email: 'a@b.com', username: 'testuser' })
    expect(mockAuthStore._startHeartbeat).toHaveBeenCalled()
    expect(mockMessage.success).toHaveBeenCalledWith('邮箱验证成功！欢迎加入')
    expect(mockRouter.push).not.toHaveBeenCalled()
  })

  it('clears hash from URL on success', async () => {
    window.location.hash = '#access_token=TOKEN123&refresh_token=REFRESH456&type=signup'
    const mockApi = {
      auth: { callback: vi.fn().mockResolvedValue({ user: { id: '1' } }) }
    }
    const mockAuthStore = { user: null, _startHeartbeat: vi.fn() }
    const { handleCallback } = useAuthCallback({
      api: mockApi, authStore: mockAuthStore, router: { push: vi.fn() }, message: { success: vi.fn() }
    })
    await handleCallback()
    expect(window.location.hash).toBe('')
  })

  it('shows error and redirects to /login when callback API fails', async () => {
    window.location.hash = '#access_token=BAD&type=signup'
    const mockApi = {
      auth: { callback: vi.fn().mockRejectedValue(new Error('Invalid token')) }
    }
    const mockAuthStore = { user: null }
    const mockMessage = { success: vi.fn(), error: vi.fn() }
    const mockRouter = { push: vi.fn() }

    const { handleCallback } = useAuthCallback({
      api: mockApi, authStore: mockAuthStore, router: mockRouter, message: mockMessage
    })
    await handleCallback()

    expect(mockMessage.error).toHaveBeenCalledWith('邮箱验证失败，请重试登录')
    expect(mockRouter.push).toHaveBeenCalledWith('/login')
  })

  it('clears hash from URL on failure', async () => {
    window.location.hash = '#access_token=BAD&type=signup'
    const mockApi = {
      auth: { callback: vi.fn().mockRejectedValue(new Error('fail')) }
    }
    const { handleCallback } = useAuthCallback({
      api: mockApi, authStore: {}, router: { push: vi.fn() }, message: { error: vi.fn() }
    })
    await handleCallback()
    expect(window.location.hash).toBe('')
  })
})
