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

  /**
   * Play a short 8-bit style "eat food" sound.
   * Synthesizes a quick ascending chirp (~150ms).
   */
  function playEat() {
    if (!soundEnabled.value) return

    try {
      const ctx = getAudioContext()
      if (ctx.state === 'suspended') ctx.resume()

      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()

      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(440, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08)

      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)

      oscillator.connect(gain)
      gain.connect(ctx.destination)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.15)
    } catch {
      // Audio context may be blocked; silently ignore.
    }
  }

  return { soundEnabled, toggle, playEat }
}
