# Kinetic Arcade 前端重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Kinetic Arcade 前端重构为匹配 Figma 设计的霓虹风格，包括登录页、注册页、游戏页和排行榜弹窗

**Architecture:** 采用增量替换策略，逐个页面重构。在重构过程中保留现有游戏逻辑和 API 交互，仅更新 UI 视图层。创建共享的霓虹风格基础组件供各页面复用。

**Tech Stack:** Vue 3 + Composition API + Naive UI (暗色主题) + Pinia + Vue Router + Vite

---

## 文件结构

```
client/src/
├── views/
│   ├── LoginView.vue          # 重构: 左右分栏布局
│   ├── RegisterView.vue       # 重构: 居中卡片布局
│   └── GameView.vue           # 重构: 游戏区+侧边栏布局
├── components/
│   ├── game/
│   │   ├── SnakeGame.vue      # 保留现有逻辑
│   │   ├── GameSidebar.vue    # 重构: 侧边栏组件
│   │   └── LeaderboardModal.vue # 重构: 排行榜弹窗
│   └── ui/                    # 新建: 共享UI组件
│       ├── NeonCard.vue
│       ├── NeonButton.vue
│       ├── NeonInput.vue
│       └── NeonCheckbox.vue
└── assets/
    └── styles/
        └── neon-theme.css     # 新建: 霓虹主题CSS变量
```

---

## Task 1: 创建霓虹主题基础样式

**Files:**
- Create: `client/src/assets/styles/neon-theme.css`

- [ ] **Step 1: 创建霓虹主题 CSS 变量文件**

```css
/* Neon Theme Variables */
:root {
  /* Background */
  --bg-gradient-start: #1a1a2e;
  --bg-gradient-end: #16213e;

  /* Accent Colors */
  --neon-green: #4ade80;
  --neon-blue: #409eff;
  --neon-green-glow: rgba(74, 222, 128, 0.5);
  --neon-blue-glow: rgba(64, 158, 255, 0.5);

  /* Card */
  --card-bg: rgba(26, 26, 46, 0.9);
  --card-border: #2a2a4e;
  --card-radius: 16px;

  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #909399;
  --text-disabled: #666666;

  /* Button */
  --btn-radius: 8px;
  --btn-height: 56px;
  --btn-height-sm: 48px;

  /* Input */
  --input-bg: #2a2a3e;
  --input-radius: 8px;
  --input-height: 56px;
}

/* Global Neon Styles */
.neon-body {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-end));
}

.neon-text-green {
  color: var(--neon-green);
  text-shadow: 0 0 10px var(--neon-green-glow);
}

.neon-text-heading {
  color: var(--text-primary);
  font-weight: bold;
}
```

- [ ] **Step 2: 提交**

```bash
git add client/src/assets/styles/neon-theme.css
git commit -m "feat(client): add neon theme CSS variables"
```

---

## Task 2: 创建共享霓虹 UI 组件

**Files:**
- Create: `client/src/components/ui/NeonCard.vue`
- Create: `client/src/components/ui/NeonButton.vue`
- Create: `client/src/components/ui/NeonInput.vue`
- Create: `client/src/components/ui/NeonCheckbox.vue`

- [ ] **Step 1: 创建 NeonCard 组件**

```vue
<template>
  <div class="neon-card" :class="{ 'neon-card--glow': glow }">
    <slot />
  </div>
</template>

<script setup>
defineProps({
  glow: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.neon-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  padding: 32px;
}

.neon-card--glow {
  box-shadow: 0 0 30px var(--neon-green-glow);
}
</style>
```

- [ ] **Step 2: 创建 NeonButton 组件**

```vue
<template>
  <button
    class="neon-btn"
    :class="[`neon-btn--${type}`, { 'neon-btn--loading': loading }]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="neon-btn__loader" />
    <slot />
  </button>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'primary',
    validator: v => ['primary', 'default', 'success'].includes(v)
  },
  loading: Boolean,
  disabled: Boolean
})
defineEmits(['click'])
</script>

<style scoped>
.neon-btn {
  width: 100%;
  height: var(--btn-height);
  border: none;
  border-radius: var(--btn-radius);
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.neon-btn--primary {
  background: var(--neon-green);
  color: #000;
}

.neon-btn--primary:hover {
  box-shadow: 0 0 20px var(--neon-green-glow);
}

.neon-btn--default {
  background: var(--input-bg);
  color: var(--text-primary);
  border: 1px solid var(--card-border);
}

.neon-btn--success {
  background: var(--neon-green);
  color: #000;
}

.neon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.neon-btn__loader {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
```

