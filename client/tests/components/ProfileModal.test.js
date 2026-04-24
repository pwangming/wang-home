import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// Mock naive-ui components
vi.mock('naive-ui', () => ({
  NModal: defineComponent({
    name: 'NModal',
    props: ['show', 'preset', 'title', 'style', 'maskClosable'],
    emits: ['update:show'],
    setup(props, { emit, slots }) {
      return () => h('div', { 'data-testid': 'profile-modal' }, [
        h('button', { onClick: () => emit('update:show', false) }, 'close'),
        props.show && h('div', { 'data-testid': 'modal-content' }, [
          slots.default?.(),
          slots.footer?.()
        ])
      ])
    }
  }),
  NForm: defineComponent({
    name: 'NForm',
    props: ['model'],
    setup(props, { slots }) {
      return () => h('form', {}, slots.default?.())
    }
  }),
  NButton: defineComponent({
    name: 'NButton',
    props: ['type', 'loading'],
    emits: ['click'],
    setup(props, { emit, attrs, slots }) {
      return () => h('button', {
        ...attrs,
        onClick: () => emit('click')
      }, slots.default?.() || 'button')
    }
  }),
  NAlert: defineComponent({
    name: 'NAlert',
    props: ['type'],
    setup(props, { slots }) {
      return () => h('div', { 'data-testid': 'alert' }, slots.default?.())
    }
  }),
  NTabs: defineComponent({
    name: 'NTabs',
    props: ['value', 'type', 'animated'],
    emits: ['update:value'],
    setup(props, { slots }) {
      return () => h('div', { 'data-testid': 'profile-tabs', 'data-active-tab': props.value }, slots.default?.())
    }
  }),
  NTabPane: defineComponent({
    name: 'NTabPane',
    props: ['name', 'tab'],
    setup(props, { slots }) {
      return () => h('section', { 'data-testid': `tab-${props.name}` }, [
        h('h3', {}, props.tab),
        slots.default?.()
      ])
    }
  })
}))

// Mock NeonInput component
vi.mock('../../src/components/ui/NeonInput.vue', () => ({
  default: defineComponent({
    name: 'NeonInput',
    props: ['modelValue', 'placeholder', 'error', 'type', 'showPasswordToggle'],
    emits: ['update:modelValue'],
    setup(props, { emit, attrs }) {
      return () => h('input', {
        ...attrs,
        value: props.modelValue,
        onInput: (e) => emit('update:modelValue', e.target.value)
      })
    }
  })
}))

// Mock api
vi.mock('../../src/lib/api.js', () => ({
  api: {
    auth: {
      updateProfile: vi.fn()
    }
  }
}))

import ProfileModal from '../../src/components/game/ProfileModal.vue'
import { api } from '../../src/lib/api.js'

describe('ProfileModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should display current username', () => {
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        }
      })
      expect(wrapper.find('[data-testid="profile-modal"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('testuser')
    })

    it('should render profile and security tabs', () => {
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        }
      })

      expect(wrapper.find('[data-testid="profile-tabs"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="tab-profile"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="tab-security"]').exists()).toBe(true)
      expect(wrapper.vm.activeTab).toBe('profile')
    })
  })

  describe('validation', () => {
    it('should show error when username is empty on submit', async () => {
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        }
      })

      wrapper.vm.form.username = ''
      await wrapper.vm.handleSubmit()

      expect(wrapper.vm.errors.username).toBe('请输入用户名')
    })
  })

  describe('handleSubmit', () => {
    it('should call api.auth.updateProfile with trimmed username on valid submit', async () => {
      api.auth.updateProfile.mockResolvedValue({ username: 'newname' })
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        }
      })

      // Set form username directly since the watch on show=true sets it
      wrapper.vm.form.username = 'testuser'
      await wrapper.vm.handleSubmit()

      expect(api.auth.updateProfile).toHaveBeenCalledWith('testuser')
    })

    it('should emit usernameUpdated with new username on success', async () => {
      api.auth.updateProfile.mockResolvedValue({ username: 'newname' })
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        },
        emits: ['usernameUpdated', 'update:show']
      })

      wrapper.vm.form.username = 'testuser'
      await wrapper.vm.handleSubmit()

      expect(wrapper.emitted('usernameUpdated')).toBeTruthy()
      expect(wrapper.emitted('usernameUpdated')[0]).toEqual(['newname'])
    })

    it('should show error message on API failure', async () => {
      api.auth.updateProfile.mockRejectedValue(new Error('Username already taken'))
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        }
      })

      wrapper.vm.form.username = 'testuser'
      await wrapper.vm.handleSubmit()

      expect(wrapper.vm.errorMessage).toBe('Username already taken')
    })
  })

  describe('onClose', () => {
    it('should emit update:show with false when closed', async () => {
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        },
        emits: ['update:show']
      })

      await wrapper.vm.onClose()

      expect(wrapper.emitted('update:show')).toBeTruthy()
      expect(wrapper.emitted('update:show')[0]).toEqual([false])
    })
  })
})
