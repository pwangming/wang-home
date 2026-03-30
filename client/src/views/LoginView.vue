<template>
  <div class="login-page">
    <!-- 装饰元素 -->
    <div class="login-decor login-decor--tl" />
    <div class="login-decor login-decor--br" />
    <div class="login-decor login-decor--tr" />

    <div class="login-container">
      <!-- 左侧品牌区 -->
      <div class="login-brand">
        <div class="login-brand__label">KINETIC ARCADE</div>
        <h1 class="login-brand__title">霓虹贪吃蛇</h1>
        <p class="login-brand__desc">
          欢迎回到充满活力的竞技场。体验最流畅的滑动感，挑战全球积分榜，开启您的霓虹贪吃蛇之旅。
        </p>
        <div class="login-brand__avatars">
          <img src="/avatars/1.png" alt="" class="avatar" />
          <img src="/avatars/2.png" alt="" class="avatar" />
          <img src="/avatars/3.png" alt="" class="avatar" />
          <span class="login-brand__avatars-text">+666 玩家在线</span>
        </div>
      </div>

      <!-- 右侧登录卡片 -->
      <NeonCard class="login-card">
        <h2 class="login-card__title">登录账号</h2>

        <n-form :model="form" @submit.prevent="handleSubmit">
          <div class="form-field">
            <label class="form-label">用户名或邮箱</label>
            <NeonInput
              v-model="form.email"
              placeholder="您的账号信息"
              :error="!!errors.email"
            >
              <template #icon>👤</template>
            </NeonInput>
            <span v-if="errors.email" class="form-error">{{ errors.email }}</span>
          </div>

          <div class="form-field">
            <label class="form-label">密码</label>
            <NeonInput
              v-model="form.password"
              type="password"
              placeholder="••••••••"
              show-password-toggle
              :error="!!errors.password"
            >
              <template #icon>🔒</template>
            </NeonInput>
            <span v-if="errors.password" class="form-error">{{ errors.password }}</span>
          </div>

          <div class="form-options">
            <NeonCheckbox v-model="rememberMe">记住我</NeonCheckbox>
            <a href="#" class="form-link">忘记密码？</a>
          </div>

          <NeonButton
            type="primary"
            :loading="isSubmitting"
            @click="handleSubmit"
          >
            登录
          </NeonButton>
        </n-form>

        <div class="login-divider">
          <span>或</span>
        </div>

        <NeonButton type="default" @click="handleGoogleLogin">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google 登录
        </NeonButton>

        <div class="login-footer">
          还没有账号？<router-link to="/register" class="link-green">立即注册</router-link>
        </div>

        <n-alert v-if="errorMessage" type="error" class="error-alert">
          {{ errorMessage }}
        </n-alert>
      </NeonCard>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { NForm, NAlert } from 'naive-ui'
import NeonCard from '../components/ui/NeonCard.vue'
import NeonButton from '../components/ui/NeonButton.vue'
import NeonInput from '../components/ui/NeonInput.vue'
import NeonCheckbox from '../components/ui/NeonCheckbox.vue'
import { authStore } from '../stores/auth.js'

const router = useRouter()

const isSubmitting = ref(false)
const errorMessage = ref('')
const rememberMe = ref(false)

const form = reactive({
  email: '',
  password: ''
})

const errors = reactive({
  email: '',
  password: ''
})

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate() {
  errors.email = ''
  errors.password = ''

  if (!form.email) {
    errors.email = '请输入邮箱'
    return false
  }
  if (!emailRegex.test(form.email)) {
    errors.email = '请输入有效的邮箱格式'
    return false
  }
  if (!form.password) {
    errors.password = '请输入密码'
    return false
  }
  return true
}

async function handleSubmit() {
  errorMessage.value = ''
  if (!validate()) return

  isSubmitting.value = true
  try {
    await authStore.login(form.email, form.password, rememberMe.value)
    router.push('/game')
  } catch (err) {
    errorMessage.value = err.message || '登录失败'
  } finally {
    isSubmitting.value = false
  }
}

function handleGoogleLogin() {
  // TODO: Implement Google OAuth login flow
  // This will require setting up Google OAuth credentials in Supabase
  console.log('Google login not implemented')
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-end));
  padding: 40px;
  position: relative;
  overflow: hidden;
  --decor-green: rgba(74, 222, 128, 0.2);
  --decor-blue: rgba(64, 158, 255, 0.2);
  --error-color: #f56c6c;
}

/* 装饰元素 */
.login-decor {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
}

.login-decor--tl {
  width: 512px;
  height: 512px;
  background: var(--decor-green);
  top: -256px;
  left: -256px;
}

.login-decor--br {
  width: 384px;
  height: 307px;
  background: var(--decor-blue);
  bottom: -150px;
  right: 100px;
}

.login-decor--tr {
  width: 181px;
  height: 181px;
  border: 1px solid var(--neon-green);
  opacity: 0.3;
  top: 200px;
  right: 0;
  filter: none;
}

/* 容器 */
.login-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 48px;
  align-items: center;
  min-height: calc(100vh - 80px);
}

/* 品牌区 */
.login-brand {
  flex: 1;
  padding: 20px;
}

.login-brand__label {
  font-size: 12px;
  color: var(--neon-green);
  letter-spacing: 2px;
  margin-bottom: 16px;
}

.login-brand__title {
  font-size: 64px;
  color: var(--text-primary);
  margin: 0 0 24px;
  line-height: 1.1;
  text-shadow: 0 0 30px var(--neon-green-glow);
}

.login-brand__desc {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0 0 32px;
  line-height: 1.6;
  max-width: 480px;
}

.login-brand__avatars {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid var(--bg-gradient-start);
  margin-left: -12px;
}

.avatar:first-child {
  margin-left: 0;
}

.login-brand__avatars-text {
  color: var(--text-secondary);
  font-size: 14px;
  margin-left: 12px;
}

/* 登录卡片 */
.login-card {
  flex: 0 0 400px;
}

.login-card__title {
  font-size: 18px;
  color: var(--text-primary);
  margin: 0 0 24px;
}

/* 表单 */
.form-field {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.form-error {
  font-size: 12px;
  color: var(--error-color);
  margin-top: 4px;
  display: block;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.form-link {
  color: var(--neon-blue);
  font-size: 14px;
  text-decoration: none;
}

.login-divider {
  display: flex;
  align-items: center;
  margin: 24px 0;
  color: var(--text-disabled);
  font-size: 14px;
}

.login-divider::before,
.login-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--card-border);
}

.login-divider span {
  padding: 0 16px;
}

.login-footer {
  text-align: center;
  margin-top: 24px;
  color: var(--text-secondary);
  font-size: 14px;
}

.link-green {
  color: var(--neon-green);
  text-decoration: none;
}

.error-alert {
  margin-top: 16px;
}
</style>