- [ ] **Step 3: 创建 NeonInput 组件**

```vue
<template>
  <div class="neon-input" :class="{ 'neon-input--error': error }">
    <span v-if="$slots.icon" class="neon-input__icon">
      <slot name="icon" />
    </span>
    <input
      v-model="internalValue"
      :type="type"
      :placeholder="placeholder"
      class="neon-input__field"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <button
      v-if="type === 'password' && showPasswordToggle"
      type="button"
      class="neon-input__toggle"
      @click="togglePassword"
    >
      {{ showPassword ? '🙈' : '👁️' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: String,
  type: { type: String, default: 'text' },
  placeholder: String,
  error: Boolean,
  showPasswordToggle: Boolean
})

const emit = defineEmits(['update:modelValue'])

const internalValue = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const showPassword = ref(false)

const actualType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type
})

function togglePassword() {
  showPassword.value = !showPassword.value
}
</script>

<style scoped>
.neon-input {
  display: flex;
  align-items: center;
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--input-radius);
  height: var(--input-height);
  padding: 0 48px;
  position: relative;
}

.neon-input--error {
  border-color: #f56c6c;
}

.neon-input__icon {
  position: absolute;
  left: 16px;
  color: var(--text-secondary);
}

.neon-input__field {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 16px;
}

.neon-input__field::placeholder {
  color: var(--text-disabled);
}

.neon-input__toggle {
  position: absolute;
  right: 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
}
</style>
```

- [ ] **Step 4: 创建 NeonCheckbox 组件**

```vue
<template>
  <label class="neon-checkbox">
    <input
      type="checkbox"
      :checked="modelValue"
      class="neon-checkbox__input"
      @change="$emit('update:modelValue', $event.target.checked)"
    />
    <span class="neon-checkbox__box">
      <svg v-if="modelValue" viewBox="0 0 16 16" class="neon-checkbox__check">
        <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" fill="currentColor"/>
      </svg>
    </span>
    <span class="neon-checkbox__label"><slot /></span>
  </label>
</template>

<script setup>
defineProps({
  modelValue: Boolean
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.neon-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
}

.neon-checkbox__input {
  display: none;
}

.neon-checkbox__box {
  width: 20px;
  height: 20px;
  border: 1px solid var(--card-border);
  border-radius: 4px;
  background: var(--input-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.neon-checkbox__input:checked + .neon-checkbox__box {
  background: var(--neon-green);
  border-color: var(--neon-green);
  color: #000;
}

.neon-checkbox__check {
  width: 12px;
  height: 12px;
}
</style>
```

- [ ] **Step 5: 提交**

```bash
git add client/src/components/ui/NeonCard.vue client/src/components/ui/NeonButton.vue client/src/components/ui/NeonInput.vue client/src/components/ui/NeonCheckbox.vue
git commit -m "feat(client): add neon UI component library"
```

---

## Task 3: 重构登录页 (LoginView)

**Files:**
- Modify: `client/src/views/LoginView.vue`

- [ ] **Step 1: 编写登录页视觉测试**

```vue
<!-- 在现有 LoginView.vue 末尾添加测试用 debug 元素 -->
<template>
  <div class="login-debug" style="display:none">
    <!-- 测试用: 验证布局结构 -->
    <div data-testid="login-left-brand" />
    <div data-testid="login-right-card" />
    <div data-testid="login-form" />
  </div>
</template>
```

- [ ] **Step 2: 编写完整的登录页实现**

