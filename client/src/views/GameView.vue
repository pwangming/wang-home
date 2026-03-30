<template>
  <div class="game-view">
    <div class="game-header">
      <h1>霓虹贪吃蛇</h1>
      <div class="header-actions">
        <n-button v-if="authStore.user" text @click="handleLogout">
          退出登录
        </n-button>
      </div>
    </div>

    <div class="game-container">
      <div class="game-main">
        <!-- Pre-game state -->
        <div v-if="!isPlaying" class="pre-game">
          <div class="welcome-text">
            <h2>欢迎来到霓虹贪吃蛇</h2>
            <p v-if="!authStore.user">您当前未登录，游玩成绩不会计入排行榜</p>
          </div>

          <div class="speed-selection">
            <div class="selection-label">选择速度倍数</div>
            <div class="speed-buttons">
              <n-button
                v-for="speed in speedOptions"
                :key="speed.value"
                :type="selectedSpeed === speed.value ? 'primary' : 'default'"
                @click="selectedSpeed = speed.value"
              >
                {{ speed.label }}
              </n-button>
            </div>
            <div class="score-hint">
              得分倍数: {{ currentScoreMultiplier }}x
            </div>
          </div>

          <n-button type="primary" size="large" @click="startGame">
            开始游戏
          </n-button>
        </div>

        <!-- Playing state -->
        <div v-else class="game-area">
          <SnakeGame
            ref="snakeGameRef"
            :speed-multiplier="selectedSpeed"
            :score-multiplier="currentScoreMultiplier"
            @game-over="handleGameOver"
          />
        </div>
      </div>

      <div class="game-sidebar-wrapper">
        <GameSidebar
          :score="currentScore"
          :speed-multiplier="selectedSpeed"
          :score-multiplier="currentScoreMultiplier"
          @open-leaderboard="showLeaderboard = true"
        />
      </div>
    </div>

    <!-- Score submission feedback -->
    <div v-if="submitStatus" class="submit-feedback" :class="submitStatus">
      {{ submitMessage }}
    </div>

    <!-- Leaderboard Modal -->
    <LeaderboardModal v-model:show="showLeaderboard" />

    <!-- Guest Warning Modal -->
    <n-modal v-model:show="showGuestWarning" :mask-closable="false" preset="card" title="提示" style="max-width: 400px;">
      <div class="guest-warning-content">
        <p>您当前未登录，游玩成绩不会计入排行榜和个人最高分</p>
        <p>登录后即可保存成绩并参与排行榜竞争</p>
      </div>
      <template #footer>
        <div class="guest-warning-actions">
          <n-button @click="goToLogin">登录/注册</n-button>
          <n-button type="primary" @click="continueAsGuest">继续游戏</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NModal, useMessage } from 'naive-ui'
import SnakeGame from '../components/game/SnakeGame.vue'
import GameSidebar from '../components/game/GameSidebar.vue'
import LeaderboardModal from '../components/game/LeaderboardModal.vue'
import { authStore } from '../stores/auth.js'
import { api } from '../lib/api.js'

const router = useRouter()
const message = useMessage()

// Game state
const isPlaying = ref(false)
const currentScore = ref(0)
const selectedSpeed = ref(1.0)
const snakeGameRef = ref(null)

// UI state
const showLeaderboard = ref(false)
const showGuestWarning = ref(false)
const hasSeenGuestWarning = ref(false)
const submitStatus = ref('')
const submitMessage = ref('')

// Speed options
const speedOptions = [
  { value: 1.0, label: '1.0x', scoreMult: 1.0 },
  { value: 1.2, label: '1.2x', scoreMult: 1.5 },
  { value: 1.5, label: '1.5x', scoreMult: 2.0 },
  { value: 2.0, label: '2.0x', scoreMult: 3.0 }
]

// Current score multiplier based on selected speed
const currentScoreMultiplier = computed(() => {
  const option = speedOptions.find(o => o.value === selectedSpeed.value)
  return option?.scoreMult || 1.0
})

