<template>
  <n-modal
    :show="show"
    preset="card"
    title="个人设置"
    style="max-width: 520px; max-height: calc(100vh - 48px); overflow-y: auto;"
    :mask-closable="false"
    @update:show="onClose"
  >
    <n-tabs v-model:value="activeTab" type="line" animated>
      <n-tab-pane name="profile" tab="基本信息">
        <n-form :model="form" @submit.prevent="handleSubmit">
          <div class="form-field">
            <label class="form-label">当前用户名</label>
            <div class="current-username">{{ currentUsername }}</div>
          </div>

          <div class="form-field">
            <label class="form-label">新用户名</label>
            <NeonInput
              data-testid="profile-username"
              v-model="form.username"
              placeholder="输入新用户名"
              :error="!!errors.username"
            />
            <span v-if="errors.username" class="form-error">{{ errors.username }}</span>
            <span class="form-hint">2-20 个字符，只允许字母、数字、下划线</span>
          </div>
        </n-form>
      </n-tab-pane>

      <n-tab-pane name="skins" tab="皮肤">
        <div class="skin-panel" data-testid="profile-skin-panel">
          <button
            v-for="skin in skinList"
            :key="skin.id"
            type="button"
            class="skin-option"
            :class="{ active: skin.id === activeSkinId, locked: isSkinLocked(skin) }"
            :data-testid="`skin-option-${skin.id}`"
            :disabled="isSkinLocked(skin)"
            @click="selectSkin(skin.id)"
          >
            <span class="skin-preview" :style="{ background: skin.bg, borderColor: skin.snakeHead }">
              <span class="skin-preview__snake" :style="{ background: skin.snakeHead }"></span>
              <span class="skin-preview__food" :style="{ background: skin.food.coin }"></span>
            </span>
            <span class="skin-meta">
              <span class="skin-name">{{ skin.name }}</span>
              <span class="skin-status">
                {{ isSkinLocked(skin) ? (skin.unlockLabel || '暂未开放') : (skin.id === activeSkinId ? '使用中' : '可使用') }}
              </span>
            </span>
          </button>
        </div>
      </n-tab-pane>

      <n-tab-pane name="security" tab="账号安全">
        <div class="security-panel" data-testid="profile-security-panel">
          <n-form :model="passwordForm" @submit.prevent="handleUpdatePassword">
            <section class="security-section">
              <h3 class="section-title">修改密码</h3>

              <div class="form-field">
                <label class="form-label">当前密码</label>
                <NeonInput
                  data-testid="security-current-password"
                  v-model="passwordForm.currentPassword"
                  type="password"
                  show-password-toggle
                  placeholder="输入当前密码"
                  :error="!!securityErrors.currentPassword"
                />
                <span v-if="securityErrors.currentPassword" class="form-error">{{ securityErrors.currentPassword }}</span>
              </div>

              <div class="form-field">
                <label class="form-label">新密码</label>
                <NeonInput
                  data-testid="security-new-password"
                  v-model="passwordForm.newPassword"
                  type="password"
                  show-password-toggle
                  placeholder="至少 6 个字符"
                  :error="!!securityErrors.newPassword"
                />
                <span v-if="securityErrors.newPassword" class="form-error">{{ securityErrors.newPassword }}</span>
              </div>

              <div class="form-field">
                <label class="form-label">确认新密码</label>
                <NeonInput
                  data-testid="security-confirm-password"
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  show-password-toggle
                  placeholder="再次输入新密码"
                  :error="!!securityErrors.confirmPassword"
                />
                <span v-if="securityErrors.confirmPassword" class="form-error">{{ securityErrors.confirmPassword }}</span>
              </div>

              <n-button
                data-testid="security-update-password"
                type="primary"
                attr-type="button"
                :loading="isUpdatingPassword"
                @click="handleUpdatePassword"
              >
                更新密码
              </n-button>
            </section>
          </n-form>

          <n-form :model="emailForm" @submit.prevent="handleUpdateEmail">
            <section class="security-section">
              <h3 class="section-title">修改邮箱</h3>

              <div class="form-field">
                <label class="form-label">当前密码</label>
                <NeonInput
                  data-testid="security-email-current-password"
                  v-model="emailForm.currentPassword"
                  type="password"
                  show-password-toggle
                  placeholder="输入当前密码"
                  :error="!!securityErrors.emailCurrentPassword"
                />
                <span v-if="securityErrors.emailCurrentPassword" class="form-error">{{ securityErrors.emailCurrentPassword }}</span>
              </div>

              <div class="form-field">
                <label class="form-label">新邮箱</label>
                <NeonInput
                  data-testid="security-new-email"
                  v-model="emailForm.newEmail"
                  placeholder="name@example.com"
                  :error="!!securityErrors.newEmail"
                />
                <span v-if="securityErrors.newEmail" class="form-error">{{ securityErrors.newEmail }}</span>
              </div>

              <n-button
                data-testid="security-update-email"
                type="primary"
                attr-type="button"
                :loading="isUpdatingEmail"
                @click="handleUpdateEmail"
              >
                更新邮箱
              </n-button>
            </section>
          </n-form>
        </div>
      </n-tab-pane>
    </n-tabs>

    <template #footer>
      <div class="modal-footer">
        <n-button @click="onClose">取消</n-button>
        <n-button
          v-if="activeTab === 'profile'"
          data-testid="profile-submit"
          type="primary"
          :loading="isSubmitting"
          @click="handleSubmit"
        >
          保存
        </n-button>
      </div>
    </template>

    <n-alert v-if="errorMessage" type="error" class="error-alert">
      {{ errorMessage }}
    </n-alert>
    <n-alert v-if="successMessage" type="success" class="success-alert">
      {{ successMessage }}
    </n-alert>
  </n-modal>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import NeonInput from '../ui/NeonInput.vue'