```vue
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

        <n-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleSubmit">
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
import NeonCard from '../components/ui/NeonCard.vue'
import NeonButton from '../components/ui/NeonButton.vue'
import NeonInput from '../components/ui/NeonInput.vue'
import NeonCheckbox from '../components/ui/NeonCheckbox.vue'
import { authStore } from '../stores/auth.js'

const router = useRouter()

const formRef = ref(null)
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

const rules = {
  email: { required: true, message: '请输入邮箱', trigger: 'blur' },
  password: { required: true, message: '请输入密码', trigger: 'blur' }
}

function validate() {
  errors.email = ''
  errors.password = ''

  if (!form.email) {
    errors.email = '请输入邮箱'
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
    await authStore.login(form.email, form.password)
    router.push('/game')
  } catch (err) {
    errorMessage.value = err.message || '登录失败'
  } finally {
    isSubmitting.value = false
  }
}

function handleGoogleLogin() {
  // TODO: Implement Google OAuth
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
  background: rgba(74, 222, 128, 0.2);
  top: -256px;
  left: -256px;
}

.login-decor--br {
  width: 384px;
  height: 307px;
  background: rgba(64, 158, 255, 0.2);
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
  color: #f56c6c;
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
```

- [ ] **Step 3: 运行开发服务器验证**

```bash
cd client && npm run dev
# 访问 http://localhost:3000/login 验证视觉效果
```

- [ ] **Step 4: 提交**

```bash
git add client/src/views/LoginView.vue
git commit -m "feat(client): refactor LoginView with neon design"
```

---

## Task 4: 重构注册页 (RegisterView)

**Files:**
- Modify: `client/src/views/RegisterView.vue`

- [ ] **Step 1: 编写完整的注册页实现**

```vue
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
  color: #f56c6c;
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
```

- [ ] **Step 2: 提交**

```bash
git add client/src/views/RegisterView.vue
git commit -m "feat(client): refactor RegisterView with neon design"
```

---

## Task 5: 重构游戏侧边栏 (GameSidebar)

**Files:**
- Modify: `client/src/components/game/GameSidebar.vue`

- [ ] **Step 1: 编写完整的侧边栏实现**

```vue
<template>
  <div class="game-sidebar">
    <!-- 得分展示 -->
    <div class="score-section">
      <div class="score-label">当前得分</div>
      <div class="score-value">{{ score.toLocaleString() }}</div>

      <div class="score-divider" />

      <div class="score-info-row">
        <span class="score-info-label">速度倍数</span>
        <span class="score-info-value">{{ speedMultiplier }}x</span>
      </div>
      <div class="score-info-row">
        <span class="score-info-label">得分倍数</span>
        <span class="score-info-value">{{ scoreMultiplier }}x</span>
      </div>
    </div>

    <!-- 排行榜入口 -->
    <button class="leaderboard-btn" @click="$emit('open-leaderboard')">
      <div class="leaderboard-btn__content">
        <span class="leaderboard-btn__icon">🏆</span>
        <span>查看排行榜</span>
      </div>
      <span class="leaderboard-btn__arrow">›</span>
    </button>

    <!-- 速度/得分倍数 Bento 网格 -->
    <div class="bento-grid">
      <div class="bento-card">
        <div class="bento-card__icon">⚡</div>
        <div class="bento-card__label">速度倍数</div>
        <div class="bento-card__value">{{ speedMultiplier }}x</div>
      </div>
      <div class="bento-card">
        <div class="bento-card__icon">💰</div>
        <div class="bento-card__label">得分倍数</div>
        <div class="bento-card__value">{{ scoreMultiplier }}x</div>
      </div>
    </div>

    <!-- 玩家成就预览 -->
    <div class="achievement-preview">
      <div class="achievement-icon">🎖️</div>
      <div class="achievement-info">
        <div class="achievement-label">最近成就</div>
        <div class="achievement-name">{{ latestAchievement }}</div>
      </div>
    </div>

    <!-- 键盘控制 -->
    <div class="controls-section">
      <div class="controls-label">键盘控制</div>
      <div class="direction-keys">
        <div class="key-row">
          <button class="key">↑</button>
        </div>
        <div class="key-row">
          <button class="key">←</button>
          <button class="key">↓</button>
          <button class="key">→</button>
        </div>
      </div>
      <button class="pause-key">空格 暂停</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  score: {
    type: Number,
    default: 0
  },
  speedMultiplier: {
    type: Number,
    default: 1.0
  },
  scoreMultiplier: {
    type: Number,
    default: 1.0
  }
})

defineEmits(['open-leaderboard'])

const latestAchievement = computed(() => {
  // TODO: 从成就系统获取
  return '初露锋芒'
})
</script>

<style scoped>
.game-sidebar {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 得分区域 */
.score-section {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  padding: 24px;
}

.score-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.score-value {
  font-size: 48px;
  font-weight: bold;
  color: var(--neon-green);
  text-shadow: 0 0 20px var(--neon-green-glow);
  margin-bottom: 16px;
}

.score-divider {
  height: 1px;
  background: var(--card-border);
  margin: 16px 0;
}

.score-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.score-info-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.score-info-value {
  font-size: 16px;
  color: var(--text-primary);
  font-weight: bold;
}

/* 排行榜按钮 */
.leaderboard-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  cursor: pointer;
  transition: all 0.2s;
}

.leaderboard-btn:hover {
  border-color: var(--neon-green);
  box-shadow: 0 0 10px var(--neon-green-glow);
}

.leaderboard-btn__content {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-primary);
}

.leaderboard-btn__icon {
  font-size: 20px;
}

.leaderboard-btn__arrow {
  font-size: 20px;
  color: var(--text-secondary);
}

/* Bento 网格 */
.bento-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.bento-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  padding: 16px;
}

.bento-card__icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.bento-card__label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.bento-card__value {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-primary);
}

/* 成就预览 */
.achievement-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
}

.achievement-icon {
  font-size: 24px;
}

.achievement-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.achievement-name {
  font-size: 16px;
  color: var(--text-primary);
}

/* 控制区域 */
.controls-section {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  padding: 16px;
}

.controls-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.direction-keys {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.key-row {
  display: flex;
  gap: 8px;
}

.key {
  width: 48px;
  height: 48px;
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 20px;
  cursor: pointer;
  transition: all 0.1s;
}

.key:active {
  background: var(--neon-green);
  color: #000;
}

.pause-key {
  width: 100%;
  padding: 12px;
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 14px;
}
</style>
```

