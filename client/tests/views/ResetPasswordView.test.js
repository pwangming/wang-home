import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'

// Mock naive-ui components
vi.mock('naive-ui', () => ({
  NForm: defineComponent({
    name: 'NForm',
    props: ['model'],
    emits: ['submit.prevent'],
    setup(props, { emit, slots }) {
      return () => h('form', { onSubmit: (e) => { e.preventDefault(); emit('submit.prevent') } }, slots.default?.())
    }
  }),
  NAlert: defineComponent({
    name: 'NAlert',
    props: ['type'],
    setup(props, { slots }) {
      return () => h('div', { 'data-testid': `alert-${props.type}` }, slots.default?.())
    }
  })
}))

// Mock NeonCard, NeonButton, NeonInput
vi.mock('../../src/components/ui/NeonCard.vue', () => ({
  default: defineComponent({
    name: 'NeonCard',
    setup(props, { slots }) {
      return () => h('div', { 'data-testid': 'neon-card' }, slots.default?.())
    }
  })
}))

vi.mock('../../src/components/ui/NeonButton.vue', () => ({
  default: defineComponent({
    name: 'NeonButton',
    props: ['type', 'loading'],
    emits: ['click'],
    setup(props, { emit, slots }) {
      return () => h('button', { 'data-testid': 'neon-btn', onClick: () => emit('click') }, slots.default?.())
    }
  })
}))

vi.mock('../../src/components/ui/NeonInput.vue', () => ({
  default: defineComponent({
    name: 'NeonInput',
    props: ['modelValue', 'placeholder', 'error', 'type', 'showPasswordToggle'],
    emits: ['update:modelValue'],
    setup(props, { emit, slots }) {
      return () => h('input', {
        'data-testid': 'neon-input',
        type: props.type || 'text',
        value: props.modelValue,
        onInput: (e) => emit('update:modelValue', e.target.value)
      }, slots.default?.())
    }
  })
}))

// Mock api
vi.mock('../../src/lib/api.js', () => ({
  api: {
    auth: {
      resetRequest: vi.fn(),
      resetConfirm: vi.fn()
    }
  }
}))

import ResetPasswordView from '../../src/views/ResetPasswordView.vue'
import { api } from '../../src/lib/api.js'

const createTestRouter = (initialPath = '/reset-password') => {
  return createRouter({
    history: createMemoryHistory(initialPath),
    routes: [
      { path: '/login', component: { template: '<div>login</div>' } },
      { path: '/reset-password', component: ResetPasswordView }
    ]
  })
}

const createWrapper = async (path = '/reset-password') => {
  const router = createTestRouter(path)
  const wrapper = mount(ResetPasswordView, {
    global: {
      plugins: [router],
      stubs: {
        'router-link': { template: '<a><slot/></a>' }
      }
    }
  })
  // Wait for router to be ready and component to mount
  await router.isReady()
  await wrapper.vm.$nextTick()
  return { wrapper, router }
}

describe('ResetPasswordView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('step: request', () => {
    it('should show request form by default', async () => {
      const { wrapper } = await createWrapper()
      expect(wrapper.find('[data-testid="neon-card"]').exists()).toBe(true)
      expect(wrapper.vm.step).toBe('request')
    })

    it('should show error when email is empty', async () => {
      const { wrapper } = await createWrapper()

      await wrapper.vm.handleRequest()

      expect(wrapper.vm.errors.email).toBe('请输入邮箱')
    })

    it('should show error for invalid email format', async () => {
      const { wrapper } = await createWrapper()

      wrapper.vm.requestForm.email = 'notanemail'
      await wrapper.vm.handleRequest()

      expect(wrapper.vm.errors.email).toBe('请输入有效的邮箱格式')
    })

    it('should call api.auth.resetRequest with email on valid submit', async () => {
      api.auth.resetRequest.mockResolvedValue({ success: true })
      const { wrapper } = await createWrapper()

      wrapper.vm.requestForm.email = 'test@test.com'
      await wrapper.vm.handleRequest()

      expect(api.auth.resetRequest).toHaveBeenCalledWith('test@test.com')
    })

    it('should show success message and clear email on successful request', async () => {
      api.auth.resetRequest.mockResolvedValue({ success: true })
      const { wrapper } = await createWrapper()

      wrapper.vm.requestForm.email = 'test@test.com'
      await wrapper.vm.handleRequest()

      expect(wrapper.vm.successMessage).toContain('如果该邮箱已注册')
      expect(wrapper.vm.requestForm.email).toBe('')
    })
  })

  describe('step: reset (token in URL)', () => {
    // Note: onMounted behavior (detecting token in URL) is tested via integration/E2E.
    // These tests focus on the handleReset logic itself.

    it('should show error when passwords do not match', async () => {
      const { wrapper } = await createWrapper()

      wrapper.vm.step = 'reset'
      wrapper.vm.resetForm.password = 'password123'
      wrapper.vm.resetForm.passwordConfirm = 'differentpassword'
      await wrapper.vm.handleReset()

      expect(wrapper.vm.errors.passwordConfirm).toBe('两次输入的密码不一致')
    })

    it('should show error when password is too short', async () => {
      const { wrapper } = await createWrapper()

      wrapper.vm.step = 'reset'
      wrapper.vm.resetForm.password = '123'
      wrapper.vm.resetForm.passwordConfirm = '123'
      await wrapper.vm.handleReset()

      expect(wrapper.vm.errors.password).toBe('密码至少 6 个字符')
    })

    it('should call api.auth.resetConfirm with token and password on success', async () => {
      api.auth.resetConfirm.mockResolvedValue({ success: true })
      const { wrapper, router } = await createWrapper()

      // Navigate to reset step with token
      await router.push('/reset-password?token=abc123')
      await wrapper.vm.$nextTick()

      wrapper.vm.resetForm.password = 'newpassword123'
      wrapper.vm.resetForm.passwordConfirm = 'newpassword123'
      await wrapper.vm.handleReset()

      expect(api.auth.resetConfirm).toHaveBeenCalledWith('abc123', 'newpassword123')
    })

    it('should switch to success step after successful reset', async () => {
      api.auth.resetConfirm.mockResolvedValue({ success: true })
      const { wrapper, router } = await createWrapper()

      await router.push('/reset-password?token=abc123')
      await wrapper.vm.$nextTick()

      wrapper.vm.resetForm.password = 'newpassword123'
      wrapper.vm.resetForm.passwordConfirm = 'newpassword123'
      await wrapper.vm.handleReset()

      expect(wrapper.vm.step).toBe('success')
    })

    it('should show error and go back to request when token is missing on reset', async () => {
      const { wrapper } = await createWrapper()

      wrapper.vm.step = 'reset'
      wrapper.vm.resetForm.password = 'newpassword123'
      wrapper.vm.resetForm.passwordConfirm = 'newpassword123'
      await wrapper.vm.handleReset()

      expect(wrapper.vm.errorMessage).toBe('重置链接已失效，请重新请求密码重置')
      expect(wrapper.vm.step).toBe('request')
    })
  })
})
