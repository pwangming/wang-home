<template>
  <div class="speed-selection">
    <div class="selection-label">选择速度倍率</div>
    <div class="speed-buttons">
      <button
        v-for="speed in SPEED_OPTIONS"
        :key="speed.value"
        class="speed-btn"
        :data-testid="`speed-option-${speed.value}`"
        :class="{ active: modelValue === speed.value }"
        @click="$emit('update:modelValue', speed.value)"
      >
        {{ speed.label }}
      </button>
    </div>
    <div class="score-hint">
      得分倍率: {{ currentScoreMultiplier }}x
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const SPEED_OPTIONS = [
  { value: 1.0, label: '1.0x', scoreMult: 1.0 },
  { value: 1.2, label: '1.2x', scoreMult: 1.5 },
  { value: 1.5, label: '1.5x', scoreMult: 2.0 },
  { value: 2.0, label: '2.0x', scoreMult: 3.0 }
]

const props = defineProps({
  modelValue: {
    type: Number,
    default: 1.0
  }
})

defineEmits(['update:modelValue'])

const currentScoreMultiplier = computed(() => {
  const option = SPEED_OPTIONS.find(o => o.value === props.modelValue)
  return option?.scoreMult || 1.0
})

defineExpose({ currentScoreMultiplier })
</script>

<style scoped>
.speed-selection {
  margin-bottom: clamp(16px, 2vh, 28px);
}

.selection-label {
  color: var(--text-secondary);
  font-size: clamp(12px, 0.9vw, 14px);
  margin-bottom: clamp(8px, 1vh, 14px);
}

.speed-buttons {
  display: flex;
  gap: clamp(8px, 1vw, 16px);
  justify-content: center;
  margin-bottom: clamp(8px, 1vh, 14px);
  flex-wrap: wrap;
}

.speed-btn {
  padding: clamp(10px, 1vw, 14px) clamp(16px, 1.5vw, 24px);
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: clamp(13px, 1vw, 16px);
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
  font-size: clamp(11px, 0.85vw, 14px);
}
</style>
