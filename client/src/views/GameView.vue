<template>
  <div class="game-page">
    <!-- 顶部导航 -->
    <header class="game-topbar">
      <div class="game-topbar__logo">霓虹贪吃蛇</div>
      <div class="game-topbar__actions">
        <button class="topbar-btn">🔊</button>
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
            <!-- 预游戏状态 or 游戏结束状态 -->
            <div v-if="!isPlaying" class="game-overlay">
              <div v-if="!lastGameScore" class="game-start-card">
                <div class="welcome-section">
                  <h2>霓虹贪吃蛇</h2>
                  <p v-if="!authStore.user">您当前未登录，游玩成绩不会计入排行榜</p>
                </div>

                <div class="speed-selection">
                  <div class="selection-label">选择速度倍数</div>
                  <div class="speed-buttons">
                    <button
                      v-for="speed in speedOptions"
                      :key="speed.value"
                      class="speed-btn"
                      :class="{ active: selectedSpeed === speed.value }"
                      @click="selectedSpeed = speed.value"
                    >
                      {{ speed.label }}
                    </button>
                  </div>
                  <div class="score-hint">
                    得分倍数: {{ currentScoreMultiplier }}x
                  </div>
                </div>

                <button class="start-btn" @click="startGame">
                  <span class="start-btn__icon">▶</span>
                  开始游戏
                </button>
              </div>
              <div v-else class="game-over-card">
                <h2>游戏结束</h2>
                <div class="final-score">最终得分: {{ lastGameScore.toLocaleString() }}</div>

                <div class="speed-selection">
                  <div class="selection-label">选择速度倍数</div>
                  <div class="speed-buttons">
                    <button
                      v-for="speed in speedOptions"
                      :key="speed.value"
                      class="speed-btn"
                      :class="{ active: selectedSpeed === speed.value }"
                      @click="selectedSpeed = speed.value"
                    >
                      {{ speed.label }}
                    </button>
                  </div>
                  <div class="score-hint">
                    得分倍数: {{ currentScoreMultiplier }}x
                  </div>
                </div>

                <button class="start-btn" @click="playAgain">
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

      <!-- 右侧侧边栏 -->
      <GameSidebar
        :score="currentScore"
        :speed-multiplier="selectedSpeed"
        :score-multiplier="currentScoreMultiplier"
        @open-leaderboard="showLeaderboard = true"
      />
    </div>

    <!-- 分数提交反馈 -->
    <div v-if="submitStatus" class="submit-feedback" :class="submitStatus">
      {{ submitMessage }}
    </div>

    <!-- 排行榜弹窗 -->
    <LeaderboardModal v-model:show="showLeaderboard" />

    <!-- 游客警告弹窗 -->
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

const isPlaying = ref(false)
const currentScore = ref(0)
const lastGameScore = ref(0)
const selectedSpeed = ref(1.0)
const snakeGameRef = ref(null)
const showLeaderboard = ref(false)
const showGuestWarning = ref(false)
const hasSeenGuestWarning = ref(false)
const submitStatus = ref('')
const submitMessage = ref('')

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
  setTimeout(() => {
    snakeGameRef.value?.startGame()
  }, 100)
}

async function handleGameOver(finalScore, speedMult, scoreMult) {
  isPlaying.value = false
  currentScore.value = finalScore
  lastGameScore.value = finalScore

  if (!authStore.user) {
    message.warning('成绩未记录')
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

  setTimeout(() => {
    submitStatus.value = ''
  }, 3000)
}

function playAgain() {
  lastGameScore.value = 0
}

onMounted(async () => {
  await authStore.init()
  checkGuestWarning()
})
</script>

<style scoped>
.game-page {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-end));
}

/* 顶部导航 */
.game-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(26, 26, 46, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--card-border);
}

.game-topbar__logo {
  font-size: 20px;
  color: var(--neon-green);
  font-weight: bold;
  text-shadow: 0 0 10px var(--neon-green-glow);
}

.game-topbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar-btn {
  width: 36px;
  height: 36px;
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.topbar-avatar {
  width: 40px;
  height: 40px;
  background: var(--input-bg);
  border: 2px solid var(--neon-green);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 20px;
}

/* 主内容区 */
.game-main {
  display: flex;
  gap: 24px;
  padding: 24px;
  justify-content: center;
}

/* 游戏区 */
.game-board-section {
  flex: 0 0 816px;
}

.game-board-wrapper {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.1), rgba(64, 158, 255, 0.1));
  border-radius: var(--card-radius);
  padding: 32px;
  border: 1px solid var(--card-border);
}

.game-board {
  position: relative;
  width: 752px;
  height: 752px;
  margin: 0 auto;
}

/* 预游戏覆盖层 */
.game-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(26, 26, 46, 0.95);
  border-radius: var(--card-radius);
}

.game-start-card,
.game-over-card {
  text-align: center;
  padding: 40px;
}

.game-over-card h2 {
  font-size: 32px;
  color: var(--neon-green);
  margin: 0 0 16px;
  text-shadow: 0 0 20px var(--neon-green-glow);
}

.final-score {
  font-size: 24px;
  color: var(--text-primary);
  margin-bottom: 24px;
}

.welcome-section h2 {
  font-size: 32px;
  color: var(--neon-green);
  margin: 0 0 8px;
  text-shadow: 0 0 20px var(--neon-green-glow);
}

.welcome-section p {
  color: var(--text-secondary);
  margin: 0 0 24px;
}

.speed-selection {
  margin-bottom: 24px;
}

.selection-label {
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.speed-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 12px;
}

.speed-btn {
  padding: 12px 24px;
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 16px;
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
  font-size: 14px;
}

.start-btn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 16px 48px;
  background: var(--neon-green);
  border: none;
  border-radius: 8px;
  color: #000;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.start-btn:hover {
  box-shadow: 0 0 30px var(--neon-green-glow);
}

.start-btn__icon {
  font-size: 20px;
}

/* 反馈消息 */
.submit-feedback {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: bold;
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
}

.guest-warning-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
