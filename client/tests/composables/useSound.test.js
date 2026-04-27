import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useSound } from '../../src/composables/useSound.js'

// Store original localStorage
const originalLocalStorage = global.localStorage

describe('useSound', () => {
  function createAudioMock() {
    const oscillators = []
    const gains = []
    const mockCtx = {
      state: 'running',
      currentTime: 0,
      createOscillator: vi.fn(() => {
        const oscillator = {
          type: 'sine',
          frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn()
        }
        oscillators.push(oscillator)
        return oscillator
      }),
      createGain: vi.fn(() => {
        const gain = {
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn()
        }
        gains.push(gain)
        return gain
      }),
      destination: 'audioDestination',
      resume: vi.fn()
    }

    return { mockCtx, oscillators, gains }
  }

  beforeEach(() => {
    // Create a fresh localStorage mock for each test
    const store = {}
    global.localStorage = {
      getItem: vi.fn((key) => store[key] ?? null),
      setItem: vi.fn((key, value) => { store[key] = value }),
      removeItem: vi.fn((key) => { delete store[key] })
    }
  })

  afterEach(() => {
    global.localStorage = originalLocalStorage
    vi.restoreAllMocks()
  })

  describe('soundEnabled', () => {
    it('should default to enabled when no localStorage value', () => {
      const { soundEnabled } = useSound()
      expect(soundEnabled.value).toBe(true)
    })

    it('should be enabled when localStorage has "true"', () => {
      global.localStorage.getItem = vi.fn(() => 'true')
      const { soundEnabled } = useSound()
      expect(soundEnabled.value).toBe(true)
    })

    it('should be disabled when localStorage has "false"', () => {
      global.localStorage.getItem = vi.fn(() => 'false')
      const { soundEnabled } = useSound()
      expect(soundEnabled.value).toBe(false)
    })
  })

  describe('toggle()', () => {
    it('should toggle from enabled to disabled', () => {
      global.localStorage.getItem = vi.fn(() => 'true')
      const { soundEnabled, toggle } = useSound()
      expect(soundEnabled.value).toBe(true)
      toggle()
      expect(soundEnabled.value).toBe(false)
      expect(global.localStorage.setItem).toHaveBeenCalledWith('soundEnabled', false)
    })

    it('should toggle from disabled to enabled', () => {
      global.localStorage.getItem = vi.fn(() => 'false')
      const { soundEnabled, toggle } = useSound()
      expect(soundEnabled.value).toBe(false)
      toggle()
      expect(soundEnabled.value).toBe(true)
      expect(global.localStorage.setItem).toHaveBeenCalledWith('soundEnabled', true)
    })
  })

  describe('playEat()', () => {
    it('should not play when sound is disabled', () => {
      global.localStorage.getItem = vi.fn(() => 'false')
      const { soundEnabled, playEat } = useSound()
      expect(soundEnabled.value).toBe(false)
      // Should not throw
      expect(() => playEat()).not.toThrow()
    })

    it('should call AudioContext methods when sound is enabled', () => {
      global.localStorage.getItem = vi.fn(() => 'true')

      const mockOscillator = {
        type: 'square',
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
      }
      const mockGain = {
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn()
      }
      const mockCtx = {
        state: 'running',
        currentTime: 0,
        createOscillator: vi.fn(() => mockOscillator),
        createGain: vi.fn(() => mockGain),
        destination: 'audioDestination',
        resume: vi.fn()
      }

      const origAudioContext = window.AudioContext
      window.AudioContext = vi.fn(() => mockCtx)

      const { playEat } = useSound()
      playEat()

      expect(mockCtx.createOscillator).toHaveBeenCalled()
      expect(mockCtx.createGain).toHaveBeenCalled()
      expect(mockOscillator.connect).toHaveBeenCalledWith(mockGain)
      expect(mockGain.connect).toHaveBeenCalledWith(mockCtx.destination)
      expect(mockOscillator.start).toHaveBeenCalledWith(0)
      expect(mockOscillator.stop).toHaveBeenCalledWith(0.15)

      window.AudioContext = origAudioContext
    })
  })

  describe('playSound()', () => {
    it('should not create audio nodes when sound is disabled', async () => {
      vi.resetModules()
      global.localStorage.getItem = vi.fn(() => 'false')
      const mockCtx = {
        state: 'running',
        currentTime: 0,
        createOscillator: vi.fn(),
        createGain: vi.fn(),
        destination: 'audioDestination',
        resume: vi.fn()
      }
      const origAudioContext = window.AudioContext
      window.AudioContext = vi.fn(() => mockCtx)
      const { useSound: freshUseSound } = await import('../../src/composables/useSound.js')

      const { playSound } = freshUseSound()
      playSound('coin')

      expect(mockCtx.createOscillator).not.toHaveBeenCalled()
      window.AudioContext = origAudioContext
    })

    it('should dispatch diamond to multiple synthesized tones', async () => {
      vi.resetModules()
      global.localStorage.getItem = vi.fn(() => 'true')
      const mockOscillator = {
        type: 'triangle',
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
      }
      const mockGain = {
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn()
      }
      const mockCtx = {
        state: 'running',
        currentTime: 0,
        createOscillator: vi.fn(() => mockOscillator),
        createGain: vi.fn(() => mockGain),
        destination: 'audioDestination',
        resume: vi.fn()
      }
      const origAudioContext = window.AudioContext
      window.AudioContext = vi.fn(() => mockCtx)
      const { useSound: freshUseSound } = await import('../../src/composables/useSound.js')

      const { playSound } = freshUseSound()
      playSound('diamond')

      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3)
      expect(mockOscillator.start).toHaveBeenCalledTimes(3)
      window.AudioContext = origAudioContext
    })

    it.each([
      ['coin', 3, ['sine', 'sine', 'sine']],
      ['slow', 1, ['sine']],
      ['ghost', 1, ['sawtooth']]
    ])('should dispatch %s to the expected synthesized tones', async (type, toneCount, waveTypes) => {
      vi.resetModules()
      global.localStorage.getItem = vi.fn(() => 'true')
      const { mockCtx, oscillators } = createAudioMock()
      const origAudioContext = window.AudioContext
      window.AudioContext = vi.fn(() => mockCtx)
      const { useSound: freshUseSound } = await import('../../src/composables/useSound.js')

      const { playSound } = freshUseSound()
      playSound(type)

      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(toneCount)
      expect(oscillators.map(oscillator => oscillator.type)).toEqual(waveTypes)
      expect(oscillators.every(oscillator => oscillator.start.mock.calls.length === 1)).toBe(true)
      window.AudioContext = origAudioContext
    })
  })
})
