import Router from 'koa-router'
import { supabase, createAnonClient } from '../lib/supabase.js'
import { createUserScopedClient, authMiddleware } from '../middleware/auth.js'
import { createLoginRateLimiter, createRegisterRateLimiter, createCallbackRateLimiter, createResetRequestRateLimiter, createResetConfirmRateLimiter, createUpdatePasswordRateLimiter, createUpdateEmailRateLimiter } from '../middleware/rateLimit.js'
import { createCsrfMiddleware } from '../middleware/csrf.js'
import { ok, fail } from '../lib/response.js'

const REMEMBER_ME_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const INVALID_CURRENT_PASSWORD_MESSAGE = 'Current password is incorrect'
const UPDATE_EMAIL_FAILED_MESSAGE = 'Unable to update email. Please check the address and try again.'

function createAuthRouter() {
  const router = new Router({ prefix: '/api/auth' })

  // Helper to normalize username
  function normalizeUsername(username) {
    return username.toLowerCase().trim().replace(/[^a-zA-Z0-9_]/g, '')
  }

  function normalizeEmail(email) {
    return typeof email === 'string' ? email.trim().toLowerCase() : ''
  }

  function isValidEmail(email) {
    if (typeof email !== 'string' || email.length > 254) {
      return false
    }

    const atIndex = email.indexOf('@')
    if (atIndex <= 0 || atIndex !== email.lastIndexOf('@') || atIndex === email.length - 1) {
      return false
    }

    for (const char of email) {
      if (char <= ' ' || char === '\x7f') {
        return false
      }
    }

    const domain = email.slice(atIndex + 1)
    const domainLabels = domain.split('.')
    return domainLabels.length > 1 && domainLabels.every(label => label.length > 0)
  }

  async function verifyCurrentPassword(email, currentPassword) {
    const reqClient = createAnonClient()
    const { error } = await reqClient.auth.signInWithPassword({
      email,
      password: currentPassword
    })

    return !error
  }

  async function createSessionAuthClient(ctx) {
    const accessToken = ctx.session?.supabaseAccessToken
    const refreshToken = ctx.session?.supabaseRefreshToken

    if (!accessToken || !refreshToken) {
      return { client: null, error: new Error('Missing authenticated session') }
    }

    const reqClient = createAnonClient()
    const { data, error } = await reqClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    if (error) {
      return { client: null, error }
    }

    if (data.session) {
      ctx.session.supabaseAccessToken = data.session.access_token
      ctx.session.supabaseRefreshToken = data.session.refresh_token
    }

    return { client: reqClient, error: null }
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

      ok(ctx, { user: { id: data.user.id, email: data.user.email, username: profile.username } })
    }
  )

  // POST /login
  router.post('/login',
    createCsrfMiddleware(),
    createLoginRateLimiter(),
    async (ctx) => {
      const { email, password, rememberMe } = ctx.request.body

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
        ctx.session.maxAge = rememberMe === true ? REMEMBER_ME_MAX_AGE_MS : 'session'
      }

      const userScopedClient = createUserScopedClient(data.session.access_token)
      const { data: profileData } = await userScopedClient
        .from('profiles')
        .select('username')
        .eq('id', data.user.id)
        .maybeSingle()

      ok(ctx, { user: { id: data.user.id, email: data.user.email, username: profileData?.username || null } })
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
  router.post('/reset-request', createCsrfMiddleware(), createResetRequestRateLimiter(), async (ctx) => {
    const { email } = ctx.request.body

    if (!email) {
      fail(ctx, 400, 'email is required')
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${ctx.headers.origin || 'https://client-inky-two.vercel.app'}/reset-password`
    })

    // Always return 200 to avoid leaking which emails are registered
    // Supabase errors here are expected (e.g. unregistered email) and non-actionable

    ok(ctx, { message: 'If that email is registered, a password reset link has been sent.' })
  })

  // POST /reset-confirm
  // Accepts { accessToken, refreshToken, password } (both tokens come from the
  // Supabase recovery link's hash fragment). Updates the user's password.
  // Use a per-request client: setSession mutates the client's auth state, and
  // the shared singleton would leak that state across concurrent requests
  // (cross-user password takeover risk). Each call gets its own isolated client.
  router.post('/reset-confirm', createCsrfMiddleware(), createResetConfirmRateLimiter(), async (ctx) => {
    const { accessToken, refreshToken, password } = ctx.request.body

    if (!accessToken || !refreshToken || !password) {
      fail(ctx, 400, 'accessToken, refreshToken and password are required')
      return
    }

    if (typeof password !== 'string' || password.length < 6) {
      fail(ctx, 400, 'Password must be at least 6 characters')
      return
    }

    const reqClient = createAnonClient()

    const { error: sessionError } = await reqClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })
    if (sessionError) {
      fail(ctx, 400, sessionError.message)
      return
    }

    const { data, error } = await reqClient.auth.updateUser({ password })

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

  // POST /update-password
  // Verifies the current password server-side before changing it.
  router.post('/update-password',
    authMiddleware,
    createCsrfMiddleware(),
    createUpdatePasswordRateLimiter(),
    async (ctx) => {
      const { currentPassword, newPassword } = ctx.request.body

      if (!currentPassword || !newPassword) {
        fail(ctx, 400, 'currentPassword and newPassword are required')
        return
      }

      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        fail(ctx, 400, 'Password must be at least 6 characters')
        return
      }

      const isCurrentPasswordValid = await verifyCurrentPassword(ctx.state.user.email, currentPassword)
      if (!isCurrentPasswordValid) {
        fail(ctx, 401, INVALID_CURRENT_PASSWORD_MESSAGE)
        return
      }

      const { client: authClient, error: sessionError } = await createSessionAuthClient(ctx)
      if (sessionError) {
        fail(ctx, 401, 'Invalid or expired token')
        return
      }

      const { error } = await authClient.auth.updateUser({ password: newPassword })

      if (error) {
        fail(ctx, 400, error.message)
        return
      }

      ok(ctx, { message: 'Password updated successfully' })
    }
  )

  // POST /update-email
  // Uses Supabase's default email-change flow, which sends confirmation mail.
  router.post('/update-email',
    authMiddleware,
    createCsrfMiddleware(),
    createUpdateEmailRateLimiter(),
    async (ctx) => {
      const { currentPassword, newEmail } = ctx.request.body
      const normalizedEmail = normalizeEmail(newEmail)

      if (!currentPassword || !newEmail) {
        fail(ctx, 400, 'currentPassword and newEmail are required')
        return
      }

      if (!isValidEmail(normalizedEmail)) {
        fail(ctx, 400, 'Valid email is required')
        return
      }

      const isCurrentPasswordValid = await verifyCurrentPassword(ctx.state.user.email, currentPassword)
      if (!isCurrentPasswordValid) {
        fail(ctx, 401, INVALID_CURRENT_PASSWORD_MESSAGE)
        return
      }

      const { client: authClient, error: sessionError } = await createSessionAuthClient(ctx)
      if (sessionError) {
        fail(ctx, 401, 'Invalid or expired token')
        return
      }

      const redirectOrigin = ctx.headers.origin || 'https://client-inky-two.vercel.app'
      const { error } = await authClient.auth.updateUser(
        { email: normalizedEmail },
        { emailRedirectTo: `${redirectOrigin}/auth/callback?type=email_change` }
      )

      if (error) {
        fail(ctx, 400, UPDATE_EMAIL_FAILED_MESSAGE)
        return
      }

      ok(ctx, { message: 'Email confirmation sent' })
    }
  )

  // POST /callback
  // Exchanges a Supabase access token (from magic link hash) for a Koa session.
  // Client calls this after reading the token from window.location.hash on email confirmation.
  router.post('/callback', createCsrfMiddleware(), createCallbackRateLimiter(), async (ctx) => {
    const { accessToken, refreshToken } = ctx.request.body

    if (!accessToken) {
      fail(ctx, 400, 'accessToken required')
      return
    }

    const { data, error } = await supabase.auth.getUser(accessToken)
    if (error || !data.user) {
      fail(ctx, 401, 'Invalid token')
      return
    }

    // Destroy existing session then create fresh one (session fixation prevention)
    ctx.session = null
    ctx.session = {}
    ctx.session.supabaseAccessToken = accessToken
    ctx.session.supabaseRefreshToken = refreshToken || null
    ctx.session.userId = data.user.id

    const userScopedClient = createUserScopedClient(accessToken)
    const { data: profile } = await userScopedClient
      .from('profiles')
      .select('username')
      .eq('id', data.user.id)
      .maybeSingle()

    ok(ctx, { user: { id: data.user.id, email: data.user.email, username: profile?.username || null } })
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
