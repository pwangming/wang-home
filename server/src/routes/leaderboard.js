import Router from 'koa-router'
import { createClient } from '@supabase/supabase-js'
import { createUserScopedClient, authMiddleware } from '../middleware/auth.js'
import { createLeaderboardRateLimiter, createGameSessionRateLimiter } from '../middleware/rateLimit.js'
import { createCsrfMiddleware } from '../middleware/csrf.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

function createLeaderboardRouter() {
  const router = new Router({ prefix: '/api' })

  // Valid speed multipliers
  const VALID_SPEED_MULTIPLIERS = [1.0, 1.2, 1.5, 2.0]

  // Score multiplier mapping
  const SCORE_MULTIPLIER_MAP = {
    1.0: 1.0,
    1.2: 1.5,
    1.5: 2.0,
    2.0: 3.0
  }

  // Helper to create Supabase client
  function getSupabase() {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }

  // Helper to create user-scoped client
  function getUserScopedClient(token) {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    })
  }

  // Auth helper - checks ctx.state.user OR ctx.session OR cookie header
  function getAuthUser(ctx) {
    // First check if user is already set by middleware
    if (ctx.state?.user) {
      return { id: ctx.state.user.id, token: ctx.session?.supabaseAccessToken }
    }
    // Fall back to session token
    const token = ctx.session?.supabaseAccessToken
    if (token) {
      return { id: null, token }
    }
    // Fall back to cookie header (for testing without session middleware)
    const cookieHeader = ctx.headers?.cookie || ''
    const match = cookieHeader.match(/session=([^;]+)/)
    if (match) {
      return { id: null, token: match[1] }
    }
    return null
  }

  // GET /leaderboard - paginated ranking
  router.get('/leaderboard', async (ctx) => {
    const page = parseInt(ctx.query.page) || 1
    const pageSize = Math.min(parseInt(ctx.query.pageSize) || 20, 100)
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('leaderboard_best')
      .select('user_id, username, avatar_url, best_score, best_score_at')
      .order('best_score', { ascending: false })
      .order('best_score_at', { ascending: true })
      .order('user_id', { ascending: true })
      .range(from, to)

    if (error) {
      ctx.status = 500
      ctx.body = { error: 'Failed to fetch leaderboard' }
      return
    }

    ctx.body = {
      leaderboard: data || [],
      page,
      pageSize
    }
  })

  // GET /leaderboard/rank/me - current user's rank
  router.get('/leaderboard/rank/me', async (ctx) => {
    // Check auth - either from middleware or session
    const auth = getAuthUser(ctx)
    if (!auth || !auth.token) {
      ctx.status = 401
      ctx.body = { error: 'Unauthorized' }
      return
    }

    // If middleware set the user, use that. Otherwise use a direct query.
    let userId = ctx.state?.user?.id
    if (!userId) {
      // In test scenarios without middleware, use test user ID
      // In production, middleware would have set ctx.state.user
      ctx.status = 401
      ctx.body = { error: 'Unauthorized' }
      return
    }

    const userScopedClient = getUserScopedClient(auth.token)

    // Get user's best score
    const { data, error } = await userScopedClient
      .from('leaderboard_best')
      .select('user_id, username, avatar_url, best_score, best_score_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      ctx.status = 500
      ctx.body = { error: 'Failed to fetch rank' }
      return
    }

    if (!data) {
      ctx.body = { rank: null }
      return
    }

    // Calculate rank by counting users with higher scores
    const { count } = await userScopedClient
      .from('leaderboard_best')
      .select('user_id', { count: 'exact' })
      .gt('best_score', data.best_score)

    const rank = (count || 0) + 1

    ctx.body = {
      rank: {
        ...data,
        rank
      }
    }
  })

  // POST /leaderboard - submit score
  router.post('/leaderboard',
    createCsrfMiddleware(),
    createLeaderboardRateLimiter(),
    async (ctx) => {
      // Check auth
      const auth = getAuthUser(ctx)
      if (!auth || !auth.token) {
        ctx.status = 401
        ctx.body = { error: '未登录，无法保存分数' }
        return
      }

      // Get user ID - must be set by middleware in production
      let userId = ctx.state?.user?.id
      if (!userId) {
        // In test scenarios without middleware, refuse the request
        ctx.status = 401
        ctx.body = { error: 'Unauthorized' }
        return
      }

      const { sessionId, score, speedMultiplier, scoreMultiplier, endedAt, durationMs } = ctx.request.body

      // Validation
      if (score === undefined || speedMultiplier === undefined || scoreMultiplier === undefined) {
        ctx.status = 400
        ctx.body = { error: 'score, speedMultiplier and scoreMultiplier are required' }
        return
      }

      if (typeof score !== 'number' || score < 0 || !Number.isInteger(score)) {
        ctx.status = 400
        ctx.body = { error: 'score must be a non-negative integer' }
        return
      }

      if (typeof speedMultiplier !== 'number' || speedMultiplier <= 0) {
        ctx.status = 400
        ctx.body = { error: 'speedMultiplier must be a positive number' }
        return
      }

      if (!VALID_SPEED_MULTIPLIERS.includes(speedMultiplier)) {
        ctx.status = 400
        ctx.body = { error: 'speedMultiplier must be one of: 1.0, 1.2, 1.5, 2.0' }
        return
      }

      // Verify score multiplier matches speed multiplier
      const expectedScoreMultiplier = SCORE_MULTIPLIER_MAP[speedMultiplier]
      if (Math.abs(scoreMultiplier - expectedScoreMultiplier) > 0.01) {
        ctx.status = 400
        ctx.body = { error: 'scoreMultiplier does not match speedMultiplier mapping' }
        return
      }

      const userScopedClient = getUserScopedClient(auth.token)

      // If sessionId is provided, this is the second phase (completing a session)
      if (sessionId) {
        // Verify session exists and belongs to user
        const { data: session, error: sessionError } = await userScopedClient
          .from('game_sessions')
          .select('id, is_verified, ended_at')
          .eq('session_id', sessionId)
          .eq('user_id', userId)
          .maybeSingle()

        if (sessionError || !session) {
          ctx.status = 400
          ctx.body = { error: 'Invalid or expired game session' }
          return
        }

        if (session.is_verified) {
          ctx.status = 409
          ctx.body = { error: 'Score already submitted for this session' }
          return
        }

        // Validate duration if provided
        if (durationMs !== undefined) {
          if (durationMs < 1000 || durationMs > 600000) {
            ctx.status = 400
            ctx.body = { error: 'durationMs must be between 1000 and 600000' }
            return
          }
        }

        // Update the session with final score
        const { error: updateError } = await userScopedClient
          .from('game_sessions')
          .update({
            score,
            ended_at: endedAt || new Date().toISOString(),
            is_verified: true,
            verification_reason: 'Manual submission'
          })
          .eq('session_id', sessionId)
          .eq('user_id', userId)

        if (updateError) {
          ctx.status = 500
          ctx.body = { error: 'Failed to submit score' }
          return
        }

        ctx.body = { success: true }
        return
      }

      // No sessionId - direct score submission (legacy single-phase)
      // Basic sanity check: max score per second should be reasonable
      const maxReasonableScore = 6000

      if (score > maxReasonableScore) {
        ctx.status = 400
        ctx.body = { error: 'Score exceeds reasonable limit' }
        return
      }

      // Insert directly
      const { error: insertError } = await userScopedClient
        .from('game_sessions')
        .insert({
          user_id: userId,
          score,
          speed_multiplier: speedMultiplier,
          score_multiplier: scoreMultiplier,
          is_verified: true,
          ended_at: endedAt || new Date().toISOString()
        })

      if (insertError) {
        ctx.status = 500
        ctx.body = { error: 'Failed to submit score' }
        return
      }

      ctx.body = { success: true }
    }
  )

  return router
}

export default createLeaderboardRouter
