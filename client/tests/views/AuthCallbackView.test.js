import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

const { mockRoute, mockRouter } = vi.hoisted(() => ({
  mockRoute: { query: {} },
  mockRouter: { push: vi.fn() }
}))

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => mockRouter
}))

import AuthCallbackView from '../../src/views/AuthCallbackView.vue'

describe('AuthCallbackView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute.query = {}
    history.replaceState(null, '', '/auth/callback')
  })

  afterEach(() => {
    history.replaceState(null, '', '/')
  })

  it('shows an email change result when Supabase redirects without tokens', () => {
    mockRoute.query = { type: 'email_change' }
    const wrapper = mount(AuthCallbackView)

    expect(wrapper.text()).toContain('邮箱确认已提交')
    expect(wrapper.text()).toContain('如果系统要求双重确认')
  })

  it('shows confirmed copy when the email change redirect includes session tokens', () => {
    mockRoute.query = { type: 'email_change' }
    window.location.hash = '#access_token=TOKEN123&refresh_token=REFRESH456'
    const wrapper = mount(AuthCallbackView)

    expect(wrapper.text()).toContain('邮箱已确认')
  })

  it('returns to the game from the callback page', async () => {
    mockRoute.query = { type: 'email_change' }
    const wrapper = mount(AuthCallbackView)

    await wrapper.find('[data-testid="auth-callback-go-game"]').trigger('click')

    expect(mockRouter.push).toHaveBeenCalledWith('/game')
  })
})