- [ ] **Step 2: 提交**

```bash
git add client/src/components/game/GameSidebar.vue
git commit -m "feat(client): refactor GameSidebar with neon design"
```

---

## Task 6: 重构游戏页 (GameView)

**Files:**
- Modify: `client/src/views/GameView.vue`

- [ ] **Step 1: 更新 GameView 布局**

```vue
<template>
  <div class="game-page">
    <!-- 顶部导航 -->
    <header class="game-topbar">
      <div class="game-topbar__logo">霓虹贪吃蛇</div>
      <div class="game-topbar__actions">
        <button class="topbar-btn">🔊</button>
        <button class="topbar-btn">⚙️</button>
        <div class="topbar-avatar">
          <img v-if="authStore.user?.avatar" :src="authStore.user.avatar" alt="" />
          <span v-else>👤</span>
        </div>
      </div>
    </header>

    <div class="game-main">
      <!-- 左侧游戏区 -->
      <div class="game-board-section">
        <div class="game-board-wrapper">
          <div class="game-board">
            <!-- 预游戏状态 -->
            <div v-if="!isPlaying" class="game-overlay">
              <div class="game-start-card">
                <div class="welcome-section">
                  <h2>霓虹贪吃蛇</h2>
                  <p v-if="!authStore.user">您当前未登录，游玩成绩不会计入排行榜</p>
                </div>

                <div class="speed-selection">
                  <div class="selection-label">选择速度倍数</div>
                  <div class="speed-buttons">
                    <button
                      v-for="speed in speedOptions"
                      :key="speed.value"
                      class="speed-btn"
                      :class="{ active: selectedSpeed === speed.value }"
                      @click="selectedSpeed = speed.value"
                    >
                      {{ speed.label }}
                    </button>
                  </div>
                  <div class="score-hint">
                    得分倍数: {{ currentScoreMultiplier }}x
                  </div>
                </div>

                <button class="start-btn" @click="startGame">
                  <span class="start-btn__icon">▶</span>
                  开始游戏
                </button>
              </div>
            </div>

            <!-- 游戏画布 -->
            <SnakeGame
              v-else
              ref="snakeGameRef"
              :speed-multiplier="selectedSpeed"
              :score-multiplier="currentScoreMultiplier"
              @game-over="handleGameOver"
            />
          </div>
        </div>
      </div>

      <!-- 右侧侧边栏 -->
      <GameSidebar
        :score="currentScore"
        :speed-multiplier="selectedSpeed"
        :score-multiplier="currentScoreMultiplier"
        @open-leaderboard="showLeaderboard = true"
      />
    </div>

    <!-- 分数提交反馈 -->
    <div v-if="submitStatus" class="submit-feedback" :class="submitStatus">
      {{ submitMessage }}
    </div>

    <!-- 排行榜弹窗 -->
    <LeaderboardModal v-model:show="showLeaderboard" />

    <!-- 游客警告弹窗 -->
    <n-modal v-model:show="showGuestWarning" :mask-closable="false" preset="card" title="提示" style="max-width: 400px;">
      <div class="guest-warning-content">
        <p>您当前未登录，游玩成绩不会计入排行榜和个人最高分</p>
        <p>登录后即可保存成绩并参与排行榜竞争</p>
      </div>
      <template #footer>
        <div class="guest-warning-actions">
          <n-button @click="goToLogin">登录/注册</n-button>
          <n-button type="primary" @click="continueAsGuest">继续游戏</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NModal, useMessage } from 'naive-ui'
import SnakeGame from '../components/game/SnakeGame.vue'
import GameSidebar from '../components/game/GameSidebar.vue'
import LeaderboardModal from '../components/game/LeaderboardModal.vue'
import { authStore } from '../stores/auth.js'
import { api } from '../lib/api.js'

const router = useRouter()
const message = useMessage()

const isPlaying = ref(false)
const currentScore = ref(0)
const selectedSpeed = ref(1.0)
const snakeGameRef = ref(null)
const showLeaderboard = ref(false)
const showGuestWarning = ref(false)
const hasSeenGuestWarning = ref(false)
const submitStatus = ref('')
const submitMessage = ref('')

const speedOptions = [
  { value: 1.0, label: '1.0x', scoreMult: 1.0 },
  { value: 1.2, label: '1.2x', scoreMult: 1.5 },
  { value: 1.5, label: '1.5x', scoreMult: 2.0 },
  { value: 2.0, label: '2.0x', scoreMult: 3.0 }
]

const currentScoreMultiplier = computed(() => {
  const option = speedOptions.find(o => o.value === selectedSpeed.value)
  return option?.scoreMult || 1.0
})

function checkGuestWarning() {
  if (!authStore.user && !hasSeenGuestWarning.value) {
    const seen = localStorage.getItem('guestWarningSeen')
    if (!seen) {
      showGuestWarning.value = true
    }
  }
}

function markGuestWarningSeen() {
  hasSeenGuestWarning.value = true
  localStorage.setItem('guestWarningSeen', 'true')
}

function continueAsGuest() {
  showGuestWarning.value = false
  markGuestWarningSeen()
}

function goToLogin() {
  showGuestWarning.value = false
  markGuestWarningSeen()
  router.push('/login')
}

async function startGame() {
  if (authStore.user) {
    try {
      await api.leaderboard.startSession(selectedSpeed.value)
    } catch (err) {
      console.warn('Failed to start session:', err)
    }
  }
  isPlaying.value = true
  currentScore.value = 0
  setTimeout(() => {
    snakeGameRef.value?.startGame()
  }, 100)
}

async function handleGameOver(finalScore, speedMult, scoreMult) {
  isPlaying.value = false
  currentScore.value = finalScore

  if (!authStore.user) {
    message.warning('成绩未记录')
    return
  }

  submitStatus.value = 'submitting'
  submitMessage.value = '分数提交中...'

  try {
    await api.leaderboard.submitScore(null, finalScore, speedMult, scoreMult, new Date().toISOString(), null)
    submitStatus.value = 'success'
    submitMessage.value = '分数提交成功'
  } catch (err) {
    submitStatus.value = 'error'
    submitMessage.value = '分数提交失败'
  }

  setTimeout(() => {
    submitStatus.value = ''
  }, 3000)
}

onMounted(async () => {
  await authStore.init()
  checkGuestWarning()
})
</script>

<style scoped>
.game-page {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-end));
}

/* 顶部导航 */
.game-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(26, 26, 46, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--card-border);
}

.game-topbar__logo {
  font-size: 20px;
  color: var(--neon-green);
  font-weight: bold;
  text-shadow: 0 0 10px var(--neon-green-glow);
}

.game-topbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar-btn {
  width: 36px;
  height: 36px;
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.topbar-avatar {
  width: 40px;
  height: 40px;
  background: var(--input-bg);
  border: 2px solid var(--neon-green);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 20px;
}

/* 主内容区 */
.game-main {
  display: flex;
  gap: 24px;
  padding: 24px;
  justify-content: center;
}

/* 游戏区 */
.game-board-section {
  flex: 0 0 816px;
}

.game-board-wrapper {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.1), rgba(64, 158, 255, 0.1));
  border-radius: var(--card-radius);
  padding: 32px;
  border: 1px solid var(--card-border);
}

.game-board {
  position: relative;
  width: 752px;
  height: 752px;
  margin: 0 auto;
}

/* 预游戏覆盖层 */
.game-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(26, 26, 46, 0.95);
  border-radius: var(--card-radius);
}

.game-start-card {
  text-align: center;
  padding: 40px;
}

.welcome-section h2 {
  font-size: 32px;
  color: var(--neon-green);
  margin: 0 0 8px;
  text-shadow: 0 0 20px var(--neon-green-glow);
}

.welcome-section p {
  color: var(--text-secondary);
  margin: 0 0 24px;
}

.speed-selection {
  margin-bottom: 24px;
}

.selection-label {
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.speed-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 12px;
}

.speed-btn {
  padding: 12px 24px;
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.speed-btn.active,
.speed-btn:hover {
  background: var(--neon-green);
  color: #000;
  border-color: var(--neon-green);
}

.score-hint {
  color: var(--neon-green);
  font-size: 14px;
}

.start-btn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 16px 48px;
  background: var(--neon-green);
  border: none;
  border-radius: 8px;
  color: #000;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.start-btn:hover {
  box-shadow: 0 0 30px var(--neon-green-glow);
}

.start-btn__icon {
  font-size: 20px;
}

/* 反馈消息 */
.submit-feedback {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: bold;
}

.submit-feedback.submitting {
  background: rgba(64, 158, 255, 0.9);
  color: #fff;
}

.submit-feedback.success {
  background: rgba(74, 222, 128, 0.9);
  color: #fff;
}

.submit-feedback.error {
  background: rgba(245, 108, 108, 0.9);
  color: #fff;
}

.guest-warning-content p {
  margin: 8px 0;
  color: var(--text-secondary);
}

.guest-warning-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
```

