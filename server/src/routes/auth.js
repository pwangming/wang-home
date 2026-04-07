import Router from 'koa-router'
import { supabase } from '../lib/supabase.js'
import { createUserScopedClient, authMiddleware } from '../middleware/auth.js'
import { createLoginRateLimiter, createRegisterRateLimiter } from '../middleware/rateLimit.js'
import { createCsrfMiddleware } from '../middleware/csrf.js'
import { ok, fail } from '../lib/response.js'

function createAuthRouter() {
  const router = new Router({ prefix: '/api/auth' })

  // Helper to normalize username
  function normalizeUsername(username) {
    return username.toLowerCase().trim().replace(/[^a-zA-Z0-9_]/g, '')
  }

  // POST /register
  router.post('/register',
    createCsrfMiddleware(),
    createRegisterRateLimiter(),
    async (ctx) => {
      const { email, password, username } = ctx.request.body

      if (!email || !password || !username) {
        fail(ctx, 400, 'email, password and username are required')
        return
      }

      const normalizedUsername = normalizeUsername(username)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: normalizedUsername }
        }
      })

      if (error) {
        fail(ctx, 400, error.message)
        return
      }

      // Check if email confirmation is needed
      if (!data.session) {
        // Email confirmation required
        ok(ctx, { needsEmailConfirmation: true })
        return
      }

      // Verify profile was auto-created
      const userScopedClient = createUserScopedClient(data.session.access_token)
      const { data: profile, error: profileError } = await userScopedClient
        .from('profiles')
        .select('id, username, username_normalized')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileError || !profile) {
        fail(ctx, 500, 'Profile creation failed. Please try again.')
        return
      }

      // Set session cookie
      if (ctx.session) {
        ctx.session.supabaseAccessToken = data.session.access_token
        ctx.session.supabaseRefreshToken = data.session.refresh_token
        ctx.session.userId = data.user.id
      }

      ok(ctx, { user: { id: data.user.id, email: data.user.email } })
    }
  )

  // POST /login
  router.post('/login',
    createCsrfMiddleware(),
    createLoginRateLimiter(),
    async (ctx) => {
      const { email, password } = ctx.request.body

      if (!email || !password) {
        fail(ctx, 400, 'email and password are required')
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        fail(ctx, 401, error.message)
        return
      }

      // Set session cookie
      if (ctx.session) {
        ctx.session.supabaseAccessToken = data.session.access_token
        ctx.session.supabaseRefreshToken = data.session.refresh_token
        ctx.session.userId = data.user.id
      }

      ok(ctx, { user: { id: data.user.id, email: data.user.email } })
    }
  )

  // GET /me
  router.get('/me', authMiddleware, async (ctx) => {
    ok(ctx, { user: ctx.state.user })
  })

  // POST /logout
  router.post('/logout', async (ctx) => {
    // Clear session regardless of Supabase result
    try {
      if (ctx.session && ctx.session.supabaseAccessToken) {
        const userScopedClient = createUserScopedClient(ctx.session.supabaseAccessToken)
        await userScopedClient.auth.signOut()
      }
    } finally {
      if (ctx.session) {
        ctx.session = null
      }
    }

    ok(ctx)
  })

  return router
}

export default createAuthRouter
