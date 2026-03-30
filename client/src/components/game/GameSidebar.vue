<template>
  <div class="game-sidebar">
    <div class="stat-item">
      <span class="label">当前得分</span>
      <span class="value score">{{ score }}</span>
    </div>
    <div class="stat-item">
      <span class="label">速度倍数</span>
      <span class="value">{{ speedMultiplier }}x</span>
    </div>
    <div class="stat-item">
      <span class="label">得分倍数</span>
      <span class="value">{{ scoreMultiplier }}x</span>
    </div>
    <div class="multiplier-table">
      <div class="table-title">倍数对照表</div>
      <div class="table-row header">
        <span>速度</span>
        <span>得分</span>
      </div>
      <div class="table-row" :class="{ active: speedMultiplier === 1.0 }">
        <span>1.0x</span>
        <span>1.0x</span>
      </div>
      <div class="table-row" :class="{ active: speedMultiplier === 1.2 }">
        <span>1.2x</span>
        <span>1.5x</span>
      </div>
      <div class="table-row" :class="{ active: speedMultiplier === 1.5 }">
        <span>1.5x</span>
        <span>2.0x</span>
      </div>
      <div class="table-row" :class="{ active: speedMultiplier === 2.0 }">
        <span>2.0x</span>
        <span>3.0x</span>
      </div>
    </div>
    <n-button type="primary" block @click="$emit('openLeaderboard')">
      排行榜
    </n-button>
  </div>
</template>

<script setup>
import { NButton } from 'naive-ui'

defineProps({
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

defineEmits(['openLeaderboard'])
</script>

<style scoped>
.game-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: rgba(26, 26, 46, 0.9);
  border-radius: 8px;
  border: 1px solid #2a2a4e;
  min-width: 180px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 12px;
  color: #909399;
  text-transform: uppercase;
}

.value {
  font-size: 24px;
  font-weight: bold;
  color: #4ade80;
}

.value.score {
  font-size: 32px;
}

.multiplier-table {
  margin-top: 8px;
  padding: 12px;
  background: rgba(42, 42, 78, 0.5);
  border-radius: 4px;
}

.table-title {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
  text-align: center;
}

.table-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 8px;
  font-size: 12px;
  color: #909399;
}

.table-row.header {
  font-weight: bold;
  color: #ffffff;
  border-bottom: 1px solid #2a2a4e;
  margin-bottom: 4px;
}

.table-row.active {
  color: #4ade80;
  font-weight: bold;
}
</style>
