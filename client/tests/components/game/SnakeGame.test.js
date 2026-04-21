import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SnakeGame from '../../../src/components/game/SnakeGame.vue'

// jsdom does not provide ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

describe('SnakeGame', () => {
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
})
