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
