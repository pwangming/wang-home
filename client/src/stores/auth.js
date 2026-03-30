import { api } from '../lib/api.js'
import { reactive } from 'vue'

// Singleton auth store using Vue's reactive
const state = reactive({
  user: null,
  isLoading: false
})

export const authStore = {
  state,

  get user() {
    return state.user
  },
  set user(value) {
    state.user = value
  },

  get isLoading() {
    return state.isLoading
  },
  set isLoading(value) {
    state.isLoading = value
  },

  async init() {
    state.isLoading = true
    try {
      const data = await api.auth.me()
      state.user = data.user
    } catch {
      state.user = null
    } finally {
      state.isLoading = false
    }
  },

  async login(email, password) {
    const data = await api.auth.login(email, password)
    state.user = data.user
    return data
  },

  async register(email, password, username) {
    const data = await api.auth.register(email, password, username)
    if (data.needsEmailConfirmation) {
      return data
    }
    state.user = data.user
    return data
  },

  async logout() {
    try {
      await api.auth.logout()
    } catch {
      // ignore error
    } finally {
      state.user = null
    }
  }
}
