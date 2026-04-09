import { supabase, createUserScopedClient } from '../lib/supabase.js'

export { createUserScopedClient }

export async function authMiddleware(ctx, next) {
  const token = ctx.session?.supabaseAccessToken
  if (!token) {
    ctx.status = 401
    ctx.body = { error: 'Missing authenticated session' }
    return
  }

  // Try current access token first
  let { data, error } = await supabase.auth.getUser(token)

  // If token expired, try refreshing with refresh token
  if (error && ctx.session.supabaseRefreshToken) {
    const { data: refreshData, error: refreshError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: ctx.session.supabaseRefreshToken
    })

    if (!refreshError && refreshData.session) {
      // Update session with new tokens
      ctx.session.supabaseAccessToken = refreshData.session.access_token
      ctx.session.supabaseRefreshToken = refreshData.session.refresh_token

      // Re-verify with new token
      const result = await supabase.auth.getUser(refreshData.session.access_token)
      data = result.data
      error = result.error
    }
  }

  if (error || !data.user) {
    // Clear invalid session
    if (ctx.session) {
      ctx.session = null
    }
    ctx.status = 401
    ctx.body = { error: 'Invalid or expired token' }
    return
  }

  ctx.state.user = {
    id: data.user.id,
    email: data.user.email
  }
  await next()
}
