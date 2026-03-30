<template>
  <div class="login-container">
    <n-card title="登录" class="login-card">
      <n-form ref="formRef" :model="form" :rules="rules">
        <n-form-item path="email" label="邮箱">
          <n-input v-model:value="form.email" placeholder="请输入邮箱" />
        </n-form-item>
        <n-form-item path="password" label="密码">
          <n-input v-model:value="form.password" type="password" placeholder="请输入密码" show-password-on="mousedown" />
        </n-form-item>
        <n-form-item>
          <n-button type="primary" block :loading="isSubmitting" @click="handleSubmit">
            登录
          </n-button>
        </n-form-item>
      </n-form>
      <div class="login-footer">
        <span>还没有账号？</span>
        <router-link to="/register">立即注册</router-link>
      </div>
      <n-alert v-if="errorMessage" type="error" class="error-alert">
        {{ errorMessage }}
      </n-alert>
    </n-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { NCard, NForm, NFormItem, NInput, NButton, NAlert } from 'naive-ui'
import { authStore } from '../stores/auth.js'

const router = useRouter()

const formRef = ref(null)
const isSubmitting = ref(false)
const errorMessage = ref('')

const form = ref({
  email: '',
  password: ''
})

const rules = {
  email: { required: true, message: '请输入邮箱', trigger: 'blur' },
  password: { required: true, message: '请输入密码', trigger: 'blur' }
}

async function handleSubmit() {
  errorMessage.value = ''
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  isSubmitting.value = true
  try {
    await authStore.login(form.value.email, form.value.password)
    router.push('/game')
  } catch (err) {
    errorMessage.value = err.message || '登录失败'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.login-card {
  width: 100%;
  max-width: 400px;
}

.login-footer {
  margin-top: 16px;
  text-align: center;
  color: #909399;
}

.login-footer a {
  color: #409eff;
  text-decoration: none;
  margin-left: 4px;
}

.error-alert {
  margin-top: 16px;
}
</style>
