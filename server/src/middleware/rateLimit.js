// In-memory rate limiter for local development
// Production should use Redis or other shared storage

function createRateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000,
    maxRequests = 30,
    keyGenerator = (ctx) => ctx.ip || 'unknown'
  } = options

  // Create a new store for each limiter instance
  const store = new Map()

  return async function rateLimitMiddleware(ctx, next) {
    const now = Date.now()
    const windowStart = now - windowMs
    const key = keyGenerator(ctx)

    if (!store.has(key)) {
      store.set(key, [])
    }

    const requests = store.get(key)
    const recentRequests = requests.filter(time => time > windowStart)

    if (recentRequests.length >= maxRequests) {
      ctx.status = 429
      ctx.body = { error: '请求过于频繁，请稍后再试' }
      return
    }

    recentRequests.push(now)
    store.set(key, recentRequests)

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
