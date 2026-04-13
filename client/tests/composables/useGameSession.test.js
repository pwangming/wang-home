import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock api
vi.mock('../../src/lib/api.js', () => ({
  api: {
    leaderboard: {
      startSession: vi.fn(),
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

  beforeEach(() => {
    setActivePinia(createPinia())
    mockSnakeGame = { startGame: vi.fn() }
    vi.clearAllMocks()
    localStorageMock = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    }
    global.localStorage = localStorageMock
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('selectedSpeed', () => {
    it('should default to 1.0 when no localStorage value', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { selectedSpeed } = useGameSession()
      expect(selectedSpeed.value).toBe(1.0)
    })

    it('should load valid speed from localStorage', async () => {
      localStorageMock.getItem.mockReturnValue('1.5')
      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { selectedSpeed } = useGameSession()
      expect(selectedSpeed.value).toBe(1.5)
    })

    it('should fall back to 1.0 for invalid localStorage value', async () => {
      localStorageMock.getItem.mockReturnValue('invalid')
      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { selectedSpeed } = useGameSession()
      expect(selectedSpeed.value).toBe(1.0)
    })

    it('should fall back to 1.0 when localStorage has unsupported speed', async () => {
      localStorageMock.getItem.mockReturnValue('5.0')
      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { selectedSpeed } = useGameSession()
      expect(selectedSpeed.value).toBe(1.0)
    })
  })

  describe('currentScoreMultiplier', () => {
    it('should return correct multiplier for 1.0x', async () => {
      localStorageMock.getItem.mockReturnValue('1.0')
      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { currentScoreMultiplier } = useGameSession()
      expect(currentScoreMultiplier.value).toBe(1.0)
    })

    it('should return correct multiplier for 1.2x', async () => {
      localStorageMock.getItem.mockReturnValue('1.2')
      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { currentScoreMultiplier } = useGameSession()
      expect(currentScoreMultiplier.value).toBe(1.5)
    })

    it('should return correct multiplier for 1.5x', async () => {
      localStorageMock.getItem.mockReturnValue('1.5')
      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { currentScoreMultiplier } = useGameSession()
      expect(currentScoreMultiplier.value).toBe(2.0)
    })

    it('should return correct multiplier for 2.0x', async () => {
      localStorageMock.getItem.mockReturnValue('2.0')
      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { currentScoreMultiplier } = useGameSession()
      expect(currentScoreMultiplier.value).toBe(3.0)
    })
  })

  describe('startGame()', () => {
    it('should start game when not authenticated', async () => {
      const { useAuthStore } = await import('../../src/stores/auth.js')
      useAuthStore.mockReturnValue({ user: null })
      const { api } = await import('../../src/lib/api.js')

      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { isPlaying, startGame, setSnakeGameRef } = useGameSession()
      setSnakeGameRef(mockSnakeGame)

      await startGame()

      expect(isPlaying.value).toBe(true)
      expect(mockSnakeGame.startGame).toHaveBeenCalled()
      expect(api.leaderboard.startSession).not.toHaveBeenCalled()
    })

    it('should call startSession API when authenticated', async () => {
      const { useAuthStore } = await import('../../src/stores/auth.js')
      useAuthStore.mockReturnValue({ user: { id: '123' } })
      const { api } = await import('../../src/lib/api.js')
      api.leaderboard.startSession.mockResolvedValue({})

      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { isPlaying, startGame, setSnakeGameRef } = useGameSession()
      setSnakeGameRef(mockSnakeGame)

      await startGame()

      expect(isPlaying.value).toBe(true)
      expect(api.leaderboard.startSession).toHaveBeenCalled()
    })

    it('should start game even if session start fails', async () => {
      const { useAuthStore } = await import('../../src/stores/auth.js')
      useAuthStore.mockReturnValue({ user: { id: '123' } })
      const { api } = await import('../../src/lib/api.js')
      api.leaderboard.startSession.mockRejectedValue(new Error('Network error'))

      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { isPlaying, startGame, setSnakeGameRef } = useGameSession()
      setSnakeGameRef(mockSnakeGame)

      await startGame()

      expect(isPlaying.value).toBe(true)
    })
  })

  describe('handleGameOver()', () => {
    it('should show warning message when user is not authenticated', async () => {
      const { useAuthStore } = await import('../../src/stores/auth.js')
      useAuthStore.mockReturnValue({ user: null })

      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { isPlaying, handleGameOver } = useGameSession()
      await handleGameOver(100, 1.5, 2.0)

      expect(mockWarning).toHaveBeenCalledWith('未登录状态下分数不会被记录')
      expect(isPlaying.value).toBe(false)
    })

    it('should submit score when user is authenticated', async () => {
      const { useAuthStore } = await import('../../src/stores/auth.js')
      useAuthStore.mockReturnValue({ user: { id: '123' } })
      const { api } = await import('../../src/lib/api.js')
      api.leaderboard.submitScore.mockResolvedValue({})

      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { submitStatus, handleGameOver } = useGameSession()
      await handleGameOver(100, 1.5, 2.0)

      expect(submitStatus.value).toBe('success')
      expect(api.leaderboard.submitScore).toHaveBeenCalledWith(null, 100, 1.5, 2.0, expect.any(String), null)
    })

    it('should handle score submission failure with token error', async () => {
      const { useAuthStore } = await import('../../src/stores/auth.js')
      useAuthStore.mockReturnValue({ user: { id: '123' } })
      const { api } = await import('../../src/lib/api.js')
      api.leaderboard.submitScore.mockRejectedValue(new Error('Invalid or expired token'))

      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { submitStatus, submitMessage, handleGameOver } = useGameSession()
      await handleGameOver(100, 1.5, 2.0)

      expect(submitStatus.value).toBe('error')
      expect(submitMessage.value).toBe('登录已过期，分数未保存，请重新登录')
    })

    it('should handle generic score submission failure', async () => {
      const { useAuthStore } = await import('../../src/stores/auth.js')
      useAuthStore.mockReturnValue({ user: { id: '123' } })
      const { api } = await import('../../src/lib/api.js')
      api.leaderboard.submitScore.mockRejectedValue(new Error('Server error'))

      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { submitStatus, submitMessage, handleGameOver } = useGameSession()
      await handleGameOver(100, 1.5, 2.0)

      expect(submitStatus.value).toBe('error')
      expect(submitMessage.value).toBe('分数提交失败：Server error')
    })
  })

  describe('fetchBestScore()', () => {
    it('should set bestScore to null when not authenticated', async () => {
      const { useAuthStore } = await import('../../src/stores/auth.js')
      useAuthStore.mockReturnValue({ user: null })

      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { bestScore, fetchBestScore } = useGameSession()
      await fetchBestScore()
      expect(bestScore.value).toBeNull()
    })

    it('should fetch best score from API when authenticated', async () => {
      const { useAuthStore } = await import('../../src/stores/auth.js')
      useAuthStore.mockReturnValue({ user: { id: '123' } })
      const { api } = await import('../../src/lib/api.js')
      api.leaderboard.getMyRank.mockResolvedValue({ rank: { best_score: 500 } })

      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { bestScore, fetchBestScore } = useGameSession()
      await fetchBestScore()
      expect(bestScore.value).toBe(500)
    })

    it('should set bestScore to null when API returns no rank', async () => {
      const { useAuthStore } = await import('../../src/stores/auth.js')
      useAuthStore.mockReturnValue({ user: { id: '123' } })
      const { api } = await import('../../src/lib/api.js')
      api.leaderboard.getMyRank.mockResolvedValue({})

      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { bestScore, fetchBestScore } = useGameSession()
      await fetchBestScore()
      expect(bestScore.value).toBeNull()
    })

    it('should set bestScore to null when API fails', async () => {
      const { useAuthStore } = await import('../../src/stores/auth.js')
      useAuthStore.mockReturnValue({ user: { id: '123' } })
      const { api } = await import('../../src/lib/api.js')
      api.leaderboard.getMyRank.mockRejectedValue(new Error('Network error'))

      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { bestScore, fetchBestScore } = useGameSession()
      await fetchBestScore()
      expect(bestScore.value).toBeNull()
    })
  })

  describe('playAgain()', () => {
    it('should reset lastGameScore and start new game', async () => {
      const { useAuthStore } = await import('../../src/stores/auth.js')
      useAuthStore.mockReturnValue({ user: null })

      const { useGameSession } = await import('../../src/composables/useGameSession.js')
      const { lastGameScore, playAgain, setSnakeGameRef } = useGameSession()
      lastGameScore.value = 100
      setSnakeGameRef(mockSnakeGame)

      await playAgain()

      expect(lastGameScore.value).toBeNull()
      expect(mockSnakeGame.startGame).toHaveBeenCalled()
    })
  })
})
