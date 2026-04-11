const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// Callback for handling session expiry, set by auth store
let onSessionExpired = null

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  })
  const json = await res.json()

  if (!res.ok) {
    // If 401 and not already on the /auth/me endpoint, notify session expired
    if (res.status === 401 && !path.endsWith('/auth/me') && onSessionExpired) {
      onSessionExpired()
    }
    throw new Error(json.error || 'Request failed')
  }
  return json.data !== undefined ? json.data : json
}

export const api = {
  auth: {
    register: (email, password, username) =>
      request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, username }) }),
    login: (email, password) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me'),
    resetRequest: (email) =>
      request('/auth/reset-request', { method: 'POST', body: JSON.stringify({ email }) }),
    resetConfirm: (token, password) =>
      request('/auth/reset-confirm', { method: 'POST', body: JSON.stringify({ token, password }) }),
    updateProfile: (username) =>
      request('/auth/profile', { method: 'PATCH', body: JSON.stringify({ username }) })
  },
  leaderboard: {
    list: (page = 1, pageSize = 20) =>
      request(`/leaderboard?page=${page}&pageSize=${pageSize}`),
    getMyRank: () => request('/leaderboard/rank/me'),
    startSession: (speedMultiplier) =>
      request('/game-sessions/start', { method: 'POST', body: JSON.stringify({ speedMultiplier }) }),
    submitScore: (sessionId, score, speedMultiplier, scoreMultiplier, endedAt, durationMs) =>
      request('/leaderboard', {
        method: 'POST',
        body: JSON.stringify({ sessionId, score, speedMultiplier, scoreMultiplier, endedAt, durationMs })
      })
  }
}
