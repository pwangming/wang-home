import { describe, it, expect } from '@jest/globals'
import { ok, created, fail } from '../../src/lib/response.js'

describe('response helpers', () => {
  describe('ok()', () => {
    it('should set status 200 with data', () => {
      const ctx = { status: null, body: null }
      ok(ctx, { id: 1 })
      expect(ctx.status).toBe(200)
      expect(ctx.body).toEqual({ success: true, data: { id: 1 } })
    })

    it('should set status 200 with data and meta', () => {
      const ctx = { status: null, body: null }
      ok(ctx, { items: [] }, { page: 1, total: 10 })
      expect(ctx.status).toBe(200)
      expect(ctx.body).toEqual({ success: true, data: { items: [] }, meta: { page: 1, total: 10 } })
    })

    it('should set status 200 with null data when no data provided', () => {
      const ctx = { status: null, body: null }
      ok(ctx)
      expect(ctx.status).toBe(200)
      expect(ctx.body).toEqual({ success: true, data: null })
    })
  })

  describe('created()', () => {
    it('should set status 201 with data', () => {
      const ctx = { status: null, body: null }
      created(ctx, { id: 1 })
      expect(ctx.status).toBe(201)
      expect(ctx.body).toEqual({ success: true, data: { id: 1 } })
    })

    it('should set status 201 with null data when no data provided', () => {
      const ctx = { status: null, body: null }
      created(ctx)
      expect(ctx.status).toBe(201)
      expect(ctx.body).toEqual({ success: true, data: null })
    })
  })

  describe('fail()', () => {
    it('should set status and error message', () => {
      const ctx = { status: null, body: null }
      fail(ctx, 400, 'Invalid input')
      expect(ctx.status).toBe(400)
      expect(ctx.body).toEqual({ success: false, error: 'Invalid input' })
    })

    it('should work with different status codes', () => {
      const ctx = { status: null, body: null }
      fail(ctx, 401, 'Unauthorized')
      expect(ctx.status).toBe(401)
      expect(ctx.body).toEqual({ success: false, error: 'Unauthorized' })
    })
  })
})
