import { describe, it, expect } from '@jest/globals'
import { createCsrfMiddleware } from '../../src/middleware/csrf.js'

function createMockCtx(method, origin) {
  const headers = {}
  if (origin) headers.origin = origin
  return {
    method,
    headers,
    status: 200,
    body: null
  }
}

describe('CSRF middleware', () => {
  const middleware = createCsrfMiddleware()
  const noop = async () => {}

  it('blocks POST without origin header', async () => {
    const ctx = createMockCtx('POST', undefined)
    await middleware(ctx, noop)
    expect(ctx.status).toBe(403)
  })

  it('allows GET without origin header', async () => {
    const ctx = createMockCtx('GET', undefined)
    await middleware(ctx, noop)
    expect(ctx.status).toBe(200)
  })

  it('allows POST with allowed origin', async () => {
    const ctx = createMockCtx('POST', 'http://localhost:3000')
    await middleware(ctx, noop)
    expect(ctx.status).toBe(200)
  })

  it('blocks POST with disallowed origin', async () => {
    const ctx = createMockCtx('POST', 'http://evil.com')
    await middleware(ctx, noop)
    expect(ctx.status).toBe(403)
  })
})
