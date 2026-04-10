# Neon Snake 项目全面改进计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix critical bugs, close security gaps, improve code quality, and establish engineering foundations (tests, CI, monorepo) for the Neon Snake arcade project.

**Architecture:** Full-stack Vue 3 + Koa + Supabase project. Client at `client/`, server at `server/`, database migrations at `supabase/migrations/`. All API calls go through Koa backend via Vite dev proxy (`/api` -> `localhost:4000`). Supabase handles auth and data storage with RLS.

**Tech Stack:** Vue 3, Pinia, Naive UI, Vite, Koa, Supabase, Playwright, Vitest, Jest

---

## Phase 0: P0 Blockers (Critical Bugs)

These must be fixed first -- the app is functionally broken without them.

---

### Task 1: Fix leaderboard route not mounted

The `createLeaderboardRouter` in `server/src/routes/leaderboard.js` is never imported or mounted in `server/src/index.js`. All leaderboard and score submission endpoints return 404.

**Files:**
- Modify: `server/src/index.js:6,40-42`

- [ ] **Step 1: Write the failing test**

Create `server/src/__tests__/leaderboard-routes.test.js`:

```js
import { describe, it, expect } from '@jest/globals'
import supertest from 'supertest'
import app from '../index.js'

describe('Leaderboard routes mounted', () => {
  it('GET /api/leaderboard returns 200 or data (not 404)', async () => {
    const res = await supertest(app.callback()).get('/api/leaderboard')
    expect(res.status).not.toBe(404)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx cross-env NODE_OPTIONS=--experimental-vm-modules npx jest src/__tests__/leaderboard-routes.test.js --verbose`

Expected: FAIL -- status is 404 because leaderboard routes are not mounted.

- [ ] **Step 3: Import and mount leaderboard router in server/src/index.js**

```js
import createAuthRouter from './routes/auth.js'
import createLeaderboardRouter from './routes/leaderboard.js'

// ... after auth router mount ...

// Mount leaderboard routes at /api
const leaderboardRouter = createLeaderboardRouter()
app.use(leaderboardRouter.routes())
app.use(leaderboardRouter.allowedMethods())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx cross-env NODE_OPTIONS=--experimental-vm-modules npx jest src/__tests__/leaderboard-routes.test.js --verbose`

Expected: PASS -- status is no longer 404 (will be 500 without Supabase, but not 404).

- [ ] **Step 5: Commit**

```bash
git add server/src/index.js server/src/__tests__/leaderboard-routes.test.js
git commit -m "fix(server): mount leaderboard router in app entry"
```

---

### Task 2: Fix route prefix mismatch

Client sends requests to `/api/auth/register`, but auth router defines routes as `/register` (no prefix). Leaderboard router defines `/leaderboard`. The Vite proxy strips nothing -- it forwards `/api/auth/register` as-is to `localhost:4000`. The Koa router needs a prefix matching the client expectations.

**Files:**
- Modify: `server/src/routes/auth.js:11`
- Modify: `server/src/routes/leaderboard.js:11`

- [ ] **Step 1: Verify current route definitions**

Read `server/src/routes/auth.js` line 11 and confirm `new Router()` has no prefix.
Read `client/src/lib/api.js` and confirm requests go to `/api/auth/*` and `/api/leaderboard*` and `/api/game-sessions/*`.

- [ ] **Step 2: Add prefix to auth router**

In `server/src/routes/auth.js`, change:

```js
const router = new Router()
```

to:

```js
const router = new Router({ prefix: '/api/auth' })
```

- [ ] **Step 3: Add prefix to leaderboard router**

In `server/src/routes/leaderboard.js`, change:

```js
const router = new Router()
```

to:

```js
const router = new Router({ prefix: '/api' })
```

This makes the routes:
- `GET /api/leaderboard` -- list
- `GET /api/leaderboard/rank/me` -- my rank
- `POST /api/leaderboard` -- submit score
- `POST /api/game-sessions/start` -- start session (if implemented)

- [ ] **Step 4: Update health check to match prefix**

In `server/src/index.js`, verify the health check middleware already checks `ctx.path === '/api/health'`. No change needed if so.

- [ ] **Step 5: Run existing tests to verify no regression**

Run: `cd server && npx cross-env NODE_OPTIONS=--experimental-vm-modules npx jest --verbose`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/auth.js server/src/routes/leaderboard.js
git commit -m "fix(server): add correct route prefixes for auth and leaderboard"
```

---

### Task 3: Fix leaderboard query using `.single()` instead of proper pagination

`server/src/routes/leaderboard.js:71` uses `.single()` which throws when multiple rows are returned. Should use `.range()` for pagination.

**Files:**
- Modify: `server/src/routes/leaderboard.js:59-84`

- [ ] **Step 1: Write the failing test**

Create `server/src/__tests__/leaderboard-query.test.js`:

```js
import { describe, it, expect } from '@jest/globals'

