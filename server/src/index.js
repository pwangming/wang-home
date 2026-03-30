import 'dotenv/config'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import Router from 'koa-router'
import session from 'koa-session'

const app = new Koa()
const router = new Router()
app.keys = [process.env.SESSION_SECRET || 'dev-only-session-secret']

router.get('/api/health', (ctx) => {
  ctx.body = { status: 'ok' }
})

app.use(session({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
}, app))
app.use(bodyParser())
app.use(router.routes())

const PORT = 4000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app
