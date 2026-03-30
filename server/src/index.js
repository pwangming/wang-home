import 'dotenv/config'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import session from 'koa-session'
import { createClient } from '@supabase/supabase-js'
import createAuthRouter from './routes/auth.js'

const app = new Koa()
app.keys = [process.env.SESSION_SECRET || 'dev-only-session-secret']

// Create Supabase client for the app
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

// Session configuration
const sessConfig = {
  key: 'session',
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
}
app.use(session(sessConfig, app))
app.use(bodyParser())

// Attach supabase to context for all requests
app.use(async (ctx, next) => {
  ctx.supabase = supabase
  await next()
})

// Health check
app.use(async (ctx, next) => {
  if (ctx.path === '/api/health') {
    ctx.body = { status: 'ok' }
    return
  }
  await next()
})

// Mount auth routes at /api/auth
const authRouter = createAuthRouter()
app.use(authRouter.routes())
app.use(authRouter.allowedMethods())

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app
