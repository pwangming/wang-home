<template>
  <div class="register-page">
    <!-- 顶部导航 -->
    <header class="register-nav">
      <div class="register-nav__logo">霓虹贪吃蛇</div>
      <button class="register-nav__close">✕</button>
    </header>

    <!-- 装饰元素 -->
    <div class="register-decor register-decor--tl" />
    <div class="register-decor register-decor--br" />
    <div class="register-float-card">
      <div class="float-card__icon">🎮</div>
      <div class="float-card__title">首充优惠</div>
      <div class="float-card__desc">新用户首次充值享受双倍金币</div>
    </div>
    <div class="register-players">
      <img src="/avatars/1.png" alt="" class="player-avatar" />
      <img src="/avatars/2.png" alt="" class="player-avatar" />
      <img src="/avatars/3.png" alt="" class="player-avatar" />
      <div class="players-text">666 玩家在线</div>
    </div>

    <!-- 注册卡片 -->
    <NeonCard class="register-card">
      <div class="register-header">
        <h1 class="register-title">注册新账号</h1>
        <p class="register-subtitle">加入 Kinetic Arcade，体验次世代贪吃蛇竞技。</p>
      </div>

      <div class="register-form">
        <div class="form-field">
          <label class="form-label">邮箱</label>
          <NeonInput
            v-model="form.email"
            placeholder="example@kinetic.com"
            :error="!!errors.email"
          >
            <template #icon>✉️</template>
          </NeonInput>
          <span v-if="errors.email" class="form-error">{{ errors.email }}</span>
        </div>

        <div class="form-field">
          <label class="form-label">验证码</label>
          <div class="code-input-row">
            <NeonInput
              v-model="form.code"
              placeholder="输入验证码"
              :error="!!errors.code"
            />
            <NeonButton type="default" class="code-btn" @click="sendCode" :disabled="codeCooldown > 0">
              {{ codeCooldown > 0 ? `${codeCooldown}s` : '发送验证码' }}
            </NeonButton>
          </div>
          <span v-if="errors.code" class="form-error">{{ errors.code }}</span>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label class="form-label">密码</label>
            <NeonInput
              v-model="form.password"
              type="password"
              placeholder="••••••••"
              :error="!!errors.password"
            />
            <span v-if="errors.password" class="form-error">{{ errors.password }}</span>
          </div>
          <div class="form-field">
            <label class="form-label">确认密码</label>
            <NeonInput
              v-model="form.confirmPassword"
              type="password"
              placeholder="••••••••"
              :error="!!errors.confirmPassword"
            />
            <span v-if="errors.confirmPassword" class="form-error">{{ errors.confirmPassword }}</span>
          </div>
        </div>

        <NeonButton type="primary" :loading="isSubmitting" @click="handleSubmit">
          注册
        </NeonButton>

        <div class="register-divider">
          <span>或</span>
        </div>

        <NeonButton type="default" @click="handleGoogleRegister">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google 注册
        </NeonButton>
      </div>

      <div class="register-footer">
        已有账号？<router-link to="/login" class="link-green">立即登录</router-link>
      </div>
    </NeonCard>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import NeonCard from '../components/ui/NeonCard.vue'
import NeonButton from '../components/ui/NeonButton.vue'
import NeonInput from '../components/ui/NeonInput.vue'
import { authStore } from '../stores/auth.js'

const router = useRouter()

const isSubmitting = ref(false)
const codeCooldown = ref(0)
const errors = reactive({
  email: '',
  code: '',
  password: '',
  confirmPassword: ''
})

const form = reactive({
  email: '',
  code: '',
  password: '',
  confirmPassword: ''
})

let cooldownTimer = null

function sendCode() {
  if (codeCooldown.value > 0) return
  if (!form.email) {
    errors.email = '请输入邮箱'
    return
  }
  // TODO: Call API to send verification code
  codeCooldown.value = 60
  cooldownTimer = setInterval(() => {
    codeCooldown.value--
    if (codeCooldown.value <= 0) {
      clearInterval(cooldownTimer)
    }
  }, 1000)
}

function validate() {
  Object.keys(errors).forEach(k => errors[k] = '')
  let valid = true

  if (!form.email) {
    errors.email = '请输入邮箱'
    valid = false
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = '邮箱格式不正确'
    valid = false
  }

  if (!form.code) {
    errors.code = '请输入验证码'
    valid = false
  }

  if (!form.password) {
    errors.password = '请输入密码'
    valid = false
  } else if (form.password.length < 6) {
    errors.password = '密码至少6位'
    valid = false
  }

  if (form.password !== form.confirmPassword) {
    errors.confirmPassword = '两次密码不一致'
    valid = false
  }

  return valid
}

async function handleSubmit() {
  if (!validate()) return

  isSubmitting.value = true
  try {
    await authStore.register(form.email, form.password, form.code)
    router.push('/game')
  } catch (err) {
    console.error('Register failed:', err)
  } finally {
    isSubmitting.value = false
  }
}

function handleGoogleRegister() {
  // TODO: Implement Google OAuth
  console.log('Google register not implemented')
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-end));
  padding: 0 40px 40px;
  position: relative;
  overflow: hidden;
}

/* 导航 */
.register-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  max-width: 1280px;
  margin: 0 auto;
}

.register-nav__logo {
  font-size: 24px;
  color: var(--text-primary);
}

.register-nav__close {
  width: 40px;
  height: 40px;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 24px;
  cursor: pointer;
}

/* 装饰 */
.register-decor {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.4;
}

.register-decor--tl {
  width: 384px;
  height: 384px;
  background: rgba(74, 222, 128, 0.3);
  top: -100px;
  left: -100px;
}

.register-decor--br {
  width: 500px;
  height: 500px;
  background: rgba(64, 158, 255, 0.3);
  bottom: -200px;
  right: -100px;
}

.register-float-card {
  position: absolute;
  top: 180px;
  right: 80px;
  width: 200px;
  padding: 20px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  backdrop-filter: blur(10px);
}

.float-card__icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.float-card__title {
  color: var(--neon-green);
  font-weight: bold;
  margin-bottom: 4px;
}

.float-card__desc {
  color: var(--text-secondary);
  font-size: 12px;
}

.register-players {
  position: absolute;
  bottom: 120px;
  left: 80px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.player-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--bg-gradient-start);
  margin-left: -10px;
}

.player-avatar:first-child {
  margin-left: 0;
}

.players-text {
  color: var(--text-secondary);
  font-size: 12px;
  margin-left: 8px;
}

/* 卡片 */
.register-card {
  width: 480px;
  margin: 40px auto;
}

.register-header {
  margin-bottom: 32px;
}

.register-title {
  font-size: 24px;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.register-subtitle {
  color: var(--text-secondary);
  margin: 0;
}

/* 表单 */
.register-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-field {
  flex: 1;
}

.form-label {
  display: block;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.form-error {
  font-size: 12px;
  color: var(--error-color, #f56c6c);
  margin-top: 4px;
  display: block;
}

.form-row {
  display: flex;
  gap: 16px;
}

.code-input-row {
  display: flex;
  gap: 12px;
}

.code-btn {
  flex: 0 0 120px;
  height: var(--input-height) !important;
}

.register-divider {
  display: flex;
  align-items: center;
  margin: 16px 0;
  color: var(--text-disabled);
  font-size: 14px;
}

.register-divider::before,
.register-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--card-border);
}

.register-divider span {
  padding: 0 16px;
}

.register-footer {
  text-align: center;
  margin-top: 24px;
  color: var(--text-secondary);
  font-size: 14px;
}

.link-green {
  color: var(--neon-green);
  text-decoration: none;
}
</style>
