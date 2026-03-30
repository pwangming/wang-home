import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export function createUserScopedClient(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${token}` }
    }
  })
}

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
