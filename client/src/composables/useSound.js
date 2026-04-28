import { ref } from 'vue'

const STORAGE_KEY = 'soundEnabled'
let audioCtx = null

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioCtx
}

/**
 * Composable for playing game sound effects using Web Audio API.
 * Persists on/off preference in localStorage, defaults to enabled.
 */
export function useSound() {
  const soundEnabled = ref(localStorage.getItem(STORAGE_KEY) !== 'false')

  function toggle() {
    soundEnabled.value = !soundEnabled.value
    localStorage.setItem(STORAGE_KEY, soundEnabled.value)
  }

  function playTone({ wave = 'sine', from, to = from, duration = 0.15, volume = 0.1, delay = 0 }) {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') ctx.resume()
    const startAt = ctx.currentTime + delay

    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.type = wave
    oscillator.frequency.setValueAtTime(from, startAt)
    if (to !== from) {
      oscillator.frequency.exponentialRampToValueAtTime(to, startAt + duration * 0.55)
    }

    gain.gain.setValueAtTime(volume, startAt)
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration)

    oscillator.connect(gain)
    gain.connect(ctx.destination)

    oscillator.start(startAt)
    oscillator.stop(startAt + duration)
  }

  function playCoin() {
    const frequencies = [880, 1320, 1760]
    frequencies.forEach((frequency, index) => {
      playTone({ wave: 'sine', from: frequency, duration: 0.1, volume: 0.1, delay: index * 0.055 })
    })
  }

  function playSlow() {
    playTone({ wave: 'sine', from: 220, to: 150, duration: 0.3, volume: 0.09 })
  }

  function playGhost() {
    playTone({ wave: 'sawtooth', from: 1000, to: 220, duration: 0.25, volume: 0.07 })
  }

  function playDiamond() {
    const frequencies = [523.25, 659.25, 783.99]
    frequencies.forEach((frequency) => {
      playTone({ wave: 'triangle', from: frequency, to: frequency * 1.5, duration: 0.4, volume: 0.07 })
    })
  }

  function playNormal() {
    playTone({ wave: 'square', from: 440, to: 880, duration: 0.15, volume: 0.12 })
  }

  function playSound(type = 'normal') {
    if (!soundEnabled.value) return

    try {
      switch (type) {
        case 'coin':
          playCoin()
          break
        case 'slow':
          playSlow()
          break
        case 'ghost':
          playGhost()
          break
        case 'diamond':
          playDiamond()
          break
        case 'normal':
        default:
          playNormal()
      }
    } catch {
      // Audio context may be blocked; silently ignore.
    }
  }

  /**
   * Play a short 8-bit style "eat food" sound.
   * Synthesizes a quick ascending chirp (~150ms).
   */
  function playEat() {
    playSound('normal')
  }

  return { soundEnabled, toggle, playEat, playSound }
}
