import { supabase, createUserScopedClient } from '../lib/supabase.js'

export { createUserScopedClient }

export async function authMiddleware(ctx, next) {
  const token = ctx.session?.supabaseAccessToken
  if (!token) {
    ctx.status = 401
    ctx.body = { error: 'Missing authenticated session' }
    return
  }
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
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
