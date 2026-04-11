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
    const userScopedClient = createUserScopedClient(ctx.session.supabaseAccessToken)
    const { data: profile } = await userScopedClient
      .from('profiles')
      .select('username')
      .eq('id', ctx.state.user.id)
      .maybeSingle()

    ok(ctx, { user: { ...ctx.state.user, username: profile?.username || null } })
  })

  // POST /reset-request
  // Accepts { email }, sends a password reset email via Supabase.
  // Always returns success to prevent email enumeration.
  router.post('/reset-request', createCsrfMiddleware(), async (ctx) => {
    const { email } = ctx.request.body

    if (!email) {
      fail(ctx, 400, 'email is required')
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${ctx.headers.origin || 'https://client-inky-two.vercel.app'}/reset-password`
    })

    // Always return 200 to avoid leaking which emails are registered
    if (error) {
      console.error('[auth] resetPasswordForEmail error:', error.message)
    }

    ok(ctx, { message: 'If that email is registered, a password reset link has been sent.' })
  })

  // POST /reset-confirm
  // Accepts { token, password }, updates the user's password.
  router.post('/reset-confirm', createCsrfMiddleware(), async (ctx) => {
    const { token, password } = ctx.request.body

    if (!token || !password) {
      fail(ctx, 400, 'token and password are required')
      return
    }

    if (typeof password !== 'string' || password.length < 6) {
      fail(ctx, 400, 'Password must be at least 6 characters')
      return
    }

    const { data, error } = await supabase.auth.updateUser(token, { password })

    if (error) {
      fail(ctx, 400, error.message)
      return
    }

    ok(ctx, { user: { id: data.user.id, email: data.user.email } })
  })

  // PATCH /profile
  // Updates the authenticated user's profile (username).
  router.patch('/profile', authMiddleware, createCsrfMiddleware(), async (ctx) => {
    const { username } = ctx.request.body

    if (!username || typeof username !== 'string') {
      fail(ctx, 400, 'username is required')
      return
    }

    const normalizedUsername = normalizeUsername(username)

    if (normalizedUsername.length < 2 || normalizedUsername.length > 20) {
      fail(ctx, 400, 'Username must be 2-20 characters (letters, numbers, underscore only)')
      return
    }

    // Check uniqueness
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username_normalized', normalizedUsername.toLowerCase())
      .neq('id', ctx.state.user.id)
      .maybeSingle()

    if (existing) {
      fail(ctx, 409, 'This username is already taken')
      return
    }

    const userScopedClient = createUserScopedClient(ctx.session.supabaseAccessToken)
    const { error: updateError } = await userScopedClient
      .from('profiles')
      .update({ username: normalizedUsername, username_normalized: normalizedUsername.toLowerCase() })
      .eq('id', ctx.state.user.id)

    if (updateError) {
      fail(ctx, 500, 'Failed to update username. Please try again.')
      return
    }

    ok(ctx, { username: normalizedUsername })
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
