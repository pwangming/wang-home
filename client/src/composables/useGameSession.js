import { ref, computed, nextTick, isRef } from 'vue'
import { useMessage } from 'naive-ui'
import { useAuthStore } from '../stores/auth.js'
import { api } from '../lib/api.js'

const SPEED_SCORE_MAP = { 1.0: 1.0, 1.2: 1.5, 1.5: 2.0, 2.0: 3.0 }

export function useGameSession({ snakeGameRef, onScoreSubmitted } = {}) {
  const message = useMessage()
  const authStore = useAuthStore()

  const isPlaying = ref(false)
  const currentScore = ref(0)
  const lastGameScore = ref(null)
  const selectedSpeed = ref(loadSavedSpeed())
  const bestScore = ref(null)
  const submitStatus = ref('')
  const submitMessage = ref('')
  const lastGameContext = ref(null)

  let submitStatusTimer = null

  const currentScoreMultiplier = computed(() => SPEED_SCORE_MAP[selectedSpeed.value] || 1.0)

  function loadSavedSpeed() {
    const VALID_SPEEDS = [1.0, 1.2, 1.5, 2.0]
    const saved = parseFloat(localStorage.getItem('preferredSpeed'))
    return VALID_SPEEDS.includes(saved) ? saved : 1.0
  }

  function resolveSnakeGame() {
    return isRef(snakeGameRef) ? snakeGameRef.value : snakeGameRef
  }

  async function startGame() {
    isPlaying.value = true
    currentScore.value = 0
    await nextTick()
    resolveSnakeGame()?.startGame()
  }

  async function handleGameOver(finalScore, speedMult, scoreMult, gameContext = null) {
    isPlaying.value = false
    currentScore.value = finalScore
    lastGameScore.value = finalScore
    lastGameContext.value = gameContext

    if (!authStore.user) {
      message.warning('未登录状态下分数不会被记录')
      return
    }

    clearSubmitStatus()
    submitStatus.value = 'submitting'
    submitMessage.value = '分数提交中...'

    try {
      await api.leaderboard.submitScore(null, finalScore, speedMult, scoreMult, new Date().toISOString(), null)
      submitStatus.value = 'success'
      submitMessage.value = '分数提交成功'
      await fetchBestScore()
      if (onScoreSubmitted) {
        onScoreSubmitted()
      }
    } catch (err) {
      submitStatus.value = 'error'
      if (err.message === 'Missing authenticated session' || err.message === 'Invalid or expired token') {
        submitMessage.value = '登录已过期，分数未保存，请重新登录'
      } else {
        submitMessage.value = '分数提交失败：' + (err.message || '未知错误')
      }
    }

    submitStatusTimer = setTimeout(() => {
      submitStatus.value = ''
    }, 3000)
  }

  async function fetchBestScore() {
    if (!authStore.user) {
      bestScore.value = null
      return
    }
    try {
      const data = await api.leaderboard.getMyRank()
      bestScore.value = data?.rank?.best_score ?? null
    } catch {
      bestScore.value = null
    }
  }

  function updateScore(n) {
    currentScore.value = n
  }

  function clearSubmitStatus() {
    if (submitStatusTimer) {
      clearTimeout(submitStatusTimer)
      submitStatusTimer = null
    }
    submitStatus.value = ''
  }

  function playAgain() {
    lastGameScore.value = null
    return startGame()
  }

  return {
    isPlaying,
    currentScore,
    lastGameScore,
    selectedSpeed,
    bestScore,
    submitStatus,
    submitMessage,
    lastGameContext,
    currentScoreMultiplier,
    startGame,
    handleGameOver,
    fetchBestScore,
    clearSubmitStatus,
    playAgain,
    updateScore
  }
}