describe('Leaderboard pagination logic', () => {
  it('calculates correct range from page and pageSize', () => {
    const page = 2
    const pageSize = 20
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    expect(from).toBe(20)
    expect(to).toBe(39)
  })

  it('clamps pageSize to max 100', () => {
    const rawPageSize = 200
    const pageSize = Math.min(rawPageSize, 100)
    expect(pageSize).toBe(100)
  })
})
```

- [ ] **Step 2: Run test to verify it passes (unit logic test)**

Run: `cd server && npx cross-env NODE_OPTIONS=--experimental-vm-modules npx jest src/__tests__/leaderboard-query.test.js --verbose`

Expected: PASS

- [ ] **Step 3: Fix the leaderboard GET handler**

In `server/src/routes/leaderboard.js`, replace the leaderboard GET handler (lines 59-84):

```js
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
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/leaderboard.js server/src/__tests__/leaderboard-query.test.js
git commit -m "fix(server): use .range() instead of .single() for leaderboard pagination"
```

---

## Phase 1: P1 Security Fixes

---

### Task 4: Validate SESSION_SECRET at startup

`server/src/index.js:9` falls back to `'dev-only-session-secret'` silently. In production this is a critical vulnerability.

**Files:**
- Modify: `server/src/index.js:8-9`

- [ ] **Step 1: Add startup validation**

In `server/src/index.js`, replace:

```js
const app = new Koa()
app.keys = [process.env.SESSION_SECRET || 'dev-only-session-secret']
```

with:

```js
const app = new Koa()

const sessionSecret = process.env.SESSION_SECRET
if (!sessionSecret && process.env.NODE_ENV === 'production') {
  console.error('FATAL: SESSION_SECRET environment variable is required in production')
  process.exit(1)
}
app.keys = [sessionSecret || 'dev-only-session-secret']
```

- [ ] **Step 2: Add same validation for Supabase env vars**

In `server/src/index.js`, after the session secret check, add:

```js
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('FATAL: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required')
  process.exit(1)
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/index.js
git commit -m "fix(server): validate required env vars at startup"
```

---

### Task 5: Fix CSRF middleware bypass when Origin header is missing

`server/src/middleware/csrf.js` allows requests through when no `origin` or `referer` header is present. This can be exploited.

**Files:**
- Modify: `server/src/middleware/csrf.js`

- [ ] **Step 1: Write the failing test**

Create `server/src/__tests__/csrf.test.js`:

```js
import { describe, it, expect } from '@jest/globals'
import { createCsrfMiddleware } from '../middleware/csrf.js'

function createMockCtx(method, origin) {
  const headers = {}
  if (origin) headers.origin = origin
  return {
    method,
    headers,
    status: 200,
    body: null
  }
}

