import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const mockRouter = { push: vi.fn() }
const mockAuthStore = { user: null, _startHeartbeat: vi.fn() }
const mockMessage = { success: vi.fn(), error: vi.fn() }
const mockHandleCallback = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter
}))

vi.mock('../../src/stores/auth.js', () => ({
  useAuthStore: () => mockAuthStore
}))

vi.mock('../../src/lib/api.js', () => ({
  api: { auth: { callback: vi.fn() } }
}))

vi.mock('naive-ui', () => ({
  useMessage: () => mockMessage
}))

vi.mock('../../src/composables/useAuthCallback.js', () => ({
  useAuthCallback: vi.fn(() => ({
    handleCallback: mockHandleCallback
  }))
}))

import AuthCallbackHandler from '../../src/components/AuthCallbackHandler.vue'
import { api } from '../../src/lib/api.js'
import { useAuthCallback } from '../../src/composables/useAuthCallback.js'

describe('AuthCallbackHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('wires dependencies into useAuthCallback and handles callback on mount', () => {
    mount(AuthCallbackHandler)

    expect(useAuthCallback).toHaveBeenCalledWith({
      api,
      authStore: mockAuthStore,
      router: mockRouter,
      message: mockMessage
    })
    expect(mockHandleCallback).toHaveBeenCalledTimes(1)
  })
})
