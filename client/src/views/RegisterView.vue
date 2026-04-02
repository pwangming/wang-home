<template>
  <div class="register-page">
    <!-- 顶部导航 -->
    <header class="register-nav">
      <div class="register-nav__logo">霓虹贪吃蛇</div>
      <button class="register-nav__game" @click="router.push('/game')">直接游戏</button>
    </header>

    <!-- 装饰元素 -->
    <div class="register-decor register-decor--tl" />
    <div class="register-decor register-decor--br" />
    <div class="register-float-card">
      <div class="float-card__icon">🎁</div>
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
            data-testid="register-email"
            v-model="form.email"
            placeholder="example@kinetic.com"
            :error="!!errors.email"
          >
            <template #icon>✉️</template>
          </NeonInput>
          <span v-if="errors.email" class="form-error">{{ errors.email }}</span>
        </div>

        <div class="form-field">
          <label class="form-label">用户名</label>
          <NeonInput
            data-testid="register-username"
            v-model="form.username"
            placeholder="game_player_01"
            :error="!!errors.username"
          />
          <span v-if="errors.username" class="form-error">{{ errors.username }}</span>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label class="form-label">密码</label>
            <NeonInput
              data-testid="register-password"
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              :error="!!errors.password"
            />
            <span v-if="errors.password" class="form-error">{{ errors.password }}</span>
          </div>
          <div class="form-field">
            <label class="form-label">确认密码</label>
            <NeonInput
              data-testid="register-confirm-password"
              v-model="form.confirmPassword"
              type="password"
              placeholder="请再次输入密码"
              :error="!!errors.confirmPassword"
            />
            <span v-if="errors.confirmPassword" class="form-error">{{ errors.confirmPassword }}</span>
          </div>
        </div>

        <NeonButton data-testid="register-submit" type="primary" :loading="isSubmitting" @click="handleSubmit">
          注册
        </NeonButton>

        <div v-if="errorMessage" class="form-error error-alert">
          {{ errorMessage }}
        </div>

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
const errorMessage = ref('')
const errors = reactive({
  email: '',
  username: '',
  password: '',
  confirmPassword: ''
})

const form = reactive({
  email: '',
  username: '',
  password: '',
  confirmPassword: ''
})

function validate() {
  Object.keys(errors).forEach(k => errors[k] = '')
  let valid = true

  if (!form.email) {
    errors.email = '请输入邮箱'
    valid = false
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = '请输入有效的邮箱格式'
    valid = false
  }

  if (!form.username) {
    errors.username = '请输入用户名'
    valid = false
  }

  if (!form.password) {
    errors.password = '请输入密码'
    valid = false
  } else if (form.password.length < 6) {
    errors.password = '密码至少需要 6 位'
    valid = false
  }

  if (form.password !== form.confirmPassword) {
    errors.confirmPassword = '两次输入的密码不一致'
    valid = false
  }

  return valid
}

async function handleSubmit() {
  errorMessage.value = ''
  if (!validate()) return

  isSubmitting.value = true
  try {
    const data = await authStore.register(form.email, form.password, form.username)
    if (data?.needsEmailConfirmation) {
      errorMessage.value = '请先完成邮箱验证后再登录'
      return
    }
    router.push('/game')
  } catch (err) {
    errorMessage.value = err.message || '注册失败'
  } finally {
    isSubmitting.value = false
  }
}

function handleGoogleRegister() {
  console.log('Google register not implemented')
}

</script>

<style scoped>
/* === 1920x1080 Baseline === */
.register-page {
  --page-padding: clamp(16px, 2vw, 40px);
  --card-width: clamp(360px, 35vw, 520px);
  --input-height: clamp(44px, 4vh, 56px);
  --btn-height: clamp(44px, 5vh, 56px);
  --avatar-size: clamp(32px, 2.5vw, 44px);

  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-end));
  padding: 0 var(--page-padding) var(--page-padding);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

/* 导航 */
.register-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: clamp(16px, 2vh, 28px) 0;
  width: 100%;
  max-width: 1280px;
}

.register-nav__logo {
  font-size: clamp(18px, 1.5vw, 26px);
  color: var(--text-primary);
  font-weight: bold;
}

