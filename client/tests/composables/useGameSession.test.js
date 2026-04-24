import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// Mock api
vi.mock('../../src/lib/api.js', () => ({
  api: {
    leaderboard: {
      submitScore: vi.fn(),
      getMyRank: vi.fn()
    }
  }
}))

// Mock naive-ui message
const mockWarning = vi.fn()
const mockSuccess = vi.fn()
const mockError = vi.fn()
vi.mock('naive-ui', () => ({
  useMessage: vi.fn(() => ({
    warning: mockWarning,
    success: mockSuccess,
    error: mockError
  }))
}))

// Mock useAuthStore
vi.mock('../../src/stores/auth.js', () => ({
  useAuthStore: vi.fn()
}))

describe('useGameSession', () => {
  let mockSnakeGame
  let localStorageMock
  let useGameSession
  let api
  let useAuthStore

  beforeEach(async () => {
    vi.resetModules()
    setActivePinia(createPinia())
    mockSnakeGame = { startGame: vi.fn() }
    vi.clearAllMocks()
    localStorageMock = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    }
    global.localStorage = localStorageMock

    // Re-import after resetModules to get fresh module instances
    const authModule = await import('../../src/stores/auth.js')
    useAuthStore = authModule.useAuthStore
    const apiModule = await import('../../src/lib/api.js')
    api = apiModule.api
    const sessionModule = await import('../../src/composables/useGameSession.js')
    useGameSession = sessionModule.useGameSession
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('selectedSpeed', () => {
    it('should default to 1.0 when no localStorage value', () => {
      localStorageMock.getItem.mockReturnValue(null)
      const { selectedSpeed } = useGameSession()
      expect(selectedSpeed.value).toBe(1.0)
    })

    it('should load valid speed from localStorage', async () => {
      // Need fresh import since localStorage is read at module init time
      vi.resetModules()
      localStorageMock.getItem.mockReturnValue('1.5')
      const { useGameSession: fresh } = await import('../../src/composables/useGameSession.js')
      const { selectedSpeed } = fresh()
      expect(selectedSpeed.value).toBe(1.5)
    })

    it('should fall back to 1.0 for invalid localStorage value', async () => {
      vi.resetModules()
      localStorageMock.getItem.mockReturnValue('invalid')
      const { useGameSession: fresh } = await import('../../src/composables/useGameSession.js')
      const { selectedSpeed } = fresh()
      expect(selectedSpeed.value).toBe(1.0)
    })

    it('should fall back to 1.0 when localStorage has unsupported speed', async () => {
      vi.resetModules()
      localStorageMock.getItem.mockReturnValue('5.0')
      const { useGameSession: fresh } = await import('../../src/composables/useGameSession.js')
      const { selectedSpeed } = fresh()
      expect(selectedSpeed.value).toBe(1.0)
    })
  })

  describe('currentScoreMultiplier', () => {
    it('should return correct multiplier for 1.0x', () => {
      const { currentScoreMultiplier } = useGameSession()
      expect(currentScoreMultiplier.value).toBe(1.0)
    })

    it('should return correct multiplier for 1.2x', async () => {
      vi.resetModules()
      localStorageMock.getItem.mockReturnValue('1.2')
      const { useGameSession: fresh } = await import('../../src/composables/useGameSession.js')
      const { currentScoreMultiplier } = fresh()
      expect(currentScoreMultiplier.value).toBe(1.5)
    })

    it('should return correct multiplier for 1.5x', async () => {
      vi.resetModules()
      localStorageMock.getItem.mockReturnValue('1.5')
      const { useGameSession: fresh } = await import('../../src/composables/useGameSession.js')
      const { currentScoreMultiplier } = fresh()
      expect(currentScoreMultiplier.value).toBe(2.0)
    })

    it('should return correct multiplier for 2.0x', async () => {
      vi.resetModules()
      localStorageMock.getItem.mockReturnValue('2.0')
      const { useGameSession: fresh } = await import('../../src/composables/useGameSession.js')
      const { currentScoreMultiplier } = fresh()
      expect(currentScoreMultiplier.value).toBe(3.0)
    })
  })

  describe('startGame()', () => {
    it('should start game when not authenticated', async () => {
      useAuthStore.mockReturnValue({ user: null })

      const { isPlaying, startGame } = useGameSession({ snakeGameRef: mockSnakeGame })

      await startGame()

      expect(isPlaying.value).toBe(true)
      expect(mockSnakeGame.startGame).toHaveBeenCalled()
    })

    it('should start game when authenticated without requiring a server session', async () => {
      useAuthStore.mockReturnValue({ user: { id: '123' } })

      const { isPlaying, startGame } = useGameSession({ snakeGameRef: mockSnakeGame })

      await startGame()

      expect(isPlaying.value).toBe(true)
      expect(mockSnakeGame.startGame).toHaveBeenCalled()
    })

    // Regression: prod bug where startGame fired before <SnakeGame v-if="isPlaying"> mounted,
    // leaving the snake/food unrendered. The composable must wait for the ref to populate.
    it('should invoke startGame after nextTick, even if ref is null at call time', async () => {
      useAuthStore.mockReturnValue({ user: null })
      const snakeGameRef = ref(null)

      const { startGame } = useGameSession({ snakeGameRef })

      // Kick off startGame while ref is still null (mirrors real mount timing).
      const p = startGame()
      // Populate ref before nextTick resolves — simulates Vue mounting <SnakeGame> after isPlaying flips.
      snakeGameRef.value = mockSnakeGame
      await p

      expect(mockSnakeGame.startGame).toHaveBeenCalled()
    })
  })

  describe('handleGameOver()', () => {
    it('should show warning message when user is not authenticated', async () => {
      useAuthStore.mockReturnValue({ user: null })

      const { isPlaying, handleGameOver } = useGameSession()
      await handleGameOver(100, 1.5, 2.0)

      expect(mockWarning).toHaveBeenCalledWith('未登录状态下分数不会被记录')
      expect(isPlaying.value).toBe(false)
    })

    it('should submit score and trigger side effects on success', async () => {
      useAuthStore.mockReturnValue({ user: { id: '123' } })
      api.leaderboard.submitScore.mockResolvedValue({})
      api.leaderboard.getMyRank.mockResolvedValue({ rank: { best_score: 100 } })
      const onScoreSubmitted = vi.fn()

      const { submitStatus, bestScore, handleGameOver } = useGameSession({ onScoreSubmitted })
      await handleGameOver(100, 1.5, 2.0)

      expect(submitStatus.value).toBe('success')
      expect(api.leaderboard.submitScore).toHaveBeenCalledWith(null, 100, 1.5, 2.0, expect.any(String), null)
      // #2: verify fetchBestScore was called and updated bestScore
      expect(api.leaderboard.getMyRank).toHaveBeenCalled()
      expect(bestScore.value).toBe(100)
      // #2: verify onScoreSubmitted callback was called
      expect(onScoreSubmitted).toHaveBeenCalled()
    })

    it('should accept gameContext as a fourth argument without changing score submission', async () => {
      useAuthStore.mockReturnValue({ user: { id: '123' } })
      api.leaderboard.submitScore.mockResolvedValue({})
      api.leaderboard.getMyRank.mockResolvedValue({ rank: { best_score: 100 } })
      const gameContext = { foodEaten: 3, startedAt: 1710000000000 }

      const { handleGameOver, lastGameContext } = useGameSession()
      await expect(handleGameOver(100, 1.5, 2.0, gameContext)).resolves.toBeUndefined()

      expect(lastGameContext.value).toEqual(gameContext)
      expect(api.leaderboard.submitScore).toHaveBeenCalledWith(null, 100, 1.5, 2.0, expect.any(String), null)
    })

    it('should handle score submission failure with token error', async () => {
      useAuthStore.mockReturnValue({ user: { id: '123' } })
      api.leaderboard.submitScore.mockRejectedValue(new Error('Invalid or expired token'))

      const { submitStatus, submitMessage, handleGameOver } = useGameSession()
      await handleGameOver(100, 1.5, 2.0)

      expect(submitStatus.value).toBe('error')
      expect(submitMessage.value).toBe('登录已过期，分数未保存，请重新登录')
    })

    it('should handle generic score submission failure', async () => {
      useAuthStore.mockReturnValue({ user: { id: '123' } })
      api.leaderboard.submitScore.mockRejectedValue(new Error('Server error'))

      const { submitStatus, submitMessage, handleGameOver } = useGameSession()
      await handleGameOver(100, 1.5, 2.0)

      expect(submitStatus.value).toBe('error')
      expect(submitMessage.value).toBe('分数提交失败：Server error')
    })

    it('should clear submitStatus after 3 seconds', async () => {
      vi.useFakeTimers()
      useAuthStore.mockReturnValue({ user: { id: '123' } })
      api.leaderboard.submitScore.mockResolvedValue({})
      api.leaderboard.getMyRank.mockResolvedValue({})

      const { submitStatus, handleGameOver } = useGameSession()
      await handleGameOver(100, 1.0, 1.0)

      expect(submitStatus.value).toBe('success')

      vi.advanceTimersByTime(3000)
      expect(submitStatus.value).toBe('')

      vi.useRealTimers()
    })

    it('should clear previous timer when called again', async () => {
      vi.useFakeTimers()
      useAuthStore.mockReturnValue({ user: { id: '123' } })
      api.leaderboard.submitScore.mockResolvedValue({})
      api.leaderboard.getMyRank.mockResolvedValue({})

      const { submitStatus, handleGameOver } = useGameSession()

      await handleGameOver(100, 1.0, 1.0)
      expect(submitStatus.value).toBe('success')

      // Call again before 3s timer fires
      vi.advanceTimersByTime(1000)
      api.leaderboard.submitScore.mockRejectedValue(new Error('fail'))
      await handleGameOver(200, 1.0, 1.0)
      expect(submitStatus.value).toBe('error')

      // Original 3s timer should not reset status (it was cleared)
      vi.advanceTimersByTime(2000)
      expect(submitStatus.value).toBe('error')

      // New 3s timer fires at 3000ms after second call
      vi.advanceTimersByTime(1000)
      expect(submitStatus.value).toBe('')

      vi.useRealTimers()
    })
  })

  describe('fetchBestScore()', () => {
    it('should set bestScore to null when not authenticated', async () => {
      useAuthStore.mockReturnValue({ user: null })

      const { bestScore, fetchBestScore } = useGameSession()
      await fetchBestScore()
      expect(bestScore.value).toBeNull()
    })

    it('should fetch best score from API when authenticated', async () => {
      useAuthStore.mockReturnValue({ user: { id: '123' } })
      api.leaderboard.getMyRank.mockResolvedValue({ rank: { best_score: 500 } })

      const { bestScore, fetchBestScore } = useGameSession()
      await fetchBestScore()
      expect(bestScore.value).toBe(500)
    })

    it('should set bestScore to null when API returns no rank', async () => {
      useAuthStore.mockReturnValue({ user: { id: '123' } })
      api.leaderboard.getMyRank.mockResolvedValue({})

      const { bestScore, fetchBestScore } = useGameSession()
      await fetchBestScore()
      expect(bestScore.value).toBeNull()
    })

    it('should set bestScore to null when API fails', async () => {
      useAuthStore.mockReturnValue({ user: { id: '123' } })
      api.leaderboard.getMyRank.mockRejectedValue(new Error('Network error'))

      const { bestScore, fetchBestScore } = useGameSession()
      await fetchBestScore()
      expect(bestScore.value).toBeNull()
    })
  })

  describe('clearSubmitStatus()', () => {
    it('should clear status and cancel pending timer', async () => {
      vi.useFakeTimers()
      useAuthStore.mockReturnValue({ user: { id: '123' } })
      api.leaderboard.submitScore.mockResolvedValue({})
      api.leaderboard.getMyRank.mockResolvedValue({})

      const { submitStatus, handleGameOver, clearSubmitStatus } = useGameSession()
      await handleGameOver(100, 1.0, 1.0)
      expect(submitStatus.value).toBe('success')

      clearSubmitStatus()
      expect(submitStatus.value).toBe('')

      // Timer should have been cancelled, advancing time should not change anything
      vi.advanceTimersByTime(3000)
      expect(submitStatus.value).toBe('')

      vi.useRealTimers()
    })
  })

  describe('playAgain()', () => {
    it('should reset lastGameScore and start new game', async () => {
      useAuthStore.mockReturnValue({ user: null })

      const { lastGameScore, playAgain } = useGameSession({ snakeGameRef: mockSnakeGame })
      lastGameScore.value = 100

      await playAgain()

      expect(lastGameScore.value).toBeNull()
      expect(mockSnakeGame.startGame).toHaveBeenCalled()
    })
  })

  describe('updateScore()', () => {
    it('updates currentScore to given value', () => {
      const { currentScore, updateScore } = useGameSession()
      updateScore(42)
      expect(currentScore.value).toBe(42)
    })

    it('reflects latest value on multiple calls', () => {
      const { currentScore, updateScore } = useGameSession()
      updateScore(5)
      updateScore(10)
      updateScore(7)
      expect(currentScore.value).toBe(7)
    })

    it('remains effective after startGame', () => {
      useAuthStore.mockReturnValue({ user: null })
      const { currentScore, startGame, updateScore } = useGameSession({ snakeGameRef: mockSnakeGame })
      startGame()
      updateScore(15)
      expect(currentScore.value).toBe(15)
    })
  })
})
