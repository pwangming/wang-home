<template>
  <div class="game-sidebar">
    <div class="score-section">
      <div class="score-label">当前得分</div>
      <div class="score-value">{{ score.toLocaleString() }}</div>

      <div class="score-divider" />

      <div class="score-info-row">
        <span class="score-info-label">速度倍率</span>
        <span class="score-info-value">{{ speedMultiplier }}x</span>
      </div>
      <div class="score-info-row">
        <span class="score-info-label">得分倍率</span>
        <span class="score-info-value">{{ scoreMultiplier }}x</span>
      </div>
    </div>

    <button data-testid="open-leaderboard-btn" class="leaderboard-btn" @click="$emit('open-leaderboard')">
      <div class="leaderboard-btn__content">
        <span class="leaderboard-btn__icon">🏆</span>
        <span>查看排行榜</span>
      </div>
      <span class="leaderboard-btn__arrow">›</span>
    </button>

    <div class="bento-grid">
      <div class="bento-card">
        <div class="bento-card__icon">⚡</div>
        <div class="bento-card__label">速度倍率</div>
        <div class="bento-card__value">{{ speedMultiplier }}x</div>
      </div>
      <div class="bento-card">
        <div class="bento-card__icon">📈</div>
        <div class="bento-card__label">得分倍率</div>
        <div class="bento-card__value">{{ scoreMultiplier }}x</div>
      </div>
    </div>

    <div class="achievement-preview">
      <div class="achievement-icon">🏅</div>
      <div class="achievement-info">
        <div class="achievement-label">最近成就</div>
        <div class="achievement-name">{{ latestAchievement }}</div>
      </div>
    </div>

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
  return '初露锋芒'
})
</script>

<style scoped>
/* === 1920x1080 Baseline === */
.game-sidebar {
  --sidebar-width: clamp(240px, 20vw, 340px);
  --section-padding: clamp(12px, 1.2vw, 24px);
  --gap: clamp(8px, 0.8vw, 16px);
  --score-size: clamp(32px, 2.5vw, 52px);
  --key-size: clamp(36px, 3vw, 52px);

  width: var(--sidebar-width);
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  flex-shrink: 1;
  overflow: hidden;
}

.score-section {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  padding: var(--section-padding);
}

.score-label {
  font-size: clamp(12px, 0.85vw, 14px);
  color: var(--text-secondary);
  margin-bottom: clamp(4px, 0.5vh, 8px);
}

.score-value {
  font-size: var(--score-size);
  font-weight: bold;
  color: var(--neon-green);
  text-shadow: 0 0 20px var(--neon-green-glow);
  margin-bottom: clamp(8px, 1vh, 16px);
  line-height: 1;
}

.score-divider {
  height: 1px;
  background: var(--card-border);
  margin: clamp(8px, 1vh, 16px) 0;
}

.score-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: clamp(4px, 0.5vh, 8px);
}

.score-info-label {
  font-size: clamp(12px, 0.85vw, 14px);
  color: var(--text-secondary);
}

.score-info-value {
  font-size: clamp(14px, 1vw, 16px);
  color: var(--text-primary);
  font-weight: bold;
}

.leaderboard-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--section-padding);
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
  gap: clamp(8px, 0.8vw, 14px);
  color: var(--text-primary);
  font-size: clamp(13px, 0.9vw, 15px);
}

.leaderboard-btn__icon {
  font-size: clamp(16px, 1.2vw, 20px);
}

.leaderboard-btn__arrow {
  font-size: clamp(18px, 1.3vw, 22px);
  color: var(--text-secondary);
}

.bento-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap);
}

.bento-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  padding: var(--section-padding);
  text-align: center;
}

.bento-card__icon {
  font-size: clamp(18px, 1.5vw, 26px);
  margin-bottom: clamp(4px, 0.5vh, 8px);
}

.bento-card__label {
  font-size: clamp(10px, 0.75vw, 12px);
  color: var(--text-secondary);
  margin-bottom: clamp(2px, 0.3vh, 4px);
}

.bento-card__value {
  font-size: clamp(18px, 1.5vw, 26px);
  font-weight: bold;
  color: var(--text-primary);
}

.achievement-preview {
  display: flex;
  align-items: center;
  gap: clamp(12px, 1vw, 18px);
  padding: var(--section-padding);
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
}

.achievement-icon {
  font-size: clamp(20px, 1.5vw, 26px);
}

.achievement-label {
  font-size: clamp(10px, 0.75vw, 12px);
  color: var(--text-secondary);
  margin-bottom: clamp(2px, 0.3vh, 4px);
}

.achievement-name {
  font-size: clamp(13px, 0.9vw, 16px);
  color: var(--text-primary);
}

.controls-section {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  padding: var(--section-padding);
}

.controls-label {
  font-size: clamp(10px, 0.75vw, 12px);
  color: var(--text-secondary);
  margin-bottom: clamp(8px, 0.8vh, 14px);
  text-align: center;
}

.direction-keys {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(4px, 0.5vw, 8px);
  margin-bottom: clamp(8px, 0.8vh, 14px);
}

.key-row {
  display: flex;
  gap: clamp(4px, 0.5vw, 8px);
}

.key {
  width: var(--key-size);
  height: var(--key-size);
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: clamp(14px, 1.2vw, 20px);
  cursor: pointer;
  transition: all 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.key:active {
  background: var(--neon-green);
  color: #000;
}

.pause-key {
  width: 100%;
  padding: clamp(10px, 0.8vw, 14px);
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: clamp(11px, 0.8vw, 14px);
  text-align: center;
}

@media (max-width: 1280px) {
  .game-sidebar {
    width: 100%;
    max-width: 600px;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .score-section {
    flex: 1;
    min-width: 200px;
  }

  .leaderboard-btn {
    flex: 1;
    min-width: 200px;
  }

  .bento-grid {
    flex: 1;
    min-width: 200px;
  }

  .achievement-preview {
    flex: 1;
    min-width: 200px;
  }

  .controls-section {
    flex: 1;
    min-width: 200px;
  }
}

@media (max-width: 768px) {
  .game-sidebar {
    flex-direction: column;
    gap: 12px;
  }

  .score-section,
  .leaderboard-btn,
  .bento-grid,
  .achievement-preview,
  .controls-section {
    min-width: unset;
    flex: unset;
    width: 100%;
  }

  .bento-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 480px) {
  .game-sidebar {
    gap: 10px;
  }

  .score-section {
    padding: 14px;
  }

  .score-value {
    font-size: 36px;
  }

  .key {
    width: 44px;
    height: 44px;
  }
}
</style>
