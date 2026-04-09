// In-memory rate limiter for local development
// Production should use Redis or other shared storage

function createRateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000,
    maxRequests = 30,
    keyGenerator = (ctx) => ctx.ip || 'unknown'
  } = options

  const store = new Map()
  const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

  // Periodic cleanup of expired entries
  const cleanupTimer = setInterval(() => {
    const now = Date.now()
    const windowStart = now - windowMs
    for (const [key, requests] of store) {
      const valid = requests.filter(time => time > windowStart)
      if (valid.length === 0) {
        store.delete(key)
      } else {
        store.set(key, valid)
      }
    }
  }, CLEANUP_INTERVAL)

  // Allow garbage collection if the process doesn't need the timer
  if (cleanupTimer.unref) {
    cleanupTimer.unref()
  }

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
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    keyGenerator: (ctx) => `login:${ctx.ip}`
  })
}

export function createRegisterRateLimiter() {
  return createRateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    keyGenerator: (ctx) => `register:${ctx.ip}`
  })
}

export function createLeaderboardRateLimiter() {
  return createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyGenerator: (ctx) => `leaderboard:${ctx.state.user?.id || ctx.ip}`
  })
}
