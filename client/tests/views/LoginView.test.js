import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

// Mock naive-ui — include component stubs that auto-import resolves
vi.mock('naive-ui', () => {
  const stub = { template: '<div><slot /></div>' }
  return {
    useMessage: vi.fn(() => ({
      info: vi.fn(),
      warning: vi.fn(),
      success: vi.fn(),
      error: vi.fn()
    })),
    NForm: { template: '<form><slot /></form>' },
    NAlert: { template: '<div class="n-alert"><slot /></div>', props: ['type'] },
    NFormItem: stub,
    NInput: stub,
    NButton: stub,
    NCheckbox: stub
  }
})

// Mock auth store
const { mockLogin } = vi.hoisted(() => ({ mockLogin: vi.fn() }))
vi.mock('../../src/stores/auth.js', () => ({
  useAuthStore: vi.fn(() => ({
    login: mockLogin,
    user: null
  }))
}))

import LoginView from '../../src/views/LoginView.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/game', component: { template: '<div>game</div>' } },
      { path: '/register', component: { template: '<div>register</div>' } },
      { path: '/reset-password', component: { template: '<div>reset</div>' } }
    ]
  })
}

function mountLogin() {
  const router = createTestRouter()
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(LoginView, {
    global: {
      plugins: [router, pinia],
      stubs: {
        'n-form': { template: '<form><slot /></form>' },
        'n-alert': { template: '<div class="n-alert"><slot /></div>', props: ['type'] }
      }
    }
  })
}

// Helper to set value on NeonInput by finding the inner <input>
async function setNeonInput(wrapper, testId, value) {
  const neonInput = wrapper.find(`[data-testid="${testId}"]`)
  const input = neonInput.find('input')
  await input.setValue(value)
}

describe('LoginView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validation', () => {
    it('shows error when email is empty', async () => {
      const wrapper = mountLogin()
      await wrapper.find('[data-testid="login-submit"]').trigger('click')
      expect(wrapper.text()).toContain('请输入邮箱')
    })

    it('shows error for invalid email format', async () => {
      const wrapper = mountLogin()
      await setNeonInput(wrapper, 'login-email', 'not-an-email')
      await wrapper.find('[data-testid="login-submit"]').trigger('click')
      expect(wrapper.text()).toContain('请输入有效的邮箱格式')
    })

    it('shows error when password is empty', async () => {
      const wrapper = mountLogin()
      await setNeonInput(wrapper, 'login-email', 'test@test.com')
      await wrapper.find('[data-testid="login-submit"]').trigger('click')
      expect(wrapper.text()).toContain('请输入密码')
    })
  })

  describe('submit', () => {
    it('calls authStore.login on valid submit', async () => {
      mockLogin.mockResolvedValue({})
      const wrapper = mountLogin()

      await setNeonInput(wrapper, 'login-email', 'test@test.com')
      await setNeonInput(wrapper, 'login-password', 'password123')
      await wrapper.find('[data-testid="login-submit"]').trigger('click')
      await flushPromises()

      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'password123')
    })

    it('shows error message on login failure', async () => {
      mockLogin.mockRejectedValue(new Error('登录失败：密码错误'))
      const wrapper = mountLogin()

      await setNeonInput(wrapper, 'login-email', 'test@test.com')
      await setNeonInput(wrapper, 'login-password', 'wrongpass')
      await wrapper.find('[data-testid="login-submit"]').trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('登录失败：密码错误')
    })
  })

})
