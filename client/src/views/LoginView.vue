<template>
  <div class="login-page">
    <!-- 装饰元素 -->
    <div class="login-decor login-decor--tl" />
    <div class="login-decor login-decor--br" />

    <div class="login-container">
      <!-- 左侧品牌区 -->
      <div class="login-brand">
        <div class="login-brand__label">KINETIC ARCADE</div>
        <h1 class="login-brand__title">霓虹贪吃蛇</h1>
        <p class="login-brand__desc">
          欢迎回到充满活力的竞技场。体验最流畅的操作手感，挑战全球积分榜，开启你的霓虹贪吃蛇之旅。
        </p>
        <div class="login-brand__avatars">
          <span class="login-brand__avatars-text">+666 玩家在线</span>
          <img src="/avatars/1.png" alt="" class="avatar" />
          <img src="/avatars/2.png" alt="" class="avatar" />
          <img src="/avatars/3.png" alt="" class="avatar" />
        </div>
      </div>

      <!-- 右侧登录卡片 -->
      <NeonCard class="login-card">
        <h2 class="login-card__title">登录账号</h2>

        <n-form :model="form" @submit.prevent="handleSubmit">
          <div class="form-field">
            <label class="form-label">邮箱</label>
            <NeonInput
              data-testid="login-email"
              v-model="form.email"
              placeholder="请输入邮箱"
              :error="!!errors.email"
            >
              <template #icon>👤</template>
            </NeonInput>
            <span v-if="errors.email" class="form-error">{{ errors.email }}</span>
          </div>

          <div class="form-field">
            <label class="form-label">密码</label>
            <NeonInput
              data-testid="login-password"
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              show-password-toggle
              :error="!!errors.password"
            >
              <template #icon>🔒</template>
            </NeonInput>
            <span v-if="errors.password" class="form-error">{{ errors.password }}</span>
          </div>

          <div class="form-options">
            <NeonCheckbox v-model="rememberMe">记住我</NeonCheckbox>
            <router-link to="/reset-password" class="form-link">忘记密码？</router-link>
          </div>

          <NeonButton
            data-testid="login-submit"
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
import NeonCard from '../components/ui/NeonCard.vue'
import NeonButton from '../components/ui/NeonButton.vue'
import NeonInput from '../components/ui/NeonInput.vue'
import NeonCheckbox from '../components/ui/NeonCheckbox.vue'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

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
  message.info('Google 登录即将上线，敬请期待')
}
</script>

<style scoped>
/* === 1920x1080 Baseline === */
.login-page {
  --page-padding: clamp(16px, 2vw, 48px);
  --brand-title-size: clamp(32px, 3vw, 56px);
  --brand-desc-size: clamp(12px, 1vw, 16px);
  --card-width: clamp(320px, 25vw, 420px);
  --input-height: clamp(44px, 4vh, 56px);
  --btn-height: clamp(44px, 5vh, 56px);
  --avatar-size: clamp(28px, 2.5vw, 40px);

  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-end));
  padding: var(--page-padding);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  --decor-green: rgba(74, 222, 128, 0.2);
  --decor-blue: rgba(64, 158, 255, 0.2);
  --error-color: #f56c6c;
}

/* 装饰元素 */
.login-decor {
  position: absolute;
  border-radius: 50%;
  filter: blur(clamp(60px, 5vw, 100px));
  opacity: 0.5;
  pointer-events: none;
}

.login-decor--tl {
  width: clamp(300px, 25vw, 512px);
  height: clamp(300px, 25vw, 512px);
  background: var(--decor-green);
  top: calc(-1 * clamp(150px, 15vw, 256px));
  left: calc(-1 * clamp(150px, 15vw, 256px));
}

.login-decor--br {
  width: clamp(250px, 20vw, 400px);
  height: clamp(200px, 15vw, 320px);
  background: var(--decor-blue);
  bottom: calc(-1 * clamp(100px, 10vw, 150px));
  right: clamp(50px, 8vw, 150px);
}

.login-decor--tr {
  width: clamp(100px, 10vw, 180px);
  height: clamp(100px, 10vw, 180px);
  border: 1px solid var(--neon-green);
  opacity: 0.3;
  top: clamp(100px, 15vh, 200px);
  right: 0;
  filter: none;
  border-radius: 8px;
}

