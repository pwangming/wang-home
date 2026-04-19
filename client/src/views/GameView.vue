<template>
  <div class="game-page">
    <!-- 顶部导航 -->
    <header class="game-topbar">
      <div class="game-topbar__inner">
        <div class="game-topbar__logo">霓虹贪吃蛇</div>
        <div class="game-topbar__actions">
          <button class="topbar-btn" :aria-label="soundEnabled ? '关闭音效' : '开启音效'" @click="soundToggle">
            {{ soundEnabled ? '🔔' : '🔕' }}
          </button>
          <button v-if="!authStore.user" class="topbar-login-btn" @click="router.push('/login')">登录</button>
          <div v-else class="topbar-user">
            <button class="topbar-username" data-testid="open-profile-btn" @click="showProfileModal = true">
              {{ authStore.user.username || authStore.user.email }}
            </button>
            <button class="topbar-logout-btn" @click="handleLogout">退出</button>
          </div>
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

                <SpeedSelector v-model="selectedSpeed" />

                <button data-testid="game-start-btn" class="start-btn" @click="startGame">
                  <span class="start-btn__icon">▶</span>
                  开始游戏
                </button>
              </div>
              <div v-else class="game-over-card">
                <h2>游戏结束</h2>
                <div class="final-score">最终得分：{{ lastGameScore.toLocaleString() }}</div>

                <SpeedSelector v-model="selectedSpeed" />

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
              @eat-food="playEatSound"
            />
          </div>
        </div>
      </div>

      <!-- 右侧边栏 -->
      <GameSidebar
        class="game-sidebar-panel"
        :score="currentScore"
        :speed-multiplier="selectedSpeed"
        :score-multiplier="currentScoreMultiplier"
        :best-score="bestScore"
        :is-logged-in="!!authStore.user"
        @open-leaderboard="showLeaderboard = true"
      />
    </div>

    <!-- 分数提交反馈 -->
    <div v-if="submitStatus" data-testid="submit-feedback" class="submit-feedback" :class="submitStatus">
      {{ submitMessage }}
    </div>

    <!-- 排行榜弹窗 -->
    <LeaderboardModal v-model:show="showLeaderboard" />

    <!-- 用户名修改弹窗 -->
    <ProfileModal
      v-model:show="showProfileModal"
      :current-username="authStore.user?.username || ''"
      @username-updated="handleUsernameUpdated"
    />

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
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import SnakeGame from '../components/game/SnakeGame.vue'
import GameSidebar from '../components/game/GameSidebar.vue'
import LeaderboardModal from '../components/game/LeaderboardModal.vue'
import ProfileModal from '../components/game/ProfileModal.vue'
import SpeedSelector from '../components/game/SpeedSelector.vue'
import { useAuthStore } from '../stores/auth.js'
import { useSound } from '../composables/useSound.js'
import { useGuestWarning } from '../composables/useGuestWarning.js'
import { useGameSession } from '../composables/useGameSession.js'
import { useAuthCallback } from '../composables/useAuthCallback.js'
import { api } from '../lib/api.js'

const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()
const { soundEnabled, toggle: soundToggle, playEat: playEatSound } = useSound()
const { showGuestWarning, checkGuestWarning, continueAsGuest, goToLogin } = useGuestWarning()
const { handleCallback } = useAuthCallback({ api, authStore, router, message })

const snakeGameRef = ref(null)
const showLeaderboard = ref(false)
const showProfileModal = ref(false)
let prevHtmlOverflow = ''
let prevBodyOverflow = ''

const {
  isPlaying, currentScore, lastGameScore, selectedSpeed, bestScore,
  submitStatus, submitMessage, currentScoreMultiplier,
  startGame, handleGameOver, fetchBestScore, playAgain
} = useGameSession({ snakeGameRef })

watch(selectedSpeed, (val) => localStorage.setItem('preferredSpeed', val))

const handleLogout = () => authStore.logout().then(() => message.success('已退出登录'))
const handleUsernameUpdated = (newUsername) => authStore.updateProfile(newUsername).then(() => message.success('用户名已更新'))

onMounted(async () => {
  const html = document.documentElement
  const body = document.body
  prevHtmlOverflow = html.style.overflow
  prevBodyOverflow = body.style.overflow
  html.classList.add('game-page-overflow-lock')
  body.classList.add('game-page-overflow-lock')
  html.style.overflow = 'hidden'
  body.style.overflow = 'hidden'
  await handleCallback()
  await authStore.init()
  fetchBestScore()
  checkGuestWarning()
})

