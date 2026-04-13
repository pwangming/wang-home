<template>
  <div class="reset-page">
    <!-- 装饰元素 -->
    <div class="reset-decor reset-decor--tl" />
    <div class="reset-decor reset-decor--br" />

    <NeonCard class="reset-card">
      <!-- 步骤1：请求重置邮件 -->
      <template v-if="step === 'request'">
        <h2 class="reset-card__title">重置密码</h2>
        <p class="reset-card__desc">输入你注册时的邮箱，我们会发送重置链接。</p>

        <n-form :model="requestForm" @submit.prevent="handleRequest">
          <div class="form-field">
            <label class="form-label">邮箱</label>
            <NeonInput
              data-testid="reset-email"
              v-model="requestForm.email"
              placeholder="请输入注册邮箱"
              :error="!!errors.email"
            >
              <template #icon>✉️</template>
            </NeonInput>
            <span v-if="errors.email" class="form-error">{{ errors.email }}</span>
          </div>

          <NeonButton
            data-testid="reset-request-submit"
            type="primary"
            :loading="isSubmitting"
            @click="handleRequest"
          >
            发送重置链接
          </NeonButton>
        </n-form>

        <div class="reset-footer">
          <router-link to="/login" class="link-green">想起密码了？返回登录</router-link>
        </div>

        <n-alert v-if="successMessage" type="success" class="success-alert">
          {{ successMessage }}
        </n-alert>
        <n-alert v-if="errorMessage" type="error" class="error-alert">
          {{ errorMessage }}
        </n-alert>
      </template>

      <!-- 步骤2：设置新密码（token 在 URL 中） -->
      <template v-else-if="step === 'reset'">
        <h2 class="reset-card__title">设置新密码</h2>
        <p class="reset-card__desc">请输入新密码（至少 6 个字符）。</p>

        <n-form :model="resetForm" @submit.prevent="handleReset">
          <div class="form-field">
            <label class="form-label">新密码</label>
            <NeonInput
              data-testid="reset-password"
              v-model="resetForm.password"
              type="password"
              placeholder="输入新密码"
              show-password-toggle
              :error="!!errors.password"
            >
              <template #icon>🔒</template>
            </NeonInput>
            <span v-if="errors.password" class="form-error">{{ errors.password }}</span>
          </div>

          <div class="form-field">
            <label class="form-label">确认密码</label>
            <NeonInput
              data-testid="reset-password-confirm"
              v-model="resetForm.passwordConfirm"
              type="password"
              placeholder="再次输入新密码"
              show-password-toggle
              :error="!!errors.passwordConfirm"
            >
              <template #icon>🔒</template>
            </NeonInput>
            <span v-if="errors.passwordConfirm" class="form-error">{{ errors.passwordConfirm }}</span>
          </div>

          <NeonButton
            data-testid="reset-submit"
            type="primary"
            :loading="isSubmitting"
            @click="handleReset"
          >
            确认修改
          </NeonButton>
        </n-form>

        <div class="reset-footer">
          <router-link to="/login" class="link-green">返回登录</router-link>
        </div>

        <n-alert v-if="errorMessage" type="error" class="error-alert">
          {{ errorMessage }}
        </n-alert>
      </template>

      <!-- 步骤3：重置成功 -->
      <template v-else-if="step === 'success'">
        <div class="reset-success">
          <div class="success-icon">✅</div>
          <h2 class="reset-card__title">密码已重置</h2>
          <p class="reset-card__desc">请使用新密码登录。</p>
          <NeonButton type="primary" @click="router.push('/login')">
            返回登录
          </NeonButton>
        </div>
      </template>
    </NeonCard>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NeonCard from '../components/ui/NeonCard.vue'
import NeonButton from '../components/ui/NeonButton.vue'
import NeonInput from '../components/ui/NeonInput.vue'
import { api } from '../lib/api.js'

const router = useRouter()
const route = useRoute()

const step = ref('request')
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const requestForm = reactive({ email: '' })
const resetForm = reactive({ password: '', passwordConfirm: '' })
const errors = reactive({ email: '', password: '', passwordConfirm: '' })

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

onMounted(() => {
  // If token is in query params, go to reset step
  if (route.query.token) {
    step.value = 'reset'
  }
})

