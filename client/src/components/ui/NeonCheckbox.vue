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
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
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
