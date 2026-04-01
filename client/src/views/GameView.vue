<template>
  <div class="game-page">
    <!-- 顶部导航 -->
    <header class="game-topbar">
      <div class="game-topbar__logo">霓虹贪吃蛇</div>
      <div class="game-topbar__actions">
        <button class="topbar-btn">🔔</button>
        <button class="topbar-btn">⚙️</button>
        <div class="topbar-avatar">
          <img v-if="authStore.user?.avatar" :src="authStore.user.avatar" alt="" />
          <span v-else>👤</span>
        </div>
      </div>
    </header>

    <div class="game-main">
      <!-- 左侧游戏区 -->
      <div class="game-board-section">
        <div class="game-board-wrapper">
          <div class="game-board">
            <!-- 预游戏状态或游戏结束状态 -->
            <div v-if="!isPlaying" class="game-overlay">
              <div v-if="lastGameScore === null" class="game-start-card">
                <div class="welcome-section">
                  <h2>霓虹贪吃蛇</h2>
                  <p v-if="!authStore.user">当前未登录，游玩成绩不会计入排行榜</p>
                </div>

                <div class="speed-selection">
                  <div class="selection-label">选择速度倍率</div>
                  <div class="speed-buttons">
                    <button
                      v-for="speed in speedOptions"
                      :key="speed.value"
                      class="speed-btn"
                      :data-testid="`speed-option-${speed.value}`"
                      :class="{ active: selectedSpeed === speed.value }"
                      @click="selectedSpeed = speed.value"
                    >
                      {{ speed.label }}
                    </button>
                  </div>
                  <div class="score-hint">
                    得分倍率: {{ currentScoreMultiplier }}x
                  </div>
                </div>

                <button data-testid="game-start-btn" class="start-btn" @click="startGame">
                  <span class="start-btn__icon">▶</span>
                  开始游戏
                </button>
              </div>
              <div v-else class="game-over-card">
                <h2>游戏结束</h2>
                <div class="final-score">最终得分：{{ lastGameScore.toLocaleString() }}</div>

                <div class="speed-selection">
                  <div class="selection-label">选择速度倍率</div>
                  <div class="speed-buttons">
                    <button
                      v-for="speed in speedOptions"
                      :key="speed.value"
                      class="speed-btn"
                      :data-testid="`speed-option-${speed.value}`"
                      :class="{ active: selectedSpeed === speed.value }"
                      @click="selectedSpeed = speed.value"
                    >
                      {{ speed.label }}
                    </button>
                  </div>
                  <div class="score-hint">
                    得分倍率: {{ currentScoreMultiplier }}x
                  </div>
                </div>

                <button data-testid="game-retry-btn" class="start-btn" @click="playAgain">
                  <span class="start-btn__icon">▶</span>
                  再来一局
                </button>
              </div>
            </div>

            <!-- 游戏画布 -->
            <SnakeGame
              v-else
              ref="snakeGameRef"
              :speed-multiplier="selectedSpeed"
              :score-multiplier="currentScoreMultiplier"
              @game-over="handleGameOver"
            />
          </div>
        </div>
      </div>

      <!-- 右侧边栏 -->
      <GameSidebar
        :score="currentScore"
        :speed-multiplier="selectedSpeed"
        :score-multiplier="currentScoreMultiplier"
        @open-leaderboard="showLeaderboard = true"
      />
    </div>

    <!-- 分数提交反馈 -->
    <div v-if="submitStatus" data-testid="submit-feedback" class="submit-feedback" :class="submitStatus">
      {{ submitMessage }}
    </div>

    <!-- 排行榜弹窗 -->
    <LeaderboardModal v-model:show="showLeaderboard" />

    <!-- 游客警告弹窗 -->
    <n-modal v-model:show="showGuestWarning" :mask-closable="false" preset="card" title="提示" style="max-width: 400px;">
      <div class="guest-warning-content">
        <p>你当前未登录，游戏成绩不会计入排行榜和个人最高分。</p>
        <p>登录后即可保存成绩并参与排行榜竞争。</p>
      </div>
      <template #footer>
        <div class="guest-warning-actions">
          <n-button data-testid="guest-login-btn" @click="goToLogin">登录/注册</n-button>
          <n-button data-testid="guest-continue-btn" type="primary" @click="continueAsGuest">继续游戏</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NModal, useMessage } from 'naive-ui'
import SnakeGame from '../components/game/SnakeGame.vue'
import GameSidebar from '../components/game/GameSidebar.vue'
import LeaderboardModal from '../components/game/LeaderboardModal.vue'
import { authStore } from '../stores/auth.js'
import { api } from '../lib/api.js'

