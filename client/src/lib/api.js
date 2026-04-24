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

  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include'
    })
  } catch (err) {
    // Network error (TypeError from fetch) - shows toast
    const error = new Error('网络连接失败，请检查网络')
    error.networkError = true
    throw error
  }

  let json
  try {
    json = await res.json()
  } catch {
    if (res.status >= 500) {
      const error = new Error('服务器异常，请稍后重试')
      error.serverError = true
      throw error
    }
    throw new Error('服务器返回了无效的响应')
  }

  if (!res.ok) {
    // If 401 and not already on the /auth/me endpoint, notify session expired
    if (res.status === 401 && !path.endsWith('/auth/me') && onSessionExpired) {
      onSessionExpired()
    }
    // 500 errors get a generic message
    if (res.status >= 500) {
      const error = new Error('服务器异常，请稍后重试')
      error.serverError = true
      throw error
    }
    // 400/401/403/409 - business errors, throw for caller to handle
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
    resetConfirm: (accessToken, refreshToken, password) =>
      request('/auth/reset-confirm', { method: 'POST', body: JSON.stringify({ accessToken, refreshToken, password }) }),
    updateProfile: (username) =>
      request('/auth/profile', { method: 'PATCH', body: JSON.stringify({ username }) }),
    callback: (accessToken, refreshToken) =>
      request('/auth/callback', { method: 'POST', body: JSON.stringify({ accessToken, refreshToken }) })
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
