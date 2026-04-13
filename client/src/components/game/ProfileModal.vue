<template>
  <n-modal
    :show="show"
    preset="card"
    title="修改用户名"
    style="max-width: 420px;"
    :mask-closable="false"
    @update:show="onClose"
  >
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

    <template #footer>
      <div class="modal-footer">
        <n-button @click="onClose">取消</n-button>
        <n-button
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
  </n-modal>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import NeonInput from '../ui/NeonInput.vue'
import { api } from '../../lib/api.js'

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
const errorMessage = ref('')

const form = reactive({ username: '' })
const errors = reactive({ username: '' })

watch(() => props.show, (val) => {
  if (val) {
    form.username = props.currentUsername || ''
    errors.username = ''
    errorMessage.value = ''
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

async function handleSubmit() {
  errorMessage.value = ''
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
</style>
