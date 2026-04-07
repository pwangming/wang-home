const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',')

export function createCsrfMiddleware() {
  return async function csrfMiddleware(ctx, next) {
    // Only check CSRF for write methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(ctx.method)) {
      const origin = ctx.headers.origin || ctx.headers.referer

      if (!origin) {
        ctx.status = 403
        ctx.body = { error: 'CSRF validation failed: missing origin' }
        return
      }

      try {
        const originUrl = new URL(origin)
        const isAllowed = ALLOWED_ORIGINS.some(allowed => {
          try {
            const allowedUrl = new URL(allowed)
            return allowedUrl.hostname === originUrl.hostname &&
                   allowedUrl.port === originUrl.port
          } catch {
            return false
          }
        })

        if (!isAllowed) {
          ctx.status = 403
          ctx.body = { error: 'CSRF validation failed: origin not allowed' }
          return
        }
      } catch {
        ctx.status = 403
        ctx.body = { error: 'CSRF validation failed: invalid origin' }
        return
      }
    }

    await next()
  }
}
