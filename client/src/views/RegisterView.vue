<template>
  <div class="register-container">
    <n-card title="注册" class="register-card">
      <n-form ref="formRef" :model="form" :rules="rules">
        <n-form-item path="email" label="邮箱">
          <n-input v-model:value="form.email" placeholder="请输入邮箱" />
        </n-form-item>
        <n-form-item path="password" label="密码">
          <n-input
            v-model:value="form.password"
            type="password"
            placeholder="请输入密码"
            show-password-on="mousedown"
          />
        </n-form-item>
        <n-form-item path="username" label="用户名">
          <n-input v-model:value="form.username" placeholder="请输入用户名" />
        </n-form-item>
        <n-form-item>
          <n-button type="primary" block :loading="isSubmitting" @click="handleSubmit">
            注册
          </n-button>
        </n-form-item>
      </n-form>
      <div class="register-footer">
        <span>已有账号？</span>
        <router-link to="/login">立即登录</router-link>
      </div>
      <n-alert v-if="errorMessage" type="error" class="error-alert">
        {{ errorMessage }}
      </n-alert>
      <n-result
        v-if="needsConfirmation"
        status="info"
        title="注册成功"
        description="请查收邮箱中的确认链接完成注册"
        class="confirmation-result"
      />
    </n-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { NCard, NForm, NFormItem, NInput, NButton, NAlert, NResult } from 'naive-ui'
import { authStore } from '../stores/auth.js'

const router = useRouter()

const formRef = ref(null)
const isSubmitting = ref(false)
const errorMessage = ref('')
const needsConfirmation = ref(false)

const form = ref({
  email: '',
  password: '',
  username: ''
})

const rules = {
  email: { required: true, message: '请输入邮箱', trigger: 'blur' },
  password: { required: true, message: '请输入密码', trigger: 'blur' },
  username: { required: true, message: '请输入用户名', trigger: 'blur' }
}

async function handleSubmit() {
  errorMessage.value = ''
  needsConfirmation.value = false
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  isSubmitting.value = true
  try {
    const result = await authStore.register(form.value.email, form.value.password, form.value.username)
    if (result.needsEmailConfirmation) {
      needsConfirmation.value = true
    } else {
      router.push('/game')
    }
  } catch (err) {
    errorMessage.value = err.message || '注册失败'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.register-card {
  width: 100%;
  max-width: 400px;
}

.register-footer {
  margin-top: 16px;
  text-align: center;
  color: #909399;
}

.register-footer a {
  color: #409eff;
  text-decoration: none;
  margin-left: 4px;
}

.error-alert {
  margin-top: 16px;
}

.confirmation-result {
  margin-top: 16px;
}
</style>
