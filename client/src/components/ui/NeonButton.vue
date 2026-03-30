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
