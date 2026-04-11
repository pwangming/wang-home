import { defineStore } from 'pinia'
import { api } from '../lib/api.js'
import { setSessionExpiredHandler } from '../lib/api.js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isLoading: false,
    _refreshTimer: null,
    _handleVisibility: null
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

      // Register session expired handler
      setSessionExpiredHandler(() => {
        this.user = null
        this._stopHeartbeat()
      })

      // Start heartbeat if logged in
      if (this.user) {
        this._startHeartbeat()
      }
    },

    async login(email, password) {
      const data = await api.auth.login(email, password)
      this.user = data.user
      this._startHeartbeat()
      return data
    },

    async register(email, password, username) {
      const data = await api.auth.register(email, password, username)
      if (data.needsEmailConfirmation) {
        return data
      }
      this.user = data.user
      this._startHeartbeat()
      return data
    },

    async logout() {
      this._stopHeartbeat()
      try {
        await api.auth.logout()
      } catch {
        // ignore error
      } finally {
        this.user = null
      }
    },

    async updateProfile(username) {
      const data = await api.auth.updateProfile(username)
      if (this.user) {
        this.user = { ...this.user, username: data.username }
      }
      return data
    },

    async _refreshSession() {
      try {
        const data = await api.auth.me()
        this.user = data.user
      } catch {
        this.user = null
        this._stopHeartbeat()
      }
    },

    _startHeartbeat() {
      this._stopHeartbeat()

      // Refresh session every 10 minutes
      this._refreshTimer = setInterval(() => {
        this._refreshSession()
      }, 10 * 60 * 1000)

      // Refresh when page becomes visible again
      this._handleVisibility = () => {
        if (document.visibilityState === 'visible' && this.user) {
          this._refreshSession()
        }
      }
      document.addEventListener('visibilitychange', this._handleVisibility)
    },

    _stopHeartbeat() {
      if (this._refreshTimer) {
        clearInterval(this._refreshTimer)
        this._refreshTimer = null
      }
      if (this._handleVisibility) {
        document.removeEventListener('visibilitychange', this._handleVisibility)
        this._handleVisibility = null
      }
    }
  }
})