- [ ] **Step 2: 提交**

```bash
git add client/src/views/GameView.vue
git commit -m "feat(client): refactor GameView with neon design"
```

---

## Task 7: 重构排行榜弹窗 (LeaderboardModal)

**Files:**
- Modify: `client/src/components/game/LeaderboardModal.vue`

- [ ] **Step 1: 编写完整的排行榜弹窗实现**

```vue
<template>
  <n-modal
    :show="show"
    @update:show="$emit('update:show', $event)"
    :mask-closable="true"
    preset="card"
    class="leaderboard-modal"
    :style="{ width: '672px' }"
  >
    <template #header>
      <div class="modal-header">
        <h2 class="modal-title">排行榜</h2>
        <button class="close-btn" @click="$emit('update:show', false)">✕</button>
      </div>
    </template>

    <div class="leaderboard-content">
      <!-- Tab 切换 -->
      <div class="tabs">
        <button
          class="tab"
          :class="{ active: activeTab === 'all' }"
          @click="activeTab = 'all'"
        >
          全部
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'mine' }"
          @click="activeTab = 'mine'"
        >
          我的排名
        </button>
      </div>

      <!-- 表格 -->
      <div class="leaderboard-table">
        <!-- 表头 -->
        <div class="table-header">
          <div class="col-rank">排名</div>
          <div class="col-player">玩家</div>
          <div class="col-score">分数</div>
          <div class="col-time">用时</div>
        </div>

        <!-- 排名列表 -->
        <div class="table-body">
          <div
            v-for="(entry, index) in displayEntries"
            :key="entry.id"
            class="table-row"
            :class="[`rank-${entry.rank}`, { highlight: entry.isMine }]"
          >
            <div class="col-rank">
              <span v-if="entry.rank === 1" class="rank-icon">👑</span>
              <span v-else-if="entry.rank === 2" class="rank-icon">🥈</span>
              <span v-else-if="entry.rank === 3" class="rank-icon">🥉</span>
              <span v-else class="rank-num">{{ entry.rank }}</span>
            </div>
            <div class="col-player">
              <img v-if="entry.avatar" :src="entry.avatar" class="player-avatar" />
              <span class="player-name">{{ entry.name }}</span>
            </div>
            <div class="col-score">{{ entry.score.toLocaleString() }}</div>
            <div class="col-time">{{ formatTime(entry.duration) }}</div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="modal-footer">
        <NeonButton type="default" @click="$emit('update:show', false)">
          收起
        </NeonButton>
      </div>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { NModal } from 'naive-ui'
import NeonButton from '../components/ui/NeonButton.vue'
import { api } from '../../lib/api.js'

const props = defineProps({
  show: Boolean
})

defineEmits(['update:show'])

const activeTab = ref('all')
const entries = ref([])
const myRank = ref(null)

const displayEntries = computed(() => {
  if (activeTab.value === 'mine' && myRank.value) {
    return [myRank.value]
  }
  return entries.value
})

function formatTime(seconds) {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

async function fetchLeaderboard() {
  try {
    const data = await api.leaderboard.getLeaderboard()
    entries.value = data.entries || []
    myRank.value = data.myRank || null
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err)
  }
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    fetchLeaderboard()
  }
})
</script>

<style scoped>
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 20px;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-secondary);
  cursor: pointer;
}

.leaderboard-content {
  padding: 16px 0;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.tab {
  padding: 8px 24px;
  background: none;
  border: 1px solid var(--card-border);
  border-radius: 20px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.tab.active {
  background: var(--neon-green);
  color: #000;
  border-color: var(--neon-green);
}

/* Table */
.leaderboard-table {
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  overflow: hidden;
}

.table-header {
  display: flex;
  padding: 12px 24px;
  background: var(--input-bg);
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.table-row {
  display: flex;
  padding: 16px 24px;
  border-top: 1px solid var(--card-border);
  align-items: center;
}

.table-row.highlight {
  background: rgba(74, 222, 128, 0.1);
}

.rank-1 {
  background: rgba(255, 215, 0, 0.1);
}

.rank-2 {
  background: rgba(192, 192, 192, 0.1);
}

.rank-3 {
  background: rgba(205, 127, 50, 0.1);
}

.col-rank {
  width: 60px;
  font-weight: bold;
}

.col-player {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.col-score {
  width: 120px;
  text-align: right;
  font-weight: bold;
  color: var(--neon-green);
}

.col-time {
  width: 80px;
  text-align: right;
  color: var(--text-secondary);
}

.rank-icon {
  font-size: 20px;
}

.rank-num {
  color: var(--text-secondary);
}

.player-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.player-name {
  color: var(--text-primary);
}

.modal-footer {
  display: flex;
  justify-content: center;
}
</style>
```