// Check if user has seen guest warning
function checkGuestWarning() {
  if (!authStore.user && !hasSeenGuestWarning.value) {
    const seen = localStorage.getItem('guestWarningSeen')
    if (!seen) {
      showGuestWarning.value = true
    }
  }
}

// Mark guest warning as seen
function markGuestWarningSeen() {
  hasSeenGuestWarning.value = true
  localStorage.setItem('guestWarningSeen', 'true')
}

// Continue as guest
function continueAsGuest() {
  showGuestWarning.value = false
  markGuestWarningSeen()
}

// Go to login
function goToLogin() {
  showGuestWarning.value = false
  markGuestWarningSeen()
  router.push('/login')
}

// Start game
async function startGame() {
  // For authenticated users, start a game session
  if (authStore.user) {
    try {
      await api.leaderboard.startSession(selectedSpeed.value)
    } catch (err) {
      // Non-critical, continue playing
      console.warn('Failed to start session:', err)
    }
  }

  isPlaying.value = true
  currentScore.value = 0
  // Focus the canvas
  setTimeout(() => {
    snakeGameRef.value?.startGame()
  }, 100)
}

// Handle game over
async function handleGameOver(finalScore, speedMult, scoreMult) {
  isPlaying.value = false
  currentScore.value = finalScore

  if (!authStore.user) {
    message.warning('成绩未记录')
    return
  }

  // Submit score
  submitStatus.value = 'submitting'
  submitMessage.value = '分数提交中...'

  try {
    await api.leaderboard.submitScore(
      null, // sessionId - not using two-phase for now
      finalScore,
      speedMult,
      scoreMult,
      new Date().toISOString(),
      null // durationMs
    )
    submitStatus.value = 'success'
    submitMessage.value = '分数提交成功'
  } catch (err) {
    submitStatus.value = 'error'
    submitMessage.value = '分数提交失败'
  }

  // Clear status after 3 seconds
  setTimeout(() => {
    submitStatus.value = ''
  }, 3000)
}

// Logout
async function handleLogout() {
  await authStore.logout()
  message.success('已退出登录')
}

// Initialize
onMounted(async () => {
  await authStore.init()
  checkGuestWarning()
})
</script>

<style scoped>
.game-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 20px;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.game-header h1 {
  font-size: 24px;
  color: #4ade80;
  margin: 0;
  text-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
}

.game-container {
  display: flex;
  gap: 24px;
  justify-content: center;
}

.game-main {
  flex: 0 0 auto;
}

.pre-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 40px;
  background: rgba(26, 26, 46, 0.9);
  border-radius: 8px;
  border: 1px solid #2a2a4e;
}

.welcome-text {
  text-align: center;
}

.welcome-text h2 {
  color: #ffffff;
  margin: 0 0 8px;
}

.welcome-text p {
  color: #909399;
  margin: 0;
}

.speed-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.selection-label {
  color: #909399;
  font-size: 14px;
}

.speed-buttons {
  display: flex;
  gap: 8px;
}

.score-hint {
  color: #4ade80;
  font-size: 14px;
}

.game-area {
  padding: 20px;
  background: rgba(26, 26, 46, 0.9);
  border-radius: 8px;
  border: 1px solid #2a2a4e;
}

.submit-feedback {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 4px;
  font-weight: bold;
}

.submit-feedback.submitting {
  background: rgba(64, 158, 255, 0.9);
  color: #ffffff;
}

.submit-feedback.success {
  background: rgba(74, 222, 128, 0.9);
  color: #ffffff;
}

.submit-feedback.error {
  background: rgba(245, 108, 108, 0.9);
  color: #ffffff;
}

.guest-warning-content p {
  margin: 8px 0;
  color: #909399;
}

.guest-warning-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .game-container {
    flex-direction: column-reverse;
    align-items: center;
  }

  .game-sidebar-wrapper {
    width: 100%;
  }
}
</style>