import { api } from '../../lib/api.js'
import { useSkinStore } from '../../stores/skin.js'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  currentUsername: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:show', 'usernameUpdated'])

const isSubmitting = ref(false)
const isUpdatingPassword = ref(false)
const isUpdatingEmail = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const activeTab = ref('profile')
const skinStore = useSkinStore()
const skinList = computed(() => skinStore.allSkins)
const activeSkinId = computed(() => skinStore.activeSkin.id)

const form = reactive({ username: '' })
const errors = reactive({ username: '' })
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const emailForm = reactive({
  currentPassword: '',
  newEmail: ''
})
const securityErrors = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  emailCurrentPassword: '',
  newEmail: ''
})

watch(() => props.show, (val) => {
  if (val) {
    form.username = props.currentUsername || ''
    errors.username = ''
    errorMessage.value = ''
    successMessage.value = ''
    activeTab.value = 'profile'
    resetSecurityForms()
  }
})

function validate() {
  errors.username = ''
  const username = form.username.trim()

  if (!username) {
    errors.username = '请输入用户名'
    return false
  }

  if (!/^[a-zA-Z0-9_]{2,20}$/.test(username)) {
    errors.username = '只允许字母、数字、下划线，长度 2-20'
    return false
  }

  return true
}

function resetSecurityForms() {
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  emailForm.currentPassword = ''
  emailForm.newEmail = ''
  clearSecurityErrors()
}

function clearSecurityErrors() {
  securityErrors.currentPassword = ''
  securityErrors.newPassword = ''
  securityErrors.confirmPassword = ''
  securityErrors.emailCurrentPassword = ''
  securityErrors.newEmail = ''
}

function validatePasswordForm() {
  clearSecurityErrors()
  let valid = true

  if (!passwordForm.currentPassword) {
    securityErrors.currentPassword = '请输入当前密码'
    valid = false
  }

  if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
    securityErrors.newPassword = '新密码至少 6 个字符'
    valid = false
  }

  if (passwordForm.confirmPassword !== passwordForm.newPassword) {
    securityErrors.confirmPassword = '两次输入的新密码不一致'
    valid = false
  }

  return valid
}

function validateEmailForm() {
  clearSecurityErrors()
  let valid = true
  const newEmail = emailForm.newEmail.trim()

  if (!emailForm.currentPassword) {
    securityErrors.emailCurrentPassword = '请输入当前密码'
    valid = false
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    securityErrors.newEmail = '请输入有效邮箱'
    valid = false
  }

  return valid
}

