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
  let useGuestWarning

  beforeEach(async () => {
    vi.resetModules()
    localStorageMock = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    }
    global.localStorage = localStorageMock
    vi.clearAllMocks()

    const mod = await import('../../src/composables/useGuestWarning.js')
    useGuestWarning = mod.useGuestWarning
  })

  afterEach(() => {
    global.localStorage = originalLocalStorage
    vi.restoreAllMocks()
  })

  describe('checkGuestWarning()', () => {
    it('should show warning when guestWarningSeen is not in localStorage', () => {
      const { showGuestWarning, checkGuestWarning } = useGuestWarning()
      checkGuestWarning()
      expect(showGuestWarning.value).toBe(true)
    })

    it('should not show warning when guestWarningSeen is already set', () => {
      localStorageMock.getItem.mockReturnValue('true')
      const { showGuestWarning, checkGuestWarning } = useGuestWarning()
      checkGuestWarning()
      expect(showGuestWarning.value).toBe(false)
    })

    it('should not show warning if already seen in memory', () => {
      localStorageMock.getItem.mockReturnValue(null)
      const { showGuestWarning, checkGuestWarning, markGuestWarningSeen } = useGuestWarning()
      markGuestWarningSeen()
      checkGuestWarning()
      expect(showGuestWarning.value).toBe(false)
    })
  })

  describe('markGuestWarningSeen()', () => {
    it('should set guestWarningSeen in localStorage', () => {
      const { markGuestWarningSeen } = useGuestWarning()
      markGuestWarningSeen()
      expect(localStorageMock.setItem).toHaveBeenCalledWith('guestWarningSeen', 'true')
    })

    it('should set hasSeenGuestWarning to true', () => {
      const { hasSeenGuestWarning, markGuestWarningSeen } = useGuestWarning()
      markGuestWarningSeen()
      expect(hasSeenGuestWarning.value).toBe(true)
    })
  })

  describe('continueAsGuest()', () => {
    it('should hide the warning', () => {
      localStorageMock.getItem.mockReturnValue(null)
      const { showGuestWarning, checkGuestWarning, continueAsGuest } = useGuestWarning()
      checkGuestWarning()
      expect(showGuestWarning.value).toBe(true)
      continueAsGuest()
      expect(showGuestWarning.value).toBe(false)
    })

    it('should mark warning as seen', () => {
      const { hasSeenGuestWarning, continueAsGuest } = useGuestWarning()
      continueAsGuest()
      expect(hasSeenGuestWarning.value).toBe(true)
    })
  })

  describe('goToLogin()', () => {
    it('should navigate to /login', () => {
      const { goToLogin } = useGuestWarning()
      goToLogin()
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('should hide the warning', () => {
      localStorageMock.getItem.mockReturnValue(null)
      const { showGuestWarning, checkGuestWarning, goToLogin } = useGuestWarning()
      checkGuestWarning()
      expect(showGuestWarning.value).toBe(true)
      goToLogin()
      expect(showGuestWarning.value).toBe(false)
    })

    it('should mark warning as seen', () => {
      const { hasSeenGuestWarning, goToLogin } = useGuestWarning()
      goToLogin()
      expect(hasSeenGuestWarning.value).toBe(true)
    })
  })
})
