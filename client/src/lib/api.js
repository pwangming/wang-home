const API_BASE = '/api'

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

  if (!res.ok) throw new Error(json.error || 'Request failed')
  return json.data !== undefined ? json.data : json
}

export const api = {
  auth: {
    register: (email, password, username) =>
      request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, username }) }),
    login: (email, password) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me')
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