.register-nav__game {
  height: clamp(34px, 3.5vw, 44px);
  padding: 0 clamp(14px, 1.5vw, 20px);
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  border-radius: 999px;
  color: var(--text-primary);
  font-size: clamp(12px, 0.9vw, 14px);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.register-nav__game:hover {
  border-color: var(--neon-green);
  box-shadow: 0 0 12px var(--neon-green-glow);
}

/* 装饰 */
.register-decor {
  position: absolute;
  border-radius: 50%;
  filter: blur(clamp(80px, 6vw, 120px));
  opacity: 0.4;
  pointer-events: none;
}

.register-decor--tl {
  width: clamp(280px, 20vw, 400px);
  height: clamp(280px, 20vw, 400px);
  background: rgba(74, 222, 128, 0.3);
  top: clamp(-100px, -8vh, -150px);
  left: clamp(-80px, -6vw, -150px);
}

.register-decor--br {
  width: clamp(350px, 30vw, 550px);
  height: clamp(350px, 30vw, 550px);
  background: rgba(64, 158, 255, 0.3);
  bottom: clamp(-150px, -12vh, -250px);
  right: clamp(-80px, -6vw, -150px);
}

.register-float-card {
  position: absolute;
  bottom: calc(clamp(80px, 10vh, 140px) + clamp(62px, 8vh, 100px));
  left: clamp(40px, 5vw, 100px);
  top: auto;
  right: auto;
  width: clamp(160px, 12vw, 200px);
  padding: clamp(14px, 1.5vw, 20px);
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  backdrop-filter: blur(10px);
}

.float-card__icon {
  font-size: clamp(18px, 1.5vw, 24px);
  margin-bottom: clamp(4px, 0.8vh, 10px);
}

.float-card__title {
  color: var(--neon-green);
  font-weight: bold;
  font-size: clamp(12px, 1vw, 14px);
  margin-bottom: clamp(2px, 0.5vh, 6px);
}

.float-card__desc {
  color: var(--text-secondary);
  font-size: clamp(10px, 0.8vw, 12px);
  line-height: 1.4;
}

.register-players {
  position: absolute;
  bottom: clamp(80px, 10vh, 140px);
  left: clamp(40px, 5vw, 100px);
  display: flex;
  align-items: center;
  gap: clamp(4px, 0.5vw, 8px);
}

.player-avatar {
  width: var(--avatar-size);
  height: var(--avatar-size);
  border-radius: 50%;
  border: 2px solid var(--bg-gradient-start);
  margin-left: calc(-1 * clamp(8px, 0.8vw, 12px));
}

.player-avatar:first-child {
  margin-left: 0;
}

.players-text {
  color: var(--text-secondary);
  font-size: clamp(10px, 0.8vw, 12px);
  margin-left: clamp(6px, 0.8vw, 12px);
}

/* 卡片 */
.register-card {
  width: var(--card-width);
  margin: clamp(20px, 4vh, 50px) auto 0;
  padding: clamp(24px, 2.5vw, 36px) !important;
}

.register-header {
  margin-bottom: clamp(20px, 2.5vh, 36px);
}

.register-title {
  font-size: clamp(20px, 1.8vw, 28px);
  color: var(--text-primary);
  margin: 0 0 clamp(6px, 0.8vh, 12px);
}

.register-subtitle {
  color: var(--text-secondary);
  font-size: clamp(12px, 0.9vw, 14px);
  margin: 0;
  line-height: 1.4;
}

/* 表单 */
.register-form {
  display: flex;
  flex-direction: column;
  gap: clamp(12px, 1.5vh, 20px);
  width: 100%;
}

.form-field {
  flex: 1;
  min-width: 0;
}

.form-field :deep(.neon-input) {
  width: 100%;
  max-width: 100%;
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

.form-row {
  display: flex;
  gap: clamp(10px, 1.5vw, 20px);
  width: 100%;
}

.form-row > .form-field {
  min-width: 0;
}

.code-input-row {
  display: flex;
  gap: clamp(8px, 1vw, 14px);
}

.code-btn {
  flex: 0 0 clamp(100px, 10vw, 130px);
  height: var(--input-height) !important;
  font-size: clamp(11px, 0.85vw, 13px) !important;
}

.register-divider {
  display: flex;
  align-items: center;
  margin: clamp(8px, 1.2vh, 16px) 0;
  color: var(--text-disabled);
  font-size: clamp(12px, 0.85vw, 14px);
}

.register-divider::before,
.register-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--card-border);
}

.register-divider span {
  padding: 0 clamp(8px, 1vw, 16px);
}

.register-footer {
  text-align: center;
  margin-top: clamp(16px, 2vh, 28px);
  color: var(--text-secondary);
  font-size: clamp(12px, 0.85vw, 14px);
}

.link-green {
  color: var(--neon-green);
  text-decoration: none;
}

/* === Responsive Breakpoints === */
@media (max-width: 1024px) {
  .register-float-card {
    display: none;
  }

  .register-players {
    display: none;
  }
}

@media (max-width: 768px) {
  .register-page {
    padding: 0 16px 24px;
  }

  .register-nav {
    padding: 16px 0;
  }

  .register-card {
    width: 100%;
    max-width: 480px;
    margin: 16px auto 0;
    padding: 20px !important;
  }

  .form-row {
    flex-direction: column;
    gap: 12px;
  }

  .code-input-row {
    flex-direction: column;
  }

  .code-btn {
    width: 100%;
    flex: none;
  }
}

@media (max-width: 480px) {
  .register-page {
    padding: 0 12px 16px;
  }

  .register-nav {
    padding: 12px 0;
  }

  .register-nav__logo {
    font-size: 18px;
  }

  .register-card {
    padding: 16px !important;
  }

  .register-title {
    font-size: 20px;
  }
}
</style>