- [ ] **Step 2: 提交**

```bash
git add client/src/components/game/LeaderboardModal.vue
git commit -m "feat(client): refactor LeaderboardModal with neon design"
```

---

## Task 8: 集成测试与验证

**Files:**
- Modify: `client/src/App.vue` (如需要)

- [ ] **Step 1: 启动开发服务器进行全面验证**

```bash
cd client && npm run dev
# 验证以下页面:
# 1. http://localhost:3000/login - 登录页霓虹风格
# 2. http://localhost:3000/register - 注册页霓虹风格
# 3. http://localhost:3000/game - 游戏页霓虹风格
```

- [ ] **Step 2: 运行客户端测试**

```bash
cd client && npm test
```

- [ ] **Step 3: 最终提交**

```bash
git add -A
git commit -m "feat(client): complete neon design refactor for all pages"
```

---

## 实施检查清单

- [ ] Task 1: 霓虹主题 CSS 变量
- [ ] Task 2: 共享 UI 组件 (NeonCard, NeonButton, NeonInput, NeonCheckbox)
- [ ] Task 3: 登录页重构
- [ ] Task 4: 注册页重构
- [ ] Task 5: 游戏侧边栏重构
- [ ] Task 6: 游戏页重构
- [ ] Task 7: 排行榜弹窗重构
- [ ] Task 8: 集成测试与验证
