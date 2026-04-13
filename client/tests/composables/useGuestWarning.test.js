import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush
  }))
}))

describe('useGuestWarning', () => {
  const originalLocalStorage = global.localStorage
  let localStorageMock

  beforeEach(() => {
    localStorageMock = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    }
    global.localStorage = localStorageMock
    vi.clearAllMocks()
  })

  afterEach(() => {
    global.localStorage = originalLocalStorage
    vi.restoreAllMocks()
  })

  describe('checkGuestWarning()', () => {
    it('should show warning when guestWarningSeen is not in localStorage', async () => {
      const { useGuestWarning } = await import('../../src/composables/useGuestWarning.js')
      const { showGuestWarning, checkGuestWarning } = useGuestWarning()
      checkGuestWarning()
      expect(showGuestWarning.value).toBe(true)
    })

    it('should not show warning when guestWarningSeen is already set', async () => {
      localStorageMock.getItem.mockReturnValue('true')
      const { useGuestWarning } = await import('../../src/composables/useGuestWarning.js')
      const { showGuestWarning, checkGuestWarning } = useGuestWarning()
      checkGuestWarning()
      expect(showGuestWarning.value).toBe(false)
    })

    it('should not show warning if already seen in memory', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      const { useGuestWarning } = await import('../../src/composables/useGuestWarning.js')
      const { showGuestWarning, checkGuestWarning, markGuestWarningSeen } = useGuestWarning()
      markGuestWarningSeen()
      checkGuestWarning()
      expect(showGuestWarning.value).toBe(false)
    })
  })

  describe('markGuestWarningSeen()', () => {
    it('should set guestWarningSeen in localStorage', async () => {
      const { useGuestWarning } = await import('../../src/composables/useGuestWarning.js')
      const { markGuestWarningSeen } = useGuestWarning()
      markGuestWarningSeen()
      expect(localStorageMock.setItem).toHaveBeenCalledWith('guestWarningSeen', 'true')
    })

    it('should set hasSeenGuestWarning to true', async () => {
      const { useGuestWarning } = await import('../../src/composables/useGuestWarning.js')
      const { hasSeenGuestWarning, markGuestWarningSeen } = useGuestWarning()
      markGuestWarningSeen()
      expect(hasSeenGuestWarning.value).toBe(true)
    })
  })

  describe('continueAsGuest()', () => {
    it('should hide the warning', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      const { useGuestWarning } = await import('../../src/composables/useGuestWarning.js')
      const { showGuestWarning, checkGuestWarning, continueAsGuest } = useGuestWarning()
      checkGuestWarning()
      expect(showGuestWarning.value).toBe(true)
      continueAsGuest()
      expect(showGuestWarning.value).toBe(false)
    })

    it('should mark warning as seen', async () => {
      const { useGuestWarning } = await import('../../src/composables/useGuestWarning.js')
      const { hasSeenGuestWarning, continueAsGuest } = useGuestWarning()
      continueAsGuest()
      expect(hasSeenGuestWarning.value).toBe(true)
    })
  })

  describe('goToLogin()', () => {
    it('should navigate to /login', async () => {
      const { useGuestWarning } = await import('../../src/composables/useGuestWarning.js')
      const { goToLogin } = useGuestWarning()
      goToLogin()
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('should hide the warning', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      const { useGuestWarning } = await import('../../src/composables/useGuestWarning.js')
      const { showGuestWarning, checkGuestWarning, goToLogin } = useGuestWarning()
      checkGuestWarning()
      expect(showGuestWarning.value).toBe(true)
      goToLogin()
      expect(showGuestWarning.value).toBe(false)
    })

    it('should mark warning as seen', async () => {
      const { useGuestWarning } = await import('../../src/composables/useGuestWarning.js')
      const { hasSeenGuestWarning, goToLogin } = useGuestWarning()
      goToLogin()
      expect(hasSeenGuestWarning.value).toBe(true)
    })
  })
})
