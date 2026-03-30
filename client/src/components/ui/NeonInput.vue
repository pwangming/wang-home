<template>
  <div class="neon-input" :class="{ 'neon-input--error': error }">
    <span v-if="$slots.icon" class="neon-input__icon">
      <slot name="icon" />
    </span>
    <input
      v-model="internalValue"
      :type="actualType"
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
