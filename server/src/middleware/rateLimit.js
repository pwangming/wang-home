// In-memory rate limiter for local development
// Production should use Redis or other shared storage

const stores = {
  memory: new Map()
}

function createRateLimiter(options = {}) {
  const {
    store = 'memory',
    windowMs = 60 * 1000,
    maxRequests = 30,
    keyGenerator = (ctx) => ctx.ip || 'unknown'
  } = options

  const windowMsGlobal = windowMs
  const maxRequestsGlobal = maxRequests

  return async function rateLimitMiddleware(ctx, next) {
    const storeInstance = stores[store] || stores.memory
    const key = keyGenerator(ctx)
    const now = Date.now()
    const windowStart = now - windowMsGlobal

    if (!storeInstance.has(key)) {
      storeInstance.set(key, [])
    }

    const requests = storeInstance.get(key)
    const recentRequests = requests.filter(time => time > windowStart)

    if (recentRequests.length >= maxRequestsGlobal) {
      ctx.status = 429
      ctx.body = { error: '请求过于频繁，请稍后再试' }
      return
    }

    recentRequests.push(now)
    storeInstance.set(key, recentRequests)

    await next()
  }
}

export function createLoginRateLimiter() {
  return createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyGenerator: (ctx) => `login:${ctx.ip}`
  })
}

export function createRegisterRateLimiter() {
  return createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    keyGenerator: (ctx) => `register:${ctx.ip}`
  })
}

export function createGameSessionRateLimiter() {
  return createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: (ctx) => `game-session:${ctx.state.user?.id || ctx.ip}`
  })
}

export function createLeaderboardRateLimiter() {
  return createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: (ctx) => `leaderboard:${ctx.state.user?.id || ctx.ip}`
  })
}