const router = useRouter()
const message = useMessage()

const isPlaying = ref(false)
const currentScore = ref(0)
const lastGameScore = ref(null)
const selectedSpeed = ref(1.0)
const snakeGameRef = ref(null)
const showLeaderboard = ref(false)
const showGuestWarning = ref(false)
const hasSeenGuestWarning = ref(false)
const submitStatus = ref('')
const submitMessage = ref('')

let gameStartTimer = null
let submitStatusTimer = null

const speedOptions = [
  { value: 1.0, label: '1.0x', scoreMult: 1.0 },
  { value: 1.2, label: '1.2x', scoreMult: 1.5 },
  { value: 1.5, label: '1.5x', scoreMult: 2.0 },
  { value: 2.0, label: '2.0x', scoreMult: 3.0 }
]

const currentScoreMultiplier = computed(() => {
  const option = speedOptions.find(o => o.value === selectedSpeed.value)
  return option?.scoreMult || 1.0
})

function checkGuestWarning() {
  if (!authStore.user && !hasSeenGuestWarning.value) {
    const seen = localStorage.getItem('guestWarningSeen')
    if (!seen) {
      showGuestWarning.value = true
    }
  }
}

function markGuestWarningSeen() {
  hasSeenGuestWarning.value = true
  localStorage.setItem('guestWarningSeen', 'true')
}

function continueAsGuest() {
  showGuestWarning.value = false
  markGuestWarningSeen()
}

function goToLogin() {
  showGuestWarning.value = false
  markGuestWarningSeen()
  router.push('/login')
}

async function startGame() {
  if (authStore.user) {
    try {
      await api.leaderboard.startSession(selectedSpeed.value)
    } catch (err) {
      console.warn('Failed to start session:', err)
    }
  }
  isPlaying.value = true
  currentScore.value = 0
  gameStartTimer = setTimeout(() => {
    snakeGameRef.value?.startGame()
  }, 100)
}

async function handleGameOver(finalScore, speedMult, scoreMult) {
  isPlaying.value = false
  currentScore.value = finalScore
  lastGameScore.value = finalScore

  if (!authStore.user) {
    message.warning('未登录状态下分数不会被记录')
    return
  }

  submitStatus.value = 'submitting'
  submitMessage.value = '分数提交中...'

  try {
    await api.leaderboard.submitScore(null, finalScore, speedMult, scoreMult, new Date().toISOString(), null)
    submitStatus.value = 'success'
    submitMessage.value = '分数提交成功'
  } catch (err) {
    submitStatus.value = 'error'
    submitMessage.value = '分数提交失败'
  }

  submitStatusTimer = setTimeout(() => {
    submitStatus.value = ''
  }, 3000)
}

function playAgain() {
  lastGameScore.value = null
}

onMounted(async () => {
  await authStore.init()
  checkGuestWarning()
})

onBeforeUnmount(() => {
  if (gameStartTimer) {
    clearTimeout(gameStartTimer)
    gameStartTimer = null
  }
  if (submitStatusTimer) {
    clearTimeout(submitStatusTimer)
    submitStatusTimer = null
  }
})
</script>

<style scoped>
/* === 1920x1080 Baseline === */
.game-page {
  --topbar-height: clamp(56px, 5vh, 72px);
  --main-padding: clamp(16px, 2vw, 32px);
  --board-size: min(
    clamp(500px, 60vw, 816px),
    calc(100vh - var(--topbar-height) - (var(--main-padding) * 2))
  );
  --sidebar-width: clamp(240px, 22vw, 340px);

  display: flex;
  flex-direction: column;
  height: 100dvh;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-end));
  box-sizing: border-box;
  overflow: hidden;
}

/* 顶部导航 */
.game-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--main-padding);
  height: var(--topbar-height);
  background: rgba(26, 26, 46, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--card-border);
  flex-shrink: 0;
}

.game-topbar__logo {
  font-size: clamp(16px, 1.3vw, 22px);
  color: var(--neon-green);
  font-weight: bold;
  text-shadow: 0 0 10px var(--neon-green-glow);
}

.game-topbar__actions {
  display: flex;
  align-items: center;
  gap: clamp(8px, 1vw, 16px);
}

.topbar-btn {
  width: clamp(32px, 3vw, 40px);
  height: clamp(32px, 3vw, 40px);
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  font-size: clamp(14px, 1.2vw, 18px);
  cursor: pointer;
  transition: all 0.2s;
}

.topbar-btn:hover {
  background: var(--card-border);
}

