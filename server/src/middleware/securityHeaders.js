/**
 * Security headers middleware
 * Sets common security response headers
 */
export function securityHeadersMiddleware() {
  return async (ctx, next) => {
    // Prevent MIME type sniffing
    ctx.set('X-Content-Type-Options', 'nosniff')

    // Prevent clickjacking
    ctx.set('X-Frame-Options', 'DENY')

    // Control referrer information
    ctx.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    // Disable unnecessary browser features
    ctx.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

    // HSTS - force HTTPS (only in production)
    if (process.env.NODE_ENV === 'production') {
      ctx.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      )
    }

    await next()
  }
}