describe('CSRF middleware', () => {
  const middleware = createCsrfMiddleware()
  const noop = async () => {}

  it('blocks POST without origin header', async () => {
    const ctx = createMockCtx('POST', undefined)
    await middleware(ctx, noop)
    expect(ctx.status).toBe(403)
  })

  it('allows GET without origin header', async () => {
    const ctx = createMockCtx('GET', undefined)
    await middleware(ctx, noop)
    expect(ctx.status).toBe(200)
  })

  it('allows POST with allowed origin', async () => {
    const ctx = createMockCtx('POST', 'http://localhost:3000')
    await middleware(ctx, noop)
    expect(ctx.status).toBe(200)
  })

  it('blocks POST with disallowed origin', async () => {
    const ctx = createMockCtx('POST', 'http://evil.com')
    await middleware(ctx, noop)
    expect(ctx.status).toBe(403)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd server && npx cross-env NODE_OPTIONS=--experimental-vm-modules npx jest src/__tests__/csrf.test.js --verbose`

Expected: FAIL on "blocks POST without origin header" -- currently it passes through.

- [ ] **Step 3: Fix the CSRF middleware**

Replace `server/src/middleware/csrf.js`:

```js
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',')

export function createCsrfMiddleware() {
  return async function csrfMiddleware(ctx, next) {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(ctx.method)) {
      const origin = ctx.headers.origin || ctx.headers.referer

      if (!origin) {
        ctx.status = 403
        ctx.body = { error: 'CSRF validation failed: missing origin' }
        return
      }

      try {
        const originUrl = new URL(origin)
        const isAllowed = ALLOWED_ORIGINS.some(allowed => {
          try {
            const allowedUrl = new URL(allowed)
            return allowedUrl.hostname === originUrl.hostname &&
                   allowedUrl.port === originUrl.port
          } catch {
            return false
          }
        })

        if (!isAllowed) {
          ctx.status = 403
          ctx.body = { error: 'CSRF validation failed: origin not allowed' }
          return
        }
      } catch {
        ctx.status = 403
        ctx.body = { error: 'CSRF validation failed: invalid origin' }
        return
      }
    }

    await next()
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx cross-env NODE_OPTIONS=--experimental-vm-modules npx jest src/__tests__/csrf.test.js --verbose`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/middleware/csrf.js server/src/__tests__/csrf.test.js
git commit -m "fix(server): reject requests without origin header in CSRF middleware"
```

---

### Task 6: Fix rate limiter memory leak

`server/src/middleware/rateLimit.js` stores request timestamps in a `Map` that never cleans up expired entries.

**Files:**
- Modify: `server/src/middleware/rateLimit.js`

- [ ] **Step 1: Write the failing test**

Create `server/src/__tests__/rate-limit.test.js`:

```js
import { describe, it, expect, jest } from '@jest/globals'
import { createLoginRateLimiter } from '../middleware/rateLimit.js'

describe('Rate limiter', () => {
  it('blocks requests exceeding max', async () => {
    const limiter = createLoginRateLimiter()
    const noop = async () => {}

    for (let i = 0; i < 5; i++) {
      const ctx = { ip: '1.2.3.4', status: 200, body: null }
      await limiter(ctx, noop)
      expect(ctx.status).toBe(200)
    }

    const ctx = { ip: '1.2.3.4', status: 200, body: null }
    await limiter(ctx, noop)
    expect(ctx.status).toBe(429)
  })

  it('allows requests from different IPs', async () => {
    const limiter = createLoginRateLimiter()
    const noop = async () => {}

    for (let i = 0; i < 5; i++) {
      const ctx = { ip: `10.0.0.${i}`, status: 200, body: null }
      await limiter(ctx, noop)
      expect(ctx.status).toBe(200)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd server && npx cross-env NODE_OPTIONS=--experimental-vm-modules npx jest src/__tests__/rate-limit.test.js --verbose`

Expected: PASS (existing logic works, we're adding cleanup)

- [ ] **Step 3: Add periodic cleanup to rate limiter**

Replace `server/src/middleware/rateLimit.js`:

```js
// In-memory rate limiter for local development
// Production should use Redis or other shared storage

function createRateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000,
    maxRequests = 30,
    keyGenerator = (ctx) => ctx.ip || 'unknown'
  } = options

  const store = new Map()
  const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

  // Periodic cleanup of expired entries
  const cleanupTimer = setInterval(() => {
    const now = Date.now()
    const windowStart = now - windowMs
    for (const [key, requests] of store) {
      const valid = requests.filter(time => time > windowStart)
      if (valid.length === 0) {
        store.delete(key)
      } else {
        store.set(key, valid)
      }
    }
  }, CLEANUP_INTERVAL)

  // Allow garbage collection if the process doesn't need the timer
  if (cleanupTimer.unref) {
    cleanupTimer.unref()
  }

  return async function rateLimitMiddleware(ctx, next) {
    const now = Date.now()
    const windowStart = now - windowMs
    const key = keyGenerator(ctx)

    if (!store.has(key)) {
      store.set(key, [])
    }

    const requests = store.get(key)
    const recentRequests = requests.filter(time => time > windowStart)

    if (recentRequests.length >= maxRequests) {
      ctx.status = 429
      ctx.body = { error: '请求过于频繁，请稍后再试' }
      return
    }

    recentRequests.push(now)
    store.set(key, recentRequests)

    await next()
  }
}

export function createLoginRateLimiter() {
  return createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    keyGenerator: (ctx) => `login:${ctx.ip}`
  })
}

export function createRegisterRateLimiter() {
  return createRateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    keyGenerator: (ctx) => `register:${ctx.ip}`
  })
}

export function createGameSessionRateLimiter() {
  return createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyGenerator: (ctx) => `game-session:${ctx.state.user?.id || ctx.ip}`
  })
}

export function createLeaderboardRateLimiter() {
  return createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyGenerator: (ctx) => `leaderboard:${ctx.state.user?.id || ctx.ip}`
  })
}
```

- [ ] **Step 4: Run tests**

Run: `cd server && npx cross-env NODE_OPTIONS=--experimental-vm-modules npx jest src/__tests__/rate-limit.test.js --verbose`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/middleware/rateLimit.js server/src/__tests__/rate-limit.test.js
git commit -m "fix(server): add periodic cleanup to rate limiter to prevent memory leak"
```

---

## Phase 2: P2 Code Quality

---

### Task 7: Deduplicate Supabase client creation

Four files each call `createClient()` independently. Create a single shared module.

**Files:**
- Create: `server/src/lib/supabase.js`
- Modify: `server/src/index.js`
- Modify: `server/src/middleware/auth.js`
- Modify: `server/src/routes/auth.js`
- Modify: `server/src/routes/leaderboard.js`

- [ ] **Step 1: Create shared Supabase module**

Create `server/src/lib/supabase.js`:

```js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

// Shared anon client (for public operations)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Create a user-scoped client with a specific access token
export function createUserScopedClient(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${token}` }
    }
  })
}
```

- [ ] **Step 2: Update server/src/index.js**

Remove the `createClient` import and inline client creation. Replace with:

```js
import { supabase } from './lib/supabase.js'
```

Remove the line `const supabase = createClient(...)`. Keep the middleware that attaches `ctx.supabase = supabase`.

- [ ] **Step 3: Update server/src/middleware/auth.js**

Replace the file with:

```js
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
```

- [ ] **Step 4: Update server/src/routes/auth.js**

Remove `import { createClient } from '@supabase/supabase-js'` and the local `SUPABASE_URL`/`SUPABASE_ANON_KEY` constants and the local `createClient()` call. Import from shared module:

```js
import { supabase } from '../lib/supabase.js'
import { createUserScopedClient, authMiddleware } from '../middleware/auth.js'
```

Use the imported `supabase` directly instead of the locally created one.

- [ ] **Step 5: Update server/src/routes/leaderboard.js**

Remove `import { createClient } from '@supabase/supabase-js'` and local `SUPABASE_URL`/`SUPABASE_ANON_KEY` and the `getSupabase()`/`getUserScopedClient()` helpers. Import from shared module:

```js
import { supabase, createUserScopedClient } from '../lib/supabase.js'
import { authMiddleware } from '../middleware/auth.js'
```

Replace `getSupabase()` calls with `supabase` and `getUserScopedClient(token)` with `createUserScopedClient(token)`.

- [ ] **Step 6: Run all server tests**

Run: `cd server && npx cross-env NODE_OPTIONS=--experimental-vm-modules npx jest --verbose`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add server/src/lib/supabase.js server/src/index.js server/src/middleware/auth.js server/src/routes/auth.js server/src/routes/leaderboard.js
git commit -m "refactor(server): deduplicate Supabase client into shared module"
```

---

### Task 8: Migrate auth store to Pinia

`client/src/stores/auth.js` uses a manual `reactive()` singleton despite Pinia being installed and registered.

**Files:**
- Modify: `client/src/stores/auth.js`
- Modify: `client/src/views/GameView.vue` (import change)
- Modify: `client/src/views/LoginView.vue` (import change)
- Modify: `client/src/views/RegisterView.vue` (import change)

- [ ] **Step 1: Rewrite auth store with Pinia**

Replace `client/src/stores/auth.js`:

```js
import { defineStore } from 'pinia'
import { api } from '../lib/api.js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isLoading: false
  }),

  actions: {
    async init() {
      this.isLoading = true
      try {
        const data = await api.auth.me()
        this.user = data.user
      } catch {
        this.user = null
      } finally {
        this.isLoading = false
      }
    },

    async login(email, password) {
      const data = await api.auth.login(email, password)
      this.user = data.user
      return data
    },

    async register(email, password, username) {
      const data = await api.auth.register(email, password, username)
      if (data.needsEmailConfirmation) {
        return data
      }
      this.user = data.user
      return data
    },

    async logout() {
      try {
        await api.auth.logout()
      } catch {
        // ignore error
      } finally {
        this.user = null
      }
    }
  }
})

// Backward-compatible export for gradual migration
// Remove this once all consumers use useAuthStore()
export const authStore = (() => {
  let _store = null
  const handler = {
    get(_, prop) {
      if (!_store) {
        // Will be initialized on first access after Pinia is installed
        const { useAuthStore: use } = require('./auth.js')
        _store = use()
      }
      return _store[prop]
    }
  }
  return new Proxy({}, handler)
})()
```

Actually, a Proxy-based shim is fragile. Instead, update all consumers directly.

Replace `client/src/stores/auth.js`:

```js
import { defineStore } from 'pinia'
import { api } from '../lib/api.js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isLoading: false
  }),

  actions: {
    async init() {
      this.isLoading = true
      try {
        const data = await api.auth.me()
        this.user = data.user
      } catch {
        this.user = null
      } finally {
        this.isLoading = false
      }
    },

    async login(email, password) {
      const data = await api.auth.login(email, password)
      this.user = data.user
      return data
    },

    async register(email, password, username) {
      const data = await api.auth.register(email, password, username)
      if (data.needsEmailConfirmation) {
        return data
      }
      this.user = data.user
      return data
    },

    async logout() {
      try {
        await api.auth.logout()
      } catch {
        // ignore error
      } finally {
        this.user = null
      }
    }
  }
})
```

- [ ] **Step 2: Update GameView.vue**

Change import:

```js
// Before
import { authStore } from '../stores/auth.js'