function validateRequest() {
  errors.email = ''
  if (!requestForm.email) {
    errors.email = '请输入邮箱'
    return false
  }
  if (!emailRegex.test(requestForm.email)) {
    errors.email = '请输入有效的邮箱格式'
    return false
  }
  return true
}

function validateReset() {
  errors.password = ''
  errors.passwordConfirm = ''
  if (!resetForm.password) {
    errors.password = '请输入新密码'
    return false
  }
  if (resetForm.password.length < 6) {
    errors.password = '密码至少 6 个字符'
    return false
  }
  if (resetForm.password !== resetForm.passwordConfirm) {
    errors.passwordConfirm = '两次输入的密码不一致'
    return false
  }
  return true
}

async function handleRequest() {
  errorMessage.value = ''
  successMessage.value = ''
  if (!validateRequest()) return

  isSubmitting.value = true
  try {
    await api.auth.resetRequest(requestForm.email)
    // Always show success to avoid leaking email existence
    successMessage.value = '如果该邮箱已注册，您将收到密码重置邮件。'
    requestForm.email = ''
  } catch (err) {
    errorMessage.value = err.message || '发送失败，请稍后重试'
  } finally {
    isSubmitting.value = false
  }
}

async function handleReset() {
  errorMessage.value = ''
  if (!validateReset()) return

  const token = route.query.token
  if (!token) {
    errorMessage.value = '重置链接已失效，请重新请求密码重置'
    step.value = 'request'
    return
  }

  isSubmitting.value = true
  try {
    await api.auth.resetConfirm(token, resetForm.password)
    step.value = 'success'
  } catch (err) {
    errorMessage.value = err.message || '重置失败，链接可能已过期'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.reset-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-end));
  padding: clamp(16px, 2vw, 48px);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.reset-decor {
  position: absolute;
  border-radius: 50%;
  filter: blur(clamp(60px, 5vw, 100px));
  opacity: 0.5;
  pointer-events: none;
}

.reset-decor--tl {
  width: clamp(300px, 25vw, 512px);
  height: clamp(300px, 25vw, 512px);
  background: rgba(74, 222, 128, 0.2);
  top: calc(-1 * clamp(150px, 15vw, 256px));
  left: calc(-1 * clamp(150px, 15vw, 256px));
}

.reset-decor--br {
  width: clamp(250px, 20vw, 400px);
  height: clamp(200px, 15vw, 320px);
  background: rgba(64, 158, 255, 0.2);
  bottom: calc(-1 * clamp(100px, 10vw, 150px));
  right: clamp(50px, 8vw, 150px);
}

.reset-card {
  position: relative;
  z-index: 1;
  width: clamp(320px, 25vw, 420px);
  padding: clamp(24px, 2vw, 36px) !important;
}

.reset-card__title {
  font-size: clamp(18px, 1.5vw, 24px);
  color: var(--text-primary);
  margin: 0 0 clamp(8px, 1vh, 16px);
}

.reset-card__desc {
  font-size: clamp(12px, 0.9vw, 14px);
  color: var(--text-secondary);
  margin: 0 0 clamp(16px, 2vh, 28px);
  line-height: 1.5;
}

.form-field {
  margin-bottom: clamp(12px, 1.5vh, 20px);
}

.form-label {
  display: block;
  font-size: clamp(12px, 0.9vw, 14px);
  color: var(--text-secondary);
  margin-bottom: clamp(4px, 0.8vh, 10px);
}

.form-error {
  font-size: clamp(10px, 0.75vw, 12px);
  color: var(--error-color, #f56c6c);
  margin-top: 4px;
  display: block;
}

.reset-footer {
  text-align: center;
  margin-top: clamp(16px, 2vh, 24px);
}

.link-green {
  color: var(--neon-green);
  text-decoration: none;
  font-size: clamp(12px, 0.9vw, 14px);
}

.error-alert {
  margin-top: clamp(12px, 1.5vh, 20px);
}

.success-alert {
  margin-top: clamp(12px, 1.5vh, 20px);
}

.reset-success {
  text-align: center;
}

.success-icon {
  font-size: clamp(36px, 3vw, 52px);
  margin-bottom: clamp(12px, 1.5vh, 20px);
}

.reset-success p {
  margin-bottom: clamp(16px, 2vh, 28px);
}
</style>
