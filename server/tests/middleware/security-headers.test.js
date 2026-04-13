import { jest } from '@jest/globals'
import Koa from 'koa'
import request from 'supertest'
import { securityHeadersMiddleware } from '../../src/middleware/securityHeaders.js'

function createAppWithSecurityMiddleware() {
  const app = new Koa()
  app.use(securityHeadersMiddleware())
  app.use(async (ctx) => {
    ctx.body = { ok: true }
  })
  return app
}

describe('securityHeadersMiddleware', () => {
  let app

  beforeEach(() => {
    app = createAppWithSecurityMiddleware()
  })

  it('sets X-Content-Type-Options header', async () => {
    const res = await request(app.callback()).get('/')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
  })

  it('sets X-Frame-Options header', async () => {
    const res = await request(app.callback()).get('/')
    expect(res.headers['x-frame-options']).toBe('DENY')
  })

  it('sets Referrer-Policy header', async () => {
    const res = await request(app.callback()).get('/')
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })

  it('sets Permissions-Policy header', async () => {
    const res = await request(app.callback()).get('/')
    expect(res.headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()')
  })
})

describe('securityHeadersMiddleware in production', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('sets HSTS header in production', async () => {
    process.env.NODE_ENV = 'production'
    const app = createAppWithSecurityMiddleware()
    const res = await request(app.callback()).get('/')
    expect(res.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains')
  })

  it('does not set HSTS header in development', async () => {
    process.env.NODE_ENV = 'development'
    const app = createAppWithSecurityMiddleware()
    const res = await request(app.callback()).get('/')
    expect(res.headers['strict-transport-security']).toBeUndefined()
  })
})