// After
import { useAuthStore } from '../stores/auth.js'
```

Add at top of `<script setup>`:

```js
const authStore = useAuthStore()
```

No template changes needed -- `authStore.user` etc. remain the same.

- [ ] **Step 3: Update LoginView.vue**

Same pattern:

```js
// Before
import { authStore } from '../stores/auth.js'

// After
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore()
```

- [ ] **Step 4: Update RegisterView.vue**

Same pattern:

```js
// Before
import { authStore } from '../stores/auth.js'

// After
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore()
```

- [ ] **Step 5: Verify dev server works**

Run: `cd client && npx vite build`

Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/stores/auth.js client/src/views/GameView.vue client/src/views/LoginView.vue client/src/views/RegisterView.vue
git commit -m "refactor(client): migrate auth store from reactive singleton to Pinia"
```

---

### Task 9: Standardize API response format

Backend responses are inconsistent. Unify to `{ success, data, error }`.

**Files:**
- Create: `server/src/lib/response.js`
- Modify: `server/src/routes/auth.js`
- Modify: `server/src/routes/leaderboard.js`
- Modify: `client/src/lib/api.js`

- [ ] **Step 1: Create response helper**

Create `server/src/lib/response.js`:

```js
export function ok(ctx, data = null, meta = null) {
  ctx.status = 200
  ctx.body = { success: true, data, ...(meta ? { meta } : {}) }
}

export function created(ctx, data = null) {
  ctx.status = 201
  ctx.body = { success: true, data }
}

export function fail(ctx, status, error) {
  ctx.status = status
  ctx.body = { success: false, error }
}
```

