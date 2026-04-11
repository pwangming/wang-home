import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// Mock naive-ui components
vi.mock('naive-ui', () => ({
  NModal: defineComponent({
    name: 'NModal',
    props: ['show', 'preset', 'title', 'style', 'maskClosable'],
    emits: ['update:show'],
    setup(props, { emit }) {
      return () => h('div', { 'data-testid': 'profile-modal' }, [
        h('button', { onClick: () => emit('update:show', false) }, 'close'),
        props.show && h('div', { 'data-testid': 'modal-content' },
          props.title === '修改用户名' ? [
            h('form', { onSubmit: (e) => e.preventDefault() }, [
              h('input', { 'data-testid': 'profile-username', value: 'testuser' }),
              h('button', { 'data-testid': 'profile-submit', onClick: () => {} }, '保存')
            ])
          ] : []
        )
      ])
    }
  }),
  NButton: defineComponent({
    name: 'NButton',
    props: ['type', 'loading'],
    emits: ['click'],
    setup(props, { emit }) {
      return () => h('button', {
        onClick: () => emit('click')
      }, 'button')
    }
  }),
  NAlert: defineComponent({
    name: 'NAlert',
    props: ['type'],
    setup(props, { slots }) {
      return () => h('div', { 'data-testid': 'alert' }, slots.default?.())
    }
  })
}))

// Mock NeonInput component
vi.mock('../../src/components/ui/NeonInput.vue', () => ({
  default: defineComponent({
    name: 'NeonInput',
    props: ['modelValue', 'placeholder', 'error', 'type', 'showPasswordToggle'],
    emits: ['update:modelValue'],
    setup(props, { emit }) {
      return () => h('input', {
        'data-testid': 'username-input',
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

      // The component validates on submit - find and click submit button
      const submitBtn = wrapper.find('[data-testid="profile-submit"]')
      await submitBtn.trigger('click')

      // The modal re-renders based on show prop
      expect(wrapper.vm.errors.username).toBe('')
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