.topbar-avatar {
  width: clamp(36px, 3.5vw, 44px);
  height: clamp(36px, 3.5vw, 44px);
  background: var(--input-bg);
  border: 2px solid var(--neon-green);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: clamp(16px, 1.5vw, 22px);
}

/* 主要内容区 */
.game-main {
  display: flex;
  gap: var(--main-padding);
  padding: var(--main-padding);
  flex: 1;
  min-height: 0;
  justify-content: center;
  align-items: flex-start;
  overflow: hidden;
}

/* 游戏区 */
.game-board-section {
  flex: 1;
  max-width: var(--board-size);
}

.game-board-wrapper {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.1), rgba(64, 158, 255, 0.1));
  border-radius: var(--card-radius);
  padding: clamp(16px, 2vw, 32px);
  border: 1px solid var(--card-border);
}

.game-board {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  margin: 0 auto;
}

.game-board > * {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* 预游戏覆盖层 */
.game-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(26, 26, 46, 0.95);
  border-radius: var(--card-radius);
  z-index: 10;
}

.game-start-card,
.game-over-card {
  text-align: center;
  padding: clamp(20px, 3vw, 48px);
}

.game-over-card h2 {
  font-size: clamp(24px, 2.5vw, 36px);
  color: var(--neon-green);
  margin: 0 0 clamp(8px, 1.5vh, 20px);
  text-shadow: 0 0 20px var(--neon-green-glow);
}

.final-score {
  font-size: clamp(18px, 1.8vw, 26px);
  color: var(--text-primary);
  margin-bottom: clamp(16px, 2vh, 28px);
}

.welcome-section h2 {
  font-size: clamp(24px, 2.5vw, 36px);
  color: var(--neon-green);
  margin: 0 0 clamp(6px, 1vh, 12px);
  text-shadow: 0 0 20px var(--neon-green-glow);
}

.welcome-section p {
  color: var(--text-secondary);
  font-size: clamp(12px, 1vw, 15px);
  margin: 0 0 clamp(16px, 2vh, 28px);
}

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

.start-btn {
  display: inline-flex;
  align-items: center;
  gap: clamp(8px, 1vw, 14px);
  padding: clamp(14px, 1.5vw, 20px) clamp(32px, 3vw, 56px);
  background: var(--neon-green);
  border: none;
  border-radius: 8px;
  color: #000;
  font-size: clamp(15px, 1.3vw, 20px);
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.start-btn:hover {
  box-shadow: 0 0 30px var(--neon-green-glow);
}

.start-btn__icon {
  font-size: clamp(16px, 1.3vw, 22px);
}

/* 反馈消息 */
.submit-feedback {
  position: fixed;
  bottom: clamp(16px, 2vh, 28px);
  left: 50%;
  transform: translateX(-50%);
  padding: clamp(10px, 1.2vh, 16px) clamp(20px, 2vw, 32px);
  border-radius: 8px;
  font-weight: bold;
  font-size: clamp(13px, 1vw, 16px);
  z-index: 100;
}

.submit-feedback.submitting {
  background: rgba(64, 158, 255, 0.9);
  color: #fff;
}

.submit-feedback.success {
  background: rgba(74, 222, 128, 0.9);
  color: #fff;
}

.submit-feedback.error {
  background: rgba(245, 108, 108, 0.9);
  color: #fff;
}

.guest-warning-content p {
  margin: 8px 0;
  color: var(--text-secondary);
  font-size: clamp(13px, 0.9vw, 15px);
}

.guest-warning-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* === Responsive Breakpoints === */
@media (max-width: 1280px) {
  .game-main {
    flex-direction: column;
    align-items: center;
  }

  .game-board-section {
    width: 100%;
    flex: none;
    max-width: min(var(--board-size), 100%);
  }

  .game-board-wrapper {
    width: 100%;
  }

  :deep(.game-sidebar) {
    width: 100%;
    max-width: 600px;
  }
}

@media (max-width: 768px) {
  .game-main {
    padding: 12px;
    gap: 12px;
  }

  .game-board-wrapper {
    padding: 12px;
  }

  .game-start-card,
  .game-over-card {
    padding: 16px;
  }

  .speed-buttons {
    gap: 8px;
  }

  .speed-btn {
    padding: 8px 16px;
    font-size: 13px;
  }

  .topbar-avatar {
    display: none;
  }
}

@media (max-width: 480px) {
  .game-topbar {
    padding: 0 12px;
  }

  .game-main {
    padding: 8px;
  }

  .game-board-wrapper {
    padding: 8px;
  }

  .topbar-btn {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
}
</style>