- [ ] **Step 2: Refactor auth routes to use response helpers**

In `server/src/routes/auth.js`, import and use:

```js
import { ok, fail } from '../lib/response.js'
```

Replace patterns like:
```js
ctx.status = 400
ctx.body = { error: 'email, password and username are required' }
```
with:
```js
fail(ctx, 400, 'email, password and username are required')
```

And:
```js
ctx.body = { success: true, user: { id: data.user.id, email: data.user.email } }
```
with:
```js
ok(ctx, { user: { id: data.user.id, email: data.user.email } })
```

- [ ] **Step 3: Refactor leaderboard routes to use response helpers**

Same pattern in `server/src/routes/leaderboard.js`:

```js
import { ok, fail } from '../lib/response.js'
```

For the leaderboard list:
```js
ok(ctx, { leaderboard: data || [] }, { page, pageSize })
```

- [ ] **Step 4: Update client API wrapper**

In `client/src/lib/api.js`, update the `request` function to unwrap the new format:

```js
async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  })
  const json = await res.json()

  if (!res.ok) throw new Error(json.error || 'Request failed')
  return json.data !== undefined ? json.data : json
}
```

The fallback `json.data !== undefined ? json.data : json` ensures backward compatibility during migration.

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/response.js server/src/routes/auth.js server/src/routes/leaderboard.js client/src/lib/api.js
git commit -m "refactor: standardize API response format to { success, data, error }"
```

---

### Task 10: Make SnakeGame canvas responsive

Canvas is hardcoded 400x400 px. Should resize to fit its container.

**Files:**
- Modify: `client/src/components/game/SnakeGame.vue`

- [ ] **Step 1: Add ResizeObserver-based sizing**

In `client/src/components/game/SnakeGame.vue`, replace the fixed dimensions:

```js
// Remove these
const canvasWidth = 400
const canvasHeight = 400
```

Add reactive canvas size:

```js
const containerRef = ref(null)
const canvasSize = ref(400)
const gridSize = 20

// Compute grid-aligned canvas size
function updateCanvasSize() {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const size = Math.min(rect.width, rect.height)
  // Snap to grid for clean rendering
  canvasSize.value = Math.floor(size / gridSize) * gridSize
}
```

- [ ] **Step 2: Update template**

```html
<template>
  <div ref="containerRef" class="snake-game">
    <canvas
      ref="canvasRef"
      :width="canvasSize"
      :height="canvasSize"
      @keydown="handleKeyDown"
      tabindex="0"
    />
  </div>
