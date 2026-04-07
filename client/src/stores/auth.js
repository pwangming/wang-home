import { defineStore } from 'pinia'
import { api } from '../lib/api.js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isLoading: false
  }),

  actions: {
    async init() {
      this.isLoading = true
      try {
        const data = await api.auth.me()
        this.user = data.user
      } catch {
        this.user = null
      } finally {
        this.isLoading = false
      }
    },

    async login(email, password) {
      const data = await api.auth.login(email, password)
      this.user = data.user
      return data
    },

    async register(email, password, username) {
      const data = await api.auth.register(email, password, username)
      if (data.needsEmailConfirmation) {
        return data
      }
      this.user = data.user
      return data
    },

    async logout() {
      try {
        await api.auth.logout()
      } catch {
        // ignore error
      } finally {
        this.user = null
      }
    }
  }
})
