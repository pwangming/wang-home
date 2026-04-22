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

  it('blocks POST with invalid origin URL', async () => {
    const ctx = createMockCtx('POST', 'not-a-valid-url')
    await middleware(ctx, noop)
    expect(ctx.status).toBe(403)
    expect(ctx.body.error).toBe('CSRF validation failed: invalid origin')
  })

  it('uses referer header when origin is missing', async () => {
    const ctx = {
      method: 'POST',
      headers: { referer: 'http://localhost:3000/some-page' },
      status: 200,
      body: null
    }
    await middleware(ctx, noop)
    expect(ctx.status).toBe(200)
  })
})

describe('CSRF middleware wildcard matching', () => {
  const noop = async () => {}
  const mw = createCsrfMiddleware({
    allowedOrigins: [
      'https://client-inky-two.vercel.app',
      'https://client-*-wangwang4467-1105s-projects.vercel.app'
    ]
  })

  it('allows exact production origin', async () => {
    const ctx = createMockCtx('POST', 'https://client-inky-two.vercel.app')
    await mw(ctx, noop)
    expect(ctx.status).toBe(200)
  })

  it('allows preview hash origin matching wildcard', async () => {
    const ctx = createMockCtx('POST', 'https://client-1bgsu1ng6-wangwang4467-1105s-projects.vercel.app')
    await mw(ctx, noop)
    expect(ctx.status).toBe(200)
  })

  it('allows git-branch alias origin matching wildcard', async () => {
    const ctx = createMockCtx('POST', 'https://client-git-develop-wangwang4467-1105s-projects.vercel.app')
    await mw(ctx, noop)
    expect(ctx.status).toBe(200)
  })

  it('blocks vercel.app subdomain outside team namespace', async () => {
    const ctx = createMockCtx('POST', 'https://client-abc-evilteam.vercel.app')
    await mw(ctx, noop)
    expect(ctx.status).toBe(403)
  })

  it('blocks subdomain-injection bypass with extra dot', async () => {
    const ctx = createMockCtx('POST', 'https://client-evil.attacker.com-wangwang4467-1105s-projects.vercel.app')
    await mw(ctx, noop)
    expect(ctx.status).toBe(403)
  })

  it('blocks userinfo bypass attempt', async () => {
    const ctx = createMockCtx('POST', 'https://client-a-wangwang4467-1105s-projects.vercel.app@evil.com')
    await mw(ctx, noop)
    expect(ctx.status).toBe(403)
  })

  it('blocks non-matching client prefix', async () => {
    const ctx = createMockCtx('POST', 'https://evil-foo-wangwang4467-1105s-projects.vercel.app')
    await mw(ctx, noop)
    expect(ctx.status).toBe(403)
  })

  it('blocks wrong protocol (http) even if hostname matches', async () => {
    const ctx = createMockCtx('POST', 'http://client-abc-wangwang4467-1105s-projects.vercel.app')
    await mw(ctx, noop)
    expect(ctx.status).toBe(403)
  })

  it('ignores invalid entries in allowedOrigins list', async () => {
    const mw2 = createCsrfMiddleware({
      allowedOrigins: ['not-a-url', '', 'https://client-inky-two.vercel.app']
    })
    const ctx = createMockCtx('POST', 'https://client-inky-two.vercel.app')
    await mw2(ctx, noop)
    expect(ctx.status).toBe(200)
  })
})