</template>
```

- [ ] **Step 3: Add ResizeObserver lifecycle**

```js
let resizeObserver = null

onMounted(() => {
  updateCanvasSize()
  resizeObserver = new ResizeObserver(() => {
    const wasRunning = isGameRunning.value
    updateCanvasSize()
    if (wasRunning) {
      draw()
    }
  })
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value)
  }
  if (canvasRef.value) {
    canvasRef.value.focus()
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  if (gameLoopId.value) {
    clearInterval(gameLoopId.value)
  }
})
```

- [ ] **Step 4: Update all references from `canvasWidth`/`canvasHeight` to `canvasSize.value`**

In `initGame`, `placeFood`, `draw`, `tick` -- replace every `canvasWidth` and `canvasHeight` with `canvasSize.value`.

- [ ] **Step 5: Update CSS to fill container**

```css
.snake-game {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

canvas {
  outline: none;
  border: 2px solid #4ade80;
  border-radius: 4px;
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.3);
}
```

- [ ] **Step 6: Verify in browser**

Start dev server and verify the canvas resizes when the browser window changes size.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/game/SnakeGame.vue
git commit -m "feat(client): make snake game canvas responsive with ResizeObserver"
```

---

### Task 11: Extract SpeedSelector component and reduce GameView.vue size

GameView.vue has 627 lines. The speed selection panel is duplicated in the start and game-over states.

**Files:**
- Create: `client/src/components/game/SpeedSelector.vue`
- Modify: `client/src/views/GameView.vue`

- [ ] **Step 1: Create SpeedSelector component**

Create `client/src/components/game/SpeedSelector.vue`:

```vue
<template>
  <div class="speed-selection">
    <div class="selection-label">选择速度倍率</div>
    <div class="speed-buttons">
      <button
        v-for="speed in speedOptions"
        :key="speed.value"
        class="speed-btn"
        :data-testid="`speed-option-${speed.value}`"
        :class="{ active: modelValue === speed.value }"
        @click="$emit('update:modelValue', speed.value)"
      >
        {{ speed.label }}
      </button>
    </div>
    <div class="score-hint">
      得分倍率: {{ currentScoreMultiplier }}x
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const SPEED_OPTIONS = [
  { value: 1.0, label: '1.0x', scoreMult: 1.0 },
  { value: 1.2, label: '1.2x', scoreMult: 1.5 },
  { value: 1.5, label: '1.5x', scoreMult: 2.0 },
  { value: 2.0, label: '2.0x', scoreMult: 3.0 }
]

const props = defineProps({
  modelValue: {
    type: Number,
    default: 1.0
  }
})

defineEmits(['update:modelValue'])

const speedOptions = SPEED_OPTIONS

const currentScoreMultiplier = computed(() => {
  const option = SPEED_OPTIONS.find(o => o.value === props.modelValue)
  return option?.scoreMult || 1.0
})

defineExpose({ currentScoreMultiplier })
</script>

<style scoped>
.speed-selection {
  margin-bottom: clamp(16px, 2vh, 28px);
}

.selection-label {
  color: var(--text-secondary);
  font-size: clamp(12px, 0.9vw, 14px);
  margin-bottom: clamp(8px, 1vh, 14px);
}

.speed-buttons {
  display: flex;
  gap: clamp(8px, 1vw, 16px);
  justify-content: center;
  margin-bottom: clamp(8px, 1vh, 14px);
  flex-wrap: wrap;
}

.speed-btn {
  padding: clamp(10px, 1vw, 14px) clamp(16px, 1.5vw, 24px);
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: clamp(13px, 1vw, 16px);
  cursor: pointer;
  transition: all 0.2s;
}

.speed-btn.active,
.speed-btn:hover {
  background: var(--neon-green);
  color: #000;
  border-color: var(--neon-green);
}

.score-hint {
  color: var(--neon-green);
  font-size: clamp(11px, 0.85vw, 14px);
}
</style>
```

- [ ] **Step 2: Replace duplicated blocks in GameView.vue**

In `client/src/views/GameView.vue`:

1. Import the new component:
```js
import SpeedSelector from '../components/game/SpeedSelector.vue'
```

2. Replace both speed selection blocks (in the start card and game-over card) with:
```html
<SpeedSelector v-model="selectedSpeed" />
```

3. Remove the `speedOptions` array and `currentScoreMultiplier` computed from GameView.vue.

4. For `currentScoreMultiplier` used elsewhere (e.g., GameSidebar prop, score submit), compute it from `selectedSpeed`:
```js
const SPEED_SCORE_MAP = { 1.0: 1.0, 1.2: 1.5, 1.5: 2.0, 2.0: 3.0 }
const currentScoreMultiplier = computed(() => SPEED_SCORE_MAP[selectedSpeed.value] || 1.0)
```

