import { describe, it, expect } from '@jest/globals'
import supertest from 'supertest'
import app from '../../src/index.js'

describe('Leaderboard routes mounted', () => {
  it('GET /api/leaderboard returns 200 or data (not 404)', async () => {
    const res = await supertest(app.callback()).get('/api/leaderboard')
    expect(res.status).not.toBe(404)
  })
})
