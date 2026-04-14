import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GameSidebar from '../../../src/components/game/GameSidebar.vue'

// Presentational component — only test conditional branches that represent
// real business rules. Pure template rendering is covered by E2E.

describe('GameSidebar', () => {
  describe('best score visibility', () => {
    it('shows formatted best score when logged in', () => {
      const wrapper = mount(GameSidebar, {
        props: { isLoggedIn: true, bestScore: 5000 }
      })
      expect(wrapper.find('.best-score-value').text()).toBe((5000).toLocaleString())
    })

    it('shows -- when logged in but bestScore is null', () => {
      const wrapper = mount(GameSidebar, {
        props: { isLoggedIn: true, bestScore: null }
      })
      expect(wrapper.find('.best-score-value').text()).toBe('--')
    })

    it('hides best score section when not logged in', () => {
      const wrapper = mount(GameSidebar, {
        props: { isLoggedIn: false, bestScore: 5000 }
      })
      expect(wrapper.find('.best-score-value').exists()).toBe(false)
    })
  })
})