5. Remove the duplicated speed selection CSS from GameView.vue's `<style scoped>`.

- [ ] **Step 3: Verify dev build**

Run: `cd client && npx vite build`

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/game/SpeedSelector.vue client/src/views/GameView.vue
git commit -m "refactor(client): extract SpeedSelector component, remove duplication in GameView"
```

---

### Task 12: Replace setTimeout with nextTick for game start

`GameView.vue:205-207` uses `setTimeout(100)` to wait for DOM. Use `nextTick()` instead.

**Files:**
- Modify: `client/src/views/GameView.vue`

- [ ] **Step 1: Import nextTick**

In `client/src/views/GameView.vue`, add `nextTick` to the Vue import:

```js
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
```

- [ ] **Step 2: Replace setTimeout with nextTick**

Replace:

```js
async function startGame() {
  if (authStore.user) {
    try {
      await api.leaderboard.startSession(selectedSpeed.value)
    } catch (err) {
      console.warn('Failed to start session:', err)
    }
  }
  isPlaying.value = true
  currentScore.value = 0
  gameStartTimer = setTimeout(() => {
    snakeGameRef.value?.startGame()
  }, 100)
}
```

with:

```js
async function startGame() {
  if (authStore.user) {
    try {
      await api.leaderboard.startSession(selectedSpeed.value)
    } catch (err) {
      console.warn('Failed to start session:', err)
    }
  }
  isPlaying.value = true
  currentScore.value = 0
  await nextTick()
  snakeGameRef.value?.startGame()
}
```

Remove the `gameStartTimer` variable and its `clearTimeout` in `onBeforeUnmount`.

- [ ] **Step 3: Commit**

```bash
git add client/src/views/GameView.vue
git commit -m "fix(client): replace setTimeout with nextTick for game start timing"
```

---

### Task 13: Remove console.log statements

`LoginView.vue:162` and `RegisterView.vue:190` contain `console.log` for unimplemented Google login.

**Files:**
- Modify: `client/src/views/LoginView.vue:160-162`
- Modify: `client/src/views/RegisterView.vue:189-191`

- [ ] **Step 1: Replace with user-facing feedback**

In `LoginView.vue`, replace:

```js
function handleGoogleLogin() {
  console.log('Google login not implemented')
}
```

with:

```js
function handleGoogleLogin() {
  message.info('Google 登录即将上线，敬请期待')
}
```

Add `useMessage` import if not already present:
```js
import { NForm, NAlert, useMessage } from 'naive-ui'
const message = useMessage()
```

- [ ] **Step 2: Same for RegisterView.vue**

Replace:

```js
function handleGoogleRegister() {
  console.log('Google register not implemented')
}
```

with:

```js
function handleGoogleRegister() {
  message.info('Google 注册即将上线，敬请期待')
}
```

Add `useMessage`:
```js
import { useMessage } from 'naive-ui'
const message = useMessage()
```

- [ ] **Step 3: Commit**

```bash
git add client/src/views/LoginView.vue client/src/views/RegisterView.vue
git commit -m "fix(client): replace console.log with user-facing messages for unimplemented features"
```

---

### Task 14: Delete unused client/src/lib/supabase.js

This file creates a client-side Supabase instance that's never used. All API calls go through the backend.

**Files:**
- Delete: `client/src/lib/supabase.js`

- [ ] **Step 1: Verify no imports exist**

Run: `grep -r "from.*lib/supabase" client/src/` (excluding node_modules)

Expected: No results (only `api.js` is imported by views).

- [ ] **Step 2: Delete the file**

```bash
rm client/src/lib/supabase.js
```

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/supabase.js
git commit -m "chore(client): remove unused Supabase client module"
```

---

## Phase 3: P3 Engineering Foundations

---

### Task 15: Add .env.example files

Document required environment variables for both client and server.

**Files:**
- Create: `server/.env.example`
- Create: `client/.env.example`

- [ ] **Step 1: Create server/.env.example**

```env
# Supabase connection (required)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your-anon-key-here

# Session encryption (required in production)
SESSION_SECRET=change-me-to-a-random-string

# Server port
PORT=4000

# CSRF allowed origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000

# Environment
NODE_ENV=development
```

- [ ] **Step 2: Create client/.env.example**

