import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useSkinStore } from '../../src/stores/skin.js'

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
      updateProfile: vi.fn(),
      updatePassword: vi.fn(),
      updateEmail: vi.fn()
    }
  }
}))

import ProfileModal from '../../src/components/game/ProfileModal.vue'
import { api } from '../../src/lib/api.js'

describe('ProfileModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
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

    it('should render profile, skin, and security tabs', () => {
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        }
      })

      expect(wrapper.find('[data-testid="profile-tabs"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="tab-profile"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="tab-skins"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="tab-security"]').exists()).toBe(true)
      expect(wrapper.vm.activeTab).toBe('profile')
    })

    it('should render skin options with locked placeholders', () => {
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        }
      })

      expect(wrapper.find('[data-testid="profile-skin-panel"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="skin-option-default"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="skin-option-retro"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="skin-option-neon_v1"]').attributes('disabled')).toBeDefined()
      expect(wrapper.find('[data-testid="skin-option-monochrome"]').attributes('disabled')).toBeDefined()
    })

    it('should render security tab forms', () => {
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        }
      })

      expect(wrapper.find('[data-testid="profile-security-panel"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="security-current-password"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="security-new-password"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="security-confirm-password"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="security-email-current-password"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="security-new-email"]').exists()).toBe(true)
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

    it('should show error when password confirmation does not match', async () => {
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        }
      })

      wrapper.vm.passwordForm.currentPassword = 'oldpass'
      wrapper.vm.passwordForm.newPassword = 'newpassword'
      wrapper.vm.passwordForm.confirmPassword = 'different'
      await wrapper.vm.handleUpdatePassword()

      expect(wrapper.vm.securityErrors.confirmPassword).toBe('两次输入的新密码不一致')
      expect(api.auth.updatePassword).not.toHaveBeenCalled()
    })

    it('should show errors when password form is incomplete', async () => {
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        }
      })

      wrapper.vm.passwordForm.currentPassword = ''
      wrapper.vm.passwordForm.newPassword = '123'
      wrapper.vm.passwordForm.confirmPassword = '123'
      await wrapper.vm.handleUpdatePassword()

      expect(wrapper.vm.securityErrors.currentPassword).toBe('请输入当前密码')
      expect(wrapper.vm.securityErrors.newPassword).toBe('新密码至少 6 个字符')
      expect(api.auth.updatePassword).not.toHaveBeenCalled()
    })

    it('should show errors when email form is incomplete or invalid', async () => {
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        }
      })

      wrapper.vm.emailForm.currentPassword = ''
      wrapper.vm.emailForm.newEmail = 'not-an-email'
      await wrapper.vm.handleUpdateEmail()

      expect(wrapper.vm.securityErrors.emailCurrentPassword).toBe('请输入当前密码')
      expect(wrapper.vm.securityErrors.newEmail).toBe('请输入有效邮箱')
      expect(api.auth.updateEmail).not.toHaveBeenCalled()
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

    it('should keep profile submit working after switching tabs', async () => {
      api.auth.updateProfile.mockResolvedValue({ username: 'newname' })
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        }
      })

      wrapper.vm.activeTab = 'security'
      wrapper.vm.activeTab = 'profile'
      wrapper.vm.form.username = 'newname'
      await wrapper.vm.handleSubmit()

      expect(api.auth.updateProfile).toHaveBeenCalledWith('newname')
    })
  })

  describe('security forms', () => {
    it('should call updatePassword and show success on valid submit', async () => {
      api.auth.updatePassword.mockResolvedValue({ message: 'ok' })
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        }
      })

      wrapper.vm.passwordForm.currentPassword = 'oldpass'
      wrapper.vm.passwordForm.newPassword = 'newpassword'
      wrapper.vm.passwordForm.confirmPassword = 'newpassword'
      await wrapper.vm.handleUpdatePassword()

      expect(api.auth.updatePassword).toHaveBeenCalledWith('oldpass', 'newpassword')
      expect(wrapper.vm.successMessage).toBe('密码已更新，下次登录请使用新密码')
      expect(wrapper.vm.passwordForm.currentPassword).toBe('')
    })

    it('should show error when updatePassword fails', async () => {
      api.auth.updatePassword.mockRejectedValue(new Error('Current password is incorrect'))
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        }
      })

      wrapper.vm.passwordForm.currentPassword = 'wrongpass'
      wrapper.vm.passwordForm.newPassword = 'newpassword'
      wrapper.vm.passwordForm.confirmPassword = 'newpassword'
      await wrapper.vm.handleUpdatePassword()

      expect(wrapper.vm.errorMessage).toBe('Current password is incorrect')
    })

    it('should call updateEmail and show success on valid submit', async () => {
      api.auth.updateEmail.mockResolvedValue({ message: 'ok' })
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        }
      })

      wrapper.vm.emailForm.currentPassword = 'oldpass'
      wrapper.vm.emailForm.newEmail = ' new@test.com '
      await wrapper.vm.handleUpdateEmail()

      expect(api.auth.updateEmail).toHaveBeenCalledWith('oldpass', 'new@test.com')
      expect(wrapper.vm.successMessage).toBe('确认邮件已发送，请前往新邮箱完成验证')
      expect(wrapper.vm.emailForm.newEmail).toBe('')
    })

    it('should show error when updateEmail fails', async () => {
      api.auth.updateEmail.mockRejectedValue(new Error('Unable to update email'))
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        }
      })

      wrapper.vm.emailForm.currentPassword = 'oldpass'
      wrapper.vm.emailForm.newEmail = 'new@test.com'
      await wrapper.vm.handleUpdateEmail()

      expect(wrapper.vm.errorMessage).toBe('Unable to update email')
    })

    it('should reset security state when modal is reopened', async () => {
      const wrapper = mount(ProfileModal, {
        props: {
          show: false,
          currentUsername: 'testuser'
        }
      })

      wrapper.vm.activeTab = 'security'
      wrapper.vm.passwordForm.currentPassword = 'oldpass'
      wrapper.vm.passwordForm.newPassword = 'newpassword'
      wrapper.vm.passwordForm.confirmPassword = 'newpassword'
      wrapper.vm.emailForm.currentPassword = 'oldpass'
      wrapper.vm.emailForm.newEmail = 'new@test.com'
      wrapper.vm.securityErrors.currentPassword = 'error'
      wrapper.vm.errorMessage = 'error'
      wrapper.vm.successMessage = 'success'

      await wrapper.setProps({ show: true })

      expect(wrapper.vm.activeTab).toBe('profile')
      expect(wrapper.vm.passwordForm.currentPassword).toBe('')
      expect(wrapper.vm.passwordForm.newPassword).toBe('')
      expect(wrapper.vm.passwordForm.confirmPassword).toBe('')
      expect(wrapper.vm.emailForm.currentPassword).toBe('')
      expect(wrapper.vm.emailForm.newEmail).toBe('')
      expect(wrapper.vm.securityErrors.currentPassword).toBe('')
      expect(wrapper.vm.errorMessage).toBe('')
      expect(wrapper.vm.successMessage).toBe('')
    })
  })

  describe('skin selection', () => {
    it('should switch active skin when a free skin is selected', async () => {
      const skinStore = useSkinStore()
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        }
      })

      await wrapper.find('[data-testid="skin-option-retro"]').trigger('click')

      expect(skinStore.activeSkinId).toBe('retro')
      expect(localStorage.getItem('activeSkin')).toBe('retro')
    })

    it('should not switch active skin when a locked skin is selected directly', async () => {
      const skinStore = useSkinStore()
      const wrapper = mount(ProfileModal, {
        props: {
          show: true,
          currentUsername: 'testuser'
        }
      })

      wrapper.vm.selectSkin('neon_v1')

      expect(skinStore.activeSkinId).toBe('default')
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