/* 容器 */
.login-container {
  max-width: 1200px;
  width: 100%;
  display: flex;
  gap: clamp(24px, 4vw, 64px);
  align-items: center;
  justify-content: center;
}

/* 品牌区 */
.login-brand {
  flex: 1;
  padding: clamp(10px, 2vw, 24px);
  max-width: 600px;
}

.login-brand__label {
  font-size: clamp(10px, 0.8vw, 14px);
  color: var(--neon-green);
  letter-spacing: clamp(1px, 0.15vw, 2px);
  margin-bottom: clamp(8px, 1vh, 16px);
}

.login-brand__title {
  font-size: var(--brand-title-size);
  color: var(--text-primary);
  margin: 0 0 clamp(8px, 1.5vh, 20px);
  line-height: 1.1;
  text-shadow: 0 0 30px var(--neon-green-glow);
}

.login-brand__desc {
  font-size: var(--brand-desc-size);
  color: var(--text-secondary);
  margin: 0 0 clamp(12px, 2vh, 24px);
  line-height: 1.5;
  max-width: clamp(280px, 25vw, 420px);
}

.login-brand__avatars {
  display: flex;
  align-items: center;
  gap: clamp(4px, 0.5vw, 8px);
}

.avatar {
  width: var(--avatar-size);
  height: var(--avatar-size);
  border-radius: 50%;
  border: 2px solid var(--bg-gradient-start);
  margin-left: calc(-1 * clamp(6px, 0.8vw, 12px));
}

.avatar:first-child {
  margin-left: 0;
}

.login-brand__avatars-text {
  color: var(--text-secondary);
  font-size: clamp(11px, 0.9vw, 14px);
  margin-right: clamp(8px, 1vw, 16px);
}

/* 登录卡片 */
.login-card {
  flex: 0 0 var(--card-width);
  padding: clamp(20px, 2vw, 32px) !important;
}

.login-card__title {
  font-size: clamp(16px, 1.2vw, 20px);
  color: var(--text-primary);
  margin: 0 0 clamp(16px, 2vh, 28px);
}

/* 表单 */
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
  color: var(--error-color);
  margin-top: 4px;
  display: block;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: clamp(16px, 2vh, 28px);
}

.form-link {
  color: var(--neon-blue);
  font-size: clamp(12px, 0.85vw, 14px);
  text-decoration: none;
}

.login-divider {
  display: flex;
  align-items: center;
  margin: clamp(16px, 2vh, 28px) 0;
  color: var(--text-disabled);
  font-size: clamp(12px, 0.85vw, 14px);
}

.login-divider::before,
.login-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--card-border);
}

.login-divider span {
  padding: 0 clamp(8px, 1vw, 16px);
}

.login-footer {
  text-align: center;
  margin-top: clamp(16px, 2vh, 28px);
  color: var(--text-secondary);
  font-size: clamp(12px, 0.85vw, 14px);
}

.link-green {
  color: var(--neon-green);
  text-decoration: none;
}

.error-alert {
  margin-top: clamp(12px, 1.5vh, 20px);
}

/* === Responsive Breakpoints === */
@media (max-width: 1024px) {
  .login-container {
    gap: clamp(16px, 3vw, 32px);
  }

  .login-brand {
    max-width: 400px;
  }
}

@media (max-width: 768px) {
  .login-page {
    padding: 16px;
  }

  .login-container {
    flex-direction: column;
    gap: 24px;
    max-width: 420px;
  }

  .login-brand {
    text-align: center;
    max-width: 100%;
    padding: 16px;
  }

  .login-brand__desc {
    max-width: 100%;
  }

  .login-brand__avatars {
    justify-content: center;
  }

  .login-brand__title {
    font-size: 32px;
  }

  .login-card {
    width: 100%;
    flex: none;
  }
}

@media (max-width: 480px) {
  .login-page {
    padding: 12px;
  }

  .login-brand__title {
    font-size: 28px;
  }

  .login-brand__desc {
    font-size: 13px;
  }

  .form-options {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
}
</style>