```env
# Supabase connection (for Realtime if needed)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 3: Add .env to .gitignore if not already present**

Verify `.gitignore` contains `.env` or `*.env`. Add if missing:

```
.env
.env.local
```

- [ ] **Step 4: Commit**

```bash
git add server/.env.example client/.env.example .gitignore
git commit -m "docs: add .env.example files for server and client"
```

---

### Task 16: Set up npm workspaces

Unify dependency management with a root-level workspace configuration.

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Update root package.json**

Replace the root `package.json`:

```json
{
  "name": "kinetic-arcade",
  "private": true,
  "workspaces": [
    "client",
    "server"
  ],
  "scripts": {
    "dev:client": "npm run dev --workspace=client",
    "dev:server": "npm run dev --workspace=server",
    "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\"",
    "build": "npm run build --workspace=client",
    "test:client": "npm run test --workspace=client",
    "test:server": "npm run test --workspace=server",
    "test": "npm run test:client && npm run test:server"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

- [ ] **Step 3: Verify workspace scripts**

```bash
npm run test:server
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: set up npm workspaces for client and server"
```

---

### Task 17: Add basic server unit tests

The server has zero test files. Add foundational tests for auth and middleware.

**Files:**
- Create: `server/src/__tests__/auth-routes.test.js`
- Create: `server/src/__tests__/auth-middleware.test.js`

- [ ] **Step 1: Create auth middleware unit tests**

Create `server/src/__tests__/auth-middleware.test.js`:

```js
import { describe, it, expect } from '@jest/globals'
import { authMiddleware } from '../middleware/auth.js'

describe('authMiddleware', () => {
  it('returns 401 when no session token exists', async () => {
    const ctx = {
      session: {},
      status: 200,
      body: null,
      state: {}
    }
    const next = async () => {}
    await authMiddleware(ctx, next)
    expect(ctx.status).toBe(401)
    expect(ctx.body.error).toBe('Missing authenticated session')
  })

  it('returns 401 when session is null', async () => {
    const ctx = {
      session: null,
      status: 200,
      body: null,
      state: {}
    }
    const next = async () => {}
    await authMiddleware(ctx, next)
    expect(ctx.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd server && npx cross-env NODE_OPTIONS=--experimental-vm-modules npx jest src/__tests__/auth-middleware.test.js --verbose`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/__tests__/auth-middleware.test.js
git commit -m "test(server): add auth middleware unit tests"
```

---

### Task 18: Add basic client component tests with Vitest

**Files:**
- Create: `client/src/components/ui/__tests__/NeonButton.test.js`
- Create: `client/vitest.config.js` (if not present)

- [ ] **Step 1: Create vitest config if missing**

Check if `client/vitest.config.js` or vitest config in `client/vite.config.js` exists. If not, create `client/vitest.config.js`:

```js
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom'
  }
})
```

- [ ] **Step 2: Create NeonButton test**

Create `client/src/components/ui/__tests__/NeonButton.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NeonButton from '../NeonButton.vue'

describe('NeonButton', () => {
  it('renders slot content', () => {
    const wrapper = mount(NeonButton, {
      slots: { default: '点击我' }
    })
    expect(wrapper.text()).toContain('点击我')
  })

  it('applies primary class by default', () => {
    const wrapper = mount(NeonButton)
    expect(wrapper.classes()).toContain('neon-btn--primary')
  })

  it('applies default class when type is default', () => {
    const wrapper = mount(NeonButton, {
      props: { type: 'default' }
    })
    expect(wrapper.classes()).toContain('neon-btn--default')
  })

  it('is disabled when loading', () => {
    const wrapper = mount(NeonButton, {
      props: { loading: true }
    })
    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  it('emits click event', async () => {
    const wrapper = mount(NeonButton)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
```

- [ ] **Step 3: Run test**

Run: `cd client && npx vitest run src/components/ui/__tests__/NeonButton.test.js`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add client/vitest.config.js client/src/components/ui/__tests__/NeonButton.test.js
git commit -m "test(client): add NeonButton component unit tests with Vitest"
```

---

## Summary

| Phase | Tasks | Scope |
|-------|-------|-------|
| **Phase 0: P0 Blockers** | Tasks 1-3 | Fix leaderboard route not mounted, route prefix mismatch, `.single()` bug |
| **Phase 1: P1 Security** | Tasks 4-6 | Env var validation, CSRF bypass fix, rate limiter memory leak |
| **Phase 2: P2 Quality** | Tasks 7-14 | Supabase dedup, Pinia migration, API format, responsive canvas, component extraction, cleanup |
| **Phase 3: P3 Foundations** | Tasks 15-18 | .env.example, npm workspaces, server tests, client tests |

Total: **18 tasks**, estimated **~60 bite-sized steps**.

Execute in order: Phase 0 -> 1 -> 2 -> 3. Each task is independently committable.
