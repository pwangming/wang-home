<template>
  <div class="auth-callback-page">
    <NeonCard class="auth-callback-card">
      <div class="status-mark">{{ statusMark }}</div>
      <h1 class="auth-callback-title">{{ title }}</h1>
      <p class="auth-callback-desc">{{ description }}</p>
      <NeonButton data-testid="auth-callback-go-game" type="primary" @click="router.push('/game')">
        返回游戏
      </NeonButton>
    </NeonCard>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NeonCard from '../components/ui/NeonCard.vue'
import NeonButton from '../components/ui/NeonButton.vue'

const route = useRoute()
const router = useRouter()

const hashParams = computed(() => new URLSearchParams(window.location.hash.slice(1)))
const callbackType = computed(() => hashParams.value.get('type') || route.query.type || '')
const hasSessionTokens = computed(() => !!hashParams.value.get('access_token'))

const statusMark = computed(() => (callbackType.value === 'email_change' ? 'OK' : '...'))

const title = computed(() => {
  if (callbackType.value === 'email_change') {
    return hasSessionTokens.value ? '邮箱已确认' : '邮箱确认已提交'
  }
  if (callbackType.value === 'signup') return '邮箱验证已提交'
  if (callbackType.value === 'recovery') return '正在处理重置链接'
  return '链接已处理'
})

const description = computed(() => {
  if (callbackType.value === 'email_change') {
    return '如果系统要求双重确认，请继续打开另一封确认邮件。完成后可返回游戏查看账号信息。'
  }
  if (callbackType.value === 'signup') {
    return '账号邮箱验证完成后，可以返回游戏继续使用。'
  }
  if (callbackType.value === 'recovery') {
    return '密码重置链接正在处理，请按照页面提示继续操作。'
  }
  return '你可以返回游戏继续使用。'
})
</script>

<style scoped>
.auth-callback-page {
  --page-padding: clamp(16px, 2vw, 48px);
  --card-width: clamp(320px, 28vw, 460px);
  --btn-height: clamp(44px, 5vh, 56px);

  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--page-padding);
  box-sizing: border-box;
  background: linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-end));
}

.auth-callback-card {
  width: var(--card-width);
  text-align: center;
  padding: clamp(24px, 2vw, 36px) !important;
}

.status-mark {
  width: 52px;
  height: 52px;
  margin: 0 auto 18px;
  border-radius: 50%;
  border: 1px solid var(--neon-green);
  color: var(--neon-green);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0;
}

.auth-callback-title {
  margin: 0 0 12px;
  color: var(--text-primary);
  font-size: clamp(20px, 1.6vw, 26px);
  line-height: 1.25;
}

.auth-callback-desc {
  margin: 0 0 24px;
  color: var(--text-secondary);
  font-size: clamp(13px, 0.95vw, 15px);
  line-height: 1.6;
}
</style>
