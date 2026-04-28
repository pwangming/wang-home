import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SnakeGame from '../../../src/components/game/SnakeGame.vue'
import { FOOD_TYPES } from '../../../src/lib/food.js'
import { useSkinStore } from '../../../src/stores/skin.js'

// jsdom does not provide ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

describe('SnakeGame', () => {
  let fillStyles
  let gradientStops

  beforeEach(() => {
    setActivePinia(createPinia())
    fillStyles = []
    gradientStops = []

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      strokeStyle: '',
      lineWidth: 0,
      shadowColor: '',
      shadowBlur: 0,
      set fillStyle(value) {
        fillStyles.push(value)
      },
      get fillStyle() {
        return fillStyles[fillStyles.length - 1]
      },
      font: '',
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      roundRect: vi.fn(),
      fillText: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn((offset, color) => gradientStops.push([offset, color]))
      }))
    }))
  })

  it('emits scoreUpdate when internal score changes', async () => {
    const wrapper = mount(SnakeGame, {
      props: { speedMultiplier: 1, scoreMultiplier: 1 }
    })
    // Trigger internal score change
    wrapper.vm.score = 5
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('scoreUpdate')).toBeTruthy()
    expect(wrapper.emitted('scoreUpdate')[0]).toEqual([5])
    wrapper.unmount()
  })

  it('emits eatFood with a normal food payload', async () => {
    const wrapper = mount(SnakeGame, {
      props: { speedMultiplier: 1, scoreMultiplier: 1.5 }
    })

    wrapper.vm.handleEatFood()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('eatFood')).toBeTruthy()
    expect(wrapper.emitted('eatFood')[0]).toEqual([{ type: 'normal', score: 2, inGhost: false }])
    expect(wrapper.emitted('playSound')[0]).toEqual(['normal'])
    expect(wrapper.emitted('scoreUpdate')[0]).toEqual([2])
    wrapper.unmount()
  })

  it('scores special food with the current score multiplier', async () => {
    const wrapper = mount(SnakeGame, {
      props: { speedMultiplier: 1, scoreMultiplier: 2 }
    })

    wrapper.vm.food = { x: 0, y: 0, type: FOOD_TYPES.COIN }
    wrapper.vm.handleEatFood()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('eatFood')[0]).toEqual([{ type: 'coin', score: 10, inGhost: false }])
    expect(wrapper.emitted('playSound')[0]).toEqual(['coin'])
    expect(wrapper.emitted('scoreUpdate')[0]).toEqual([10])
    wrapper.unmount()
  })

  it('applies and clears the slow speed buff', async () => {
    vi.useFakeTimers()
    const wrapper = mount(SnakeGame, {
      props: { speedMultiplier: 1, scoreMultiplier: 1 }
    })

    wrapper.vm.food = { x: 0, y: 0, type: FOOD_TYPES.SLOW }
    wrapper.vm.handleEatFood()
    expect(wrapper.vm.activeSpeedBuff).toBe(0.6)

    vi.advanceTimersByTime(5000)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.activeSpeedBuff).toBe(1)

    wrapper.unmount()
    vi.useRealTimers()
  })

  it('allows wall wrapping while ghost mode is active', () => {
    const wrapper = mount(SnakeGame, {
      props: { speedMultiplier: 1, scoreMultiplier: 1 }
    })

    wrapper.vm.canvasSize = 400
    wrapper.vm.snake = [{ x: 0, y: 0 }]
    wrapper.vm.food = { x: 100, y: 100, type: FOOD_TYPES.NORMAL }
    wrapper.vm.direction = 'left'
    wrapper.vm.isGameRunning = true
    wrapper.vm.isGhost = true

    wrapper.vm.tick()

    expect(wrapper.emitted('gameOver')).toBeFalsy()
    expect(wrapper.vm.snake[0]).toEqual({ x: 380, y: 0 })
    wrapper.unmount()
  })

  it('draws with the active skin colors', () => {
    const skinStore = useSkinStore()
    skinStore.setActive('retro')
    const wrapper = mount(SnakeGame, {
      props: { speedMultiplier: 1, scoreMultiplier: 1 }
    })

    wrapper.vm.snake = [
      { x: 40, y: 40 },
      { x: 20, y: 40 }
    ]
    wrapper.vm.food = { x: 80, y: 80, type: FOOD_TYPES.COIN }
    wrapper.vm.draw()

    expect(fillStyles).toContain('#000000')
    expect(fillStyles).toContain('#ccff00')
    expect(fillStyles).toContain('#76ff03')
    expect(gradientStops).toContainEqual([0, '#ffeb3b'])
    expect(gradientStops).toContainEqual([1, '#ffeb3b'])

    wrapper.unmount()
  })
})
