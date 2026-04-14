import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

// Mock naive-ui
vi.mock('naive-ui', () => ({
  useMessage: vi.fn(() => ({
    info: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn()
  }))
}))

// Mock auth store
const mockRegister = vi.fn()
vi.mock('../../src/stores/auth.js', () => ({
  useAuthStore: vi.fn(() => ({
    register: mockRegister,
    user: null
  }))
}))

import RegisterView from '../../src/views/RegisterView.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: RegisterView },
      { path: '/register', component: RegisterView },
      { path: '/game', component: { template: '<div>game</div>' } },
      { path: '/login', component: { template: '<div>login</div>' } }
    ]
  })
}

function mountRegister() {
  const router = createTestRouter()
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(RegisterView, {
    global: {
      plugins: [router, pinia]
    }
  })
}

// Helper to set value on NeonInput by finding the inner <input>
async function setNeonInput(wrapper, testId, value) {
  const neonInput = wrapper.find(`[data-testid="${testId}"]`)
  const input = neonInput.find('input')
  await input.setValue(value)
}

describe('RegisterView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validation', () => {
    it('shows error when email is empty', async () => {
      const wrapper = mountRegister()
      await wrapper.find('[data-testid="register-submit"]').trigger('click')
      expect(wrapper.text()).toContain('请输入邮箱')
    })

    it('shows error for invalid email format', async () => {
      const wrapper = mountRegister()
      await setNeonInput(wrapper, 'register-email', 'bad-email')
      await wrapper.find('[data-testid="register-submit"]').trigger('click')
      expect(wrapper.text()).toContain('请输入有效的邮箱格式')
    })

    it('shows error when username is empty', async () => {
      const wrapper = mountRegister()
      await setNeonInput(wrapper, 'register-email', 'test@test.com')
      await wrapper.find('[data-testid="register-submit"]').trigger('click')
      expect(wrapper.text()).toContain('请输入用户名')
    })

    it('shows error when password is empty', async () => {
      const wrapper = mountRegister()
      await setNeonInput(wrapper, 'register-email', 'test@test.com')
      await setNeonInput(wrapper, 'register-username', 'testuser')
      await wrapper.find('[data-testid="register-submit"]').trigger('click')
      expect(wrapper.text()).toContain('请输入密码')
    })

    it('shows error when password is too short', async () => {
      const wrapper = mountRegister()
      await setNeonInput(wrapper, 'register-email', 'test@test.com')
      await setNeonInput(wrapper, 'register-username', 'testuser')
      await setNeonInput(wrapper, 'register-password', '123')
      await wrapper.find('[data-testid="register-submit"]').trigger('click')
      expect(wrapper.text()).toContain('密码至少需要 6 位')
    })

    it('shows error when passwords do not match', async () => {
      const wrapper = mountRegister()
      await setNeonInput(wrapper, 'register-email', 'test@test.com')
      await setNeonInput(wrapper, 'register-username', 'testuser')
      await setNeonInput(wrapper, 'register-password', 'password123')
      await setNeonInput(wrapper, 'register-confirm-password', 'different')
      await wrapper.find('[data-testid="register-submit"]').trigger('click')
      expect(wrapper.text()).toContain('两次输入的密码不一致')
    })
  })

  describe('submit', () => {
    async function fillForm(wrapper) {
      await setNeonInput(wrapper, 'register-email', 'test@test.com')
      await setNeonInput(wrapper, 'register-username', 'testuser')
      await setNeonInput(wrapper, 'register-password', 'password123')
      await setNeonInput(wrapper, 'register-confirm-password', 'password123')
    }

    it('calls authStore.register on valid submit', async () => {
      mockRegister.mockResolvedValue({})
      const wrapper = mountRegister()

      await fillForm(wrapper)
      await wrapper.find('[data-testid="register-submit"]').trigger('click')
      await flushPromises()

      expect(mockRegister).toHaveBeenCalledWith('test@test.com', 'password123', 'testuser')
    })

    it('shows email confirmation message when needed', async () => {
      mockRegister.mockResolvedValue({ needsEmailConfirmation: true })
      const wrapper = mountRegister()

      await fillForm(wrapper)
      await wrapper.find('[data-testid="register-submit"]').trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('请先完成邮箱验证后再登录')
    })

    it('shows error message on register failure', async () => {
      mockRegister.mockRejectedValue(new Error('该邮箱已注册'))
      const wrapper = mountRegister()

      await fillForm(wrapper)
      await wrapper.find('[data-testid="register-submit"]').trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('该邮箱已注册')
    })
  })

})
