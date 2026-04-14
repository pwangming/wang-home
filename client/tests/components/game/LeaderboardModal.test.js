import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// Focus: data normalization (匿名玩家 fallback, isMine, rank icons) and fetch
// error handling. Skip pure template rendering and emit plumbing.

const { mockList, mockGetMyRank } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGetMyRank: vi.fn()
}))

vi.mock('../../../src/lib/api.js', () => ({
  api: {
    leaderboard: {
      list: mockList,
      getMyRank: mockGetMyRank
    }
  }
}))

const { mockUseAuthStore } = vi.hoisted(() => ({
  mockUseAuthStore: vi.fn()
}))

vi.mock('../../../src/stores/auth.js', () => ({
  useAuthStore: mockUseAuthStore
}))

vi.mock('naive-ui', () => ({
  NModal: {
    props: ['show'],
    template: '<div v-if="show" class="n-modal"><slot /></div>'
  }
}))

import LeaderboardModal from '../../../src/components/game/LeaderboardModal.vue'

function mountModal(props = { show: false }) {
  setActivePinia(createPinia())
  return mount(LeaderboardModal, { props })
}

describe('LeaderboardModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuthStore.mockReturnValue({ user: { id: 'user-1' } })
    mockList.mockResolvedValue({ leaderboard: [] })
    mockGetMyRank.mockResolvedValue({ rank: null })
  })

  describe('data fetching', () => {
    it('fetches leaderboard when opened', async () => {
      const wrapper = mountModal({ show: false })
      await wrapper.setProps({ show: true })
      await flushPromises()
      expect(mockList).toHaveBeenCalledWith(1, 20)
      expect(mockGetMyRank).toHaveBeenCalled()
    })

    it('does not fetch when show is false', async () => {
      mountModal({ show: false })
      await flushPromises()
      expect(mockList).not.toHaveBeenCalled()
    })

    it('clears entries when both fetches fail', async () => {
      mockList.mockRejectedValue(new Error('network'))
      mockGetMyRank.mockRejectedValue(new Error('network'))
      const wrapper = mountModal({ show: false })
      await wrapper.setProps({ show: true })
      await flushPromises()
      expect(wrapper.findAll('.table-row')).toHaveLength(0)
    })

    it('tolerates getMyRank failing without breaking list', async () => {
      mockList.mockResolvedValue({
        leaderboard: [{ user_id: 'a', username: 'Alice', best_score: 100 }]
      })
      mockGetMyRank.mockRejectedValue(new Error('no rank'))
      const wrapper = mountModal({ show: false })
      await wrapper.setProps({ show: true })
      await flushPromises()
      expect(wrapper.text()).toContain('Alice')
    })
  })

  describe('row normalization', () => {
    it('falls back to 匿名玩家 when username is missing', async () => {
      mockList.mockResolvedValue({
        leaderboard: [{ user_id: 'x', username: null, best_score: 100 }]
      })
      const wrapper = mountModal({ show: false })
      await wrapper.setProps({ show: true })
      await flushPromises()
      expect(wrapper.text()).toContain('匿名玩家')
    })

    it('marks current user row as highlighted when logged in', async () => {
      mockList.mockResolvedValue({
        leaderboard: [{ user_id: 'user-1', username: 'Me', best_score: 500 }]
      })
      const wrapper = mountModal({ show: false })
      await wrapper.setProps({ show: true })
      await flushPromises()
      expect(wrapper.find('.table-row.highlight').exists()).toBe(true)
    })

    it('does not highlight any row when not logged in', async () => {
      mockUseAuthStore.mockReturnValue({ user: null })
      mockList.mockResolvedValue({
        leaderboard: [{ user_id: 'a', username: 'Alice', best_score: 100 }]
      })
      const wrapper = mountModal({ show: false })
      await wrapper.setProps({ show: true })
      await flushPromises()
      expect(wrapper.find('.table-row.highlight').exists()).toBe(false)
    })

    it('renders medal icons for top 3 and numeric rank for others', async () => {
      mockList.mockResolvedValue({
        leaderboard: [
          { user_id: '1', username: 'A', best_score: 300 },
          { user_id: '2', username: 'B', best_score: 200 },
          { user_id: '3', username: 'C', best_score: 100 },
          { user_id: '4', username: 'D', best_score: 50 }
        ]
      })
      const wrapper = mountModal({ show: false })
      await wrapper.setProps({ show: true })
      await flushPromises()
      const icons = wrapper.findAll('.rank-icon').map(x => x.text())
      expect(icons).toContain('🥇')
      expect(icons).toContain('🥈')
      expect(icons).toContain('🥉')
      expect(wrapper.find('.rank-num').text()).toBe('4')
    })
  })

  describe('my rank tab', () => {
    it('shows only the current user row when switched to mine tab', async () => {
      mockList.mockResolvedValue({
        leaderboard: [
          { user_id: 'a', username: 'Alice', best_score: 1000 },
          { user_id: 'b', username: 'Bob', best_score: 500 }
        ]
      })
      mockGetMyRank.mockResolvedValue({
        rank: { user_id: 'user-1', rank: 7, username: 'Me', best_score: 300 }
      })
      const wrapper = mountModal({ show: false })
      await wrapper.setProps({ show: true })
      await flushPromises()

      const tabs = wrapper.findAll('.tab')
      await tabs[1].trigger('click')

      expect(wrapper.text()).toContain('Me')
      expect(wrapper.text()).not.toContain('Alice')
      expect(wrapper.text()).not.toContain('Bob')
    })

    it('falls back to 我 when my rank has no username', async () => {
      mockGetMyRank.mockResolvedValue({
        rank: { user_id: 'user-1', rank: 5, username: null, best_score: 200 }
      })
      const wrapper = mountModal({ show: false })
      await wrapper.setProps({ show: true })
      await flushPromises()

      const tabs = wrapper.findAll('.tab')
      await tabs[1].trigger('click')
      expect(wrapper.text()).toContain('我')
    })
  })
})
