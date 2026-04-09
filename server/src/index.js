import 'dotenv/config'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import session from 'koa-session'
import { supabase } from './lib/supabase.js'
import createAuthRouter from './routes/auth.js'
import createLeaderboardRouter from './routes/leaderboard.js'

const app = new Koa()

const sessionSecret = process.env.SESSION_SECRET
if (!sessionSecret && process.env.NODE_ENV === 'production') {
  console.error('FATAL: SESSION_SECRET environment variable is required in production')
  process.exit(1)
}
app.keys = [sessionSecret || 'dev-only-session-secret']

if (process.env.NODE_ENV === 'production' && (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY)) {
  console.error('FATAL: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required in production')
  process.exit(1)
}

// Session configuration
const sessConfig = {
  key: 'session',
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
}
app.use(session(sessConfig, app))

// CORS middleware
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',')
app.use(async (ctx, next) => {
  const origin = ctx.headers.origin
  if (origin && allowedOrigins.some(o => o.trim() === origin)) {
    ctx.set('Access-Control-Allow-Origin', origin)
    ctx.set('Access-Control-Allow-Credentials', 'true')
    ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    ctx.set('Access-Control-Allow-Headers', 'Content-Type')
  }
  if (ctx.method === 'OPTIONS') {
    ctx.status = 204
    return
  }
  await next()
})

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

const leaderboardRouter = createLeaderboardRouter()
app.use(leaderboardRouter.routes())
app.use(leaderboardRouter.allowedMethods())

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app