function isSkinLocked(skin) {
  return !skinStore.availableSkins.some((availableSkin) => availableSkin.id === skin.id)
}

function selectSkin(skinId) {
  skinStore.setActive(skinId)
}

async function handleSubmit() {
  errorMessage.value = ''
  successMessage.value = ''
  if (!validate()) return

  isSubmitting.value = true
  try {
    const data = await api.auth.updateProfile(form.username.trim())
    emit('usernameUpdated', data.username)
    onClose()
  } catch (err) {
    errorMessage.value = err.message || '修改失败，请稍后重试'
  } finally {
    isSubmitting.value = false
  }
}

async function handleUpdatePassword() {
  errorMessage.value = ''
  successMessage.value = ''
  if (!validatePasswordForm()) return

  isUpdatingPassword.value = true
  try {
    await api.auth.updatePassword(passwordForm.currentPassword, passwordForm.newPassword)
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    successMessage.value = '密码已更新，下次登录请使用新密码'
  } catch (err) {
    errorMessage.value = err.message || '密码更新失败，请稍后重试'
  } finally {
    isUpdatingPassword.value = false
  }
}

async function handleUpdateEmail() {
  errorMessage.value = ''
  successMessage.value = ''
  if (!validateEmailForm()) return

  isUpdatingEmail.value = true
  try {
    await api.auth.updateEmail(emailForm.currentPassword, emailForm.newEmail.trim())
    emailForm.currentPassword = ''
    emailForm.newEmail = ''
    successMessage.value = '确认邮件已发送，请前往新邮箱完成验证'
  } catch (err) {
    errorMessage.value = err.message || '邮箱更新失败，请稍后重试'
  } finally {
    isUpdatingEmail.value = false
  }
}

function onClose() {
  emit('update:show', false)
}
</script>

<style scoped>
.form-field {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary, #909399);
  margin-bottom: 8px;
}

.current-username {
  font-size: 15px;
  color: var(--text-primary, #303133);
  padding: 8px 12px;
  background: var(--input-bg, #f5f7fa);
  border-radius: 6px;
  border: 1px solid var(--card-border, #dcdfe6);
}

.form-error {
  font-size: 12px;
  color: #f56c6c;
  margin-top: 4px;
  display: block;
}

.form-hint {
  font-size: 11px;
  color: var(--text-disabled, #c0c4cc);
  margin-top: 4px;
  display: block;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.error-alert {
  margin-top: 12px;
}

.success-alert {
  margin-top: 12px;
}

.security-panel {
  display: grid;
  gap: 24px;
}

.security-section {
  padding-top: 4px;
  border-top: 1px solid var(--card-border, #dcdfe6);
}

.security-section:first-child {
  border-top: none;
  padding-top: 0;
}

.section-title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #303133);
}

.skin-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.skin-option {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  width: 100%;
  min-height: 76px;
  padding: 10px;
  background: var(--input-bg, #f5f7fa);
  border: 1px solid var(--card-border, #dcdfe6);
  border-radius: 8px;
  color: var(--text-primary, #303133);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s, opacity 0.2s, box-shadow 0.2s;
}

.skin-option.active {
  border-color: var(--neon-green, #4ade80);
  box-shadow: 0 0 12px rgba(74, 222, 128, 0.25);
}

.skin-option.locked {
  cursor: not-allowed;
  opacity: 0.55;
}

.skin-preview {
  position: relative;
  width: 56px;
  height: 56px;
  border: 2px solid;
  border-radius: 6px;
  overflow: hidden;
}

.skin-preview__snake,
.skin-preview__food {
  position: absolute;
  display: block;
}

.skin-preview__snake {
  left: 10px;
  top: 24px;
  width: 28px;
  height: 10px;
  border-radius: 4px;
}

.skin-preview__food {
  right: 9px;
  top: 9px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.skin-meta {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.skin-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #303133);
  overflow-wrap: anywhere;
}

.skin-status {
  font-size: 12px;
  color: var(--text-secondary, #909399);
}

@media (max-width: 520px) {
  .skin-panel {
    grid-template-columns: 1fr;
  }
}
</style>