onBeforeUnmount(() => {
  const html = document.documentElement
  const body = document.body
  html.classList.remove('game-page-overflow-lock')
  body.classList.remove('game-page-overflow-lock')
  html.style.overflow = prevHtmlOverflow
  body.style.overflow = prevBodyOverflow
})
</script>

<style scoped>
/* === 1920x1080 Baseline === */
.game-page {
  --viewport-height: 100vh;
  --topbar-height: clamp(56px, 5vh, 72px);
  --main-padding: clamp(16px, 2vw, 32px);
  --board-wrapper-padding: clamp(12px, 1.6vw, 24px);
  --board-size: min(
    clamp(420px, 60vw, 816px),
    calc(
      var(--viewport-height) - var(--topbar-height) - (var(--main-padding) * 2) - (var(--board-wrapper-padding) * 2) - 2px
    )
  );
  --sidebar-width: clamp(240px, 22vw, 340px);

  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  min-height: 100vh;
  min-height: 100dvh;
  background: linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-end));
  box-sizing: border-box;
  overflow: hidden;
}

@supports (height: 100dvh) {
  .game-page {
    --viewport-height: 100dvh;
  }
}

/* 顶部导航 */
.game-topbar {
  padding: 0 var(--main-padding);
  height: var(--topbar-height);
  background: rgba(26, 26, 46, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--card-border);
  flex-shrink: 0;
}

.game-topbar__inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  max-width: calc(var(--board-size) + var(--main-padding) + var(--sidebar-width));
  margin: 0 auto;
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

.topbar-login-btn {
  height: clamp(32px, 3vw, 40px);
  padding: 0 clamp(12px, 1.2vw, 18px);
  background: transparent;
  border: 1px solid var(--neon-green);
  border-radius: 999px;
  color: var(--neon-green);
  font-size: clamp(12px, 0.9vw, 14px);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.topbar-login-btn:hover {
  background: var(--neon-green);
  color: #000;
  box-shadow: 0 0 12px var(--neon-green-glow);
}

.topbar-user {
  display: flex;
  align-items: center;
  gap: clamp(8px, 0.8vw, 12px);
}

.topbar-logout-btn {
  height: clamp(28px, 2.5vw, 34px);
  padding: 0 clamp(10px, 1vw, 14px);
  background: transparent;
  border: 1px solid var(--text-secondary);
  border-radius: 999px;
  color: var(--text-secondary);
  font-size: clamp(11px, 0.8vw, 13px);
  cursor: pointer;
  transition: all 0.2s;
}

.topbar-logout-btn:hover {
  border-color: #f56c6c;
  color: #f56c6c;
}

.topbar-username {
  color: var(--text-primary);
  font-size: clamp(12px, 0.9vw, 14px);
  max-width: clamp(80px, 10vw, 160px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  text-align: left;
  transition: color 0.2s;
}

.topbar-username:hover {
  color: var(--neon-green);
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

.game-sidebar-panel {
  align-self: flex-start;
  max-height: calc(var(--board-size) + var(--board-wrapper-padding) * 2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.game-board-wrapper {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.1), rgba(64, 158, 255, 0.1));
  border-radius: var(--card-radius);
  padding: var(--board-wrapper-padding);
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
  top: clamp(80px, 10vh, 120px);
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

/* Tablet portrait: stack vertically */
@media (max-width: 1180px) {
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

  .game-sidebar-panel {
    width: 100%;
    max-width: 600px;
  }
}

/* Narrow desktop: tighten spacing */
@media (min-width: 1181px) and (max-width: 1279px) {
  .game-page {
    --main-padding: 16px;
    --board-wrapper-padding: 12px;
    --sidebar-width: 260px;
  }

  .game-topbar__logo {
    font-size: 18px;
  }
}

/* Standard desktop (1280px+) */
@media (min-width: 1280px) and (max-width: 1599px) {
  .game-page {
    --main-padding: 24px;
    --board-wrapper-padding: 16px;
    --sidebar-width: 280px;
  }
}

/* Wide desktop (1600px+) */
@media (min-width: 1600px) {
  .game-page {
    --main-padding: 32px;
    --board-wrapper-padding: 24px;
    --sidebar-width: 340px;
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

  .topbar-login-btn,
  .topbar-user,
  .topbar-logout-btn {
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
