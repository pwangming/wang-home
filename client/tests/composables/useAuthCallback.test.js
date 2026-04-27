import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAuthCallback } from '../../src/composables/useAuthCallback.js'

describe('useAuthCallback', () => {
  afterEach(() => {
    history.replaceState(null, '', '/')
    vi.restoreAllMocks()
  })

  it('does nothing when hash has unsupported type', async () => {
    window.location.hash = '#something=else'
    const mockApi = { auth: { callback: vi.fn() } }
    const { handleCallback } = useAuthCallback({
      api: mockApi, authStore: {}, router: {}, message: {}
    })
    await handleCallback()
    expect(mockApi.auth.callback).not.toHaveBeenCalled()
  })

  it('does nothing when access token is missing', async () => {
    window.location.hash = '#refresh_token=REFRESH456&type=email_change'
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

  it('handles email_change callback type', async () => {
    window.location.hash = '#access_token=TOKEN123&refresh_token=REFRESH456&type=email_change'
    const mockApi = {
      auth: {
        callback: vi.fn().mockResolvedValue({
          user: { id: '1', email: 'new@b.com', username: 'testuser' }
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
    expect(mockAuthStore.user.email).toBe('new@b.com')
    expect(mockMessage.success).toHaveBeenCalledWith('邮箱已更新为新地址')
    expect(mockRouter.push).not.toHaveBeenCalled()
  })

  it('uses query callback type when Supabase returns tokens without type in hash', async () => {
    history.replaceState(null, '', '/auth/callback?type=email_change#access_token=TOKEN123&refresh_token=REFRESH456')
    const mockApi = {
      auth: {
        callback: vi.fn().mockResolvedValue({
          user: { id: '1', email: 'new@b.com', username: 'testuser' }
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
    expect(mockAuthStore.user.email).toBe('new@b.com')
    expect(mockMessage.success).toHaveBeenCalled()
  })

  it('handles recovery callback type and redirects to reset password', async () => {
    window.location.hash = '#access_token=TOKEN123&refresh_token=REFRESH456&type=recovery'
    const mockApi = {
      auth: {
        callback: vi.fn().mockResolvedValue({
          user: { id: '1', email: 'a@b.com' }
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

    expect(mockMessage.success).toHaveBeenCalledWith('已登录，请尽快修改密码')
    expect(mockRouter.push).toHaveBeenCalledWith('/reset-password?step=set-new')
  })

  it('leaves recovery tokens on reset password page for ResetPasswordView', async () => {
    history.replaceState(null, '', '/reset-password#access_token=TOKEN123&refresh_token=REFRESH456&type=recovery')
    const mockApi = { auth: { callback: vi.fn() } }

    const { handleCallback } = useAuthCallback({
      api: mockApi, authStore: {}, router: { push: vi.fn() }, message: { success: vi.fn() }
    })
    await handleCallback()

    expect(mockApi.auth.callback).not.toHaveBeenCalled()
    expect(window.location.hash).toBe('#access_token=TOKEN123&refresh_token=REFRESH456&type=recovery')
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

    expect(mockMessage.error).toHaveBeenCalledWith('邮箱链接验证失败，请重试')
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
