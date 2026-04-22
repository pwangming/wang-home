// Compile an allowed-origin entry into a matcher.
// - Entries containing `*` become regex matchers (wildcard matches one subdomain
//   segment: [^.]+ — can't span dots so attackers can't prepend extra levels).
// - Other entries are parsed as URLs and matched by protocol + hostname + port.
// - Invalid entries are dropped.
function compileMatcher(entry) {
  const trimmed = typeof entry === 'string' ? entry.trim() : ''
  if (!trimmed) return null

  if (trimmed.includes('*')) {
    const escaped = trimmed
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '[^.]+')
    try {
      return { type: 'regex', regex: new RegExp(`^${escaped}$`) }
    } catch {
      return null
    }
  }

  try {
    const u = new URL(trimmed)
    return {
      type: 'exact',
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port
    }
  } catch {
    return null
  }
}

function parseAllowedOrigins(input) {
  if (Array.isArray(input)) return input
  if (typeof input === 'string') return input.split(',')
  const envValue = process.env.ALLOWED_ORIGINS || 'http://localhost:3000'
  return envValue.split(',')
}

export function createCsrfMiddleware(options = {}) {
  const matchers = parseAllowedOrigins(options.allowedOrigins)
    .map(compileMatcher)
    .filter(Boolean)

  return async function csrfMiddleware(ctx, next) {
    // Only check CSRF for write methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(ctx.method)) {
      const origin = ctx.headers.origin || ctx.headers.referer

      if (!origin) {
        ctx.status = 403
        ctx.body = { error: 'CSRF validation failed: missing origin' }
        return
      }

      let originUrl
      try {
        originUrl = new URL(origin)
      } catch {
        ctx.status = 403
        ctx.body = { error: 'CSRF validation failed: invalid origin' }
        return
      }

      const canonicalOrigin = originUrl.origin
      const isAllowed = matchers.some(m => {
        if (m.type === 'regex') return m.regex.test(canonicalOrigin)
        return m.protocol === originUrl.protocol &&
               m.hostname === originUrl.hostname &&
               m.port === originUrl.port
      })

      if (!isAllowed) {
        ctx.status = 403
        ctx.body = { error: 'CSRF validation failed: origin not allowed' }
        return
      }
    }

    await next()
  }
}
