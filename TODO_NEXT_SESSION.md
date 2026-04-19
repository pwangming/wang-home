# Next Session TODO

> Created end of session 2026-04-19. Two bugs remain. Start with Bug 3 (simpler), then Bug 2.

---

## Status Check First

```bash
# 1. Verify PR #25 (develop→main) CI status
gh pr checks 25

# 2. If all green, merge to production
gh pr merge 25 --merge

# 3. Verify production
# Open https://client-inky-two.vercel.app → check leaderboard renders dark
```

---

## Bug 3 — Login shows email, switches to username

**Branch:** `fix/user-display-username`

### Root Cause (CONFIRMED)

Two problems, both in `server/src/routes/auth.js`:

**1. Login route (line ~103) returns no username:**
```js
// WRONG — current code
ok(ctx, { user: { id: data.user.id, email: data.user.email } })
```
Frontend gets `{ id, email }` → shows email → then `init()` calls `/me` → gets username → replaces. This is the flash.

**2. Register route (line ~70) same problem:**
```js
// WRONG — current code
ok(ctx, { user: { id: data.user.id, email: data.user.email } })
```
Profile was already fetched on line ~52 for verification but username not included in response.

### Fix Plan

**`server/src/routes/auth.js`** — two changes:

Change 1 — Register route: profile already fetched, just use it:
```js
// BEFORE (line ~70)
ok(ctx, { user: { id: data.user.id, email: data.user.email } })

// AFTER
ok(ctx, { user: { id: data.user.id, email: data.user.email, username: profile.username } })
```

Change 2 — Login route: add profile query after session cookie set:
```js
// BEFORE (line ~103): just returns id + email

// AFTER: add profile query (same as /me does)
const userScopedClient = createUserScopedClient(data.session.access_token)
const { data: profileData } = await userScopedClient
  .from('profiles')
  .select('username')
  .eq('id', data.user.id)
  .maybeSingle()

ok(ctx, { user: { id: data.user.id, email: data.user.email, username: profileData?.username || null } })
```

### Frontend Impact

- `stores/auth.js` already does `this.user = data.user` → if backend returns username, it's there
- No frontend changes needed (assuming sidebar reads `user.username`)
- Verify sidebar uses `user.username` (not `user.email`) — check `GameSidebar.vue`

### Existing Users Without Username

Login response returns `username: null` if profile has no username. Check how sidebar renders null:
- If sidebar shows `user.username || user.email` → null triggers email fallback → no improvement
- If sidebar shows `user.username` → null shows blank → worse
- Fix: ensure sidebar does `user.username || user.email.split('@')[0]` as last resort fallback

### Tests to Write

`server/tests/routes/auth.test.js`:
- Login response includes `username` field
- Register response (when email confirm not needed) includes `username` field
- Username is `null` when profile not found (not undefined, not missing)

`client/tests/` (if sidebar has unit tests):
- Displays username when available
- Falls back to email prefix when username is null

### Files to Touch

- `server/src/routes/auth.js` — 2 changes (login + register response)
- `client/src/components/game/GameSidebar.vue` — verify/fix null fallback
- `server/tests/routes/auth.test.js` — regression tests

---

## Bug 2 — Email verify flow broken (more complex, do AFTER Bug 3)

**Branch:** `fix/register-email-verify`

### Root Cause (CONFIRMED)

1. Register → `needsEmailConfirmation: true` → frontend shows red text `'请先完成邮箱验证后再登录'`
2. User clicks email magic link → redirects to site with `#access_token=...&type=signup` in URL hash
3. **Nobody handles this hash** → user lands on homepage with no feedback, still not logged in in Koa session
4. Supabase client-side reads the hash and creates a browser session, but Koa session (server-side cookie) is never updated

### Why It's Complex

Project uses **server-side sessions (Koa cookie)**, not client-side Supabase sessions. So:
- Magic link → browser gets Supabase token in hash → client-side Supabase session created automatically
- But Koa session still empty → all `/api/*` calls fail with 401
- Need extra step: client reads Supabase token → calls backend `/api/auth/callback` → backend sets Koa session

### Fix Plan (Option A — minimum viable, recommended first)

**Step 1: Server — add `/api/auth/callback` route**

```js
// POST /api/auth/callback
// Client sends { accessToken, refreshToken } after Supabase magic link lands
router.post('/callback', createCsrfMiddleware(), async (ctx) => {
  const { accessToken, refreshToken } = ctx.request.body
  if (!accessToken) { fail(ctx, 400, 'accessToken required'); return }
  
  // Verify token with Supabase
  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data.user) { fail(ctx, 401, 'Invalid token'); return }
  
  // Set Koa session
  ctx.session.supabaseAccessToken = accessToken
  ctx.session.supabaseRefreshToken = refreshToken
  ctx.session.userId = data.user.id
  
  // Fetch profile
  const userScopedClient = createUserScopedClient(accessToken)
  const { data: profile } = await userScopedClient
    .from('profiles').select('username').eq('id', data.user.id).maybeSingle()
  
  ok(ctx, { user: { id: data.user.id, email: data.user.email, username: profile?.username || null } })
})
```

**Step 2: Client — handle hash on app load**

In `App.vue` or a new `useAuthCallback.js` composable:
```js
import { supabase } from './lib/supabaseClient'

// On mount, check if Supabase hash is in URL (magic link callback)
onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session && window.location.hash.includes('type=signup')) {
    // Exchange Supabase session for Koa session
    const result = await api.auth.callback(session.access_token, session.refresh_token)
    authStore.user = result.user
    
    // Clear hash
    history.replaceState(null, '', window.location.pathname)
    
    // Show toast
    message.success('邮箱验证成功！欢迎加入')
    router.push('/game')
  }
})
```

**Step 3: Add to `lib/api.js`:**
```js
auth: {
  // ...existing...
  callback: (accessToken, refreshToken) =>
    request('/auth/callback', { method: 'POST', body: { accessToken, refreshToken } })
}
```

### Security Note

The `/api/auth/callback` route accepts a Supabase JWT. Always call `supabase.auth.getUser(token)` (server-side verification) — never trust the token payload directly. This is already the pattern used in `authMiddleware`.

**Must run `security-reviewer` agent before committing this route.**

### Files to Touch

- `server/src/routes/auth.js` — add `/callback` route
- `client/src/App.vue` — add hash handler on mount (or extract to composable)
- `client/src/lib/api.js` — add `auth.callback()`
- `server/tests/routes/auth.test.js` — tests for `/callback`
- `client/tests/composables/useAuthCallback.test.js` (if extracted to composable)

### Tests to Write

Server:
- Valid Supabase token → 200 + user + Koa session set
- Invalid/expired token → 401
- Missing accessToken → 400

Client (composable):
- Hash with `type=signup` triggers callback flow
- Non-signup hash is ignored
- Toast shown on success
- Router redirects to `/game`

---

## Order of Work

```
1. gh pr checks 25 → merge if green
2. git checkout develop && git pull
3. git checkout -b fix/user-display-username
4. Bug 3 (server login+register response fix) → tests → PR → develop
5. git checkout develop && git pull
6. git checkout -b fix/register-email-verify
7. Bug 2 (email callback flow) → tests → security-reviewer → PR → develop
8. develop → main PR (Bug 2 + Bug 3 bundled, per strategy C)
```

## Done in Previous Session

- [x] Bug 1: `darkTheme` not applied to Naive UI → PR #24 merged to develop
- [x] PR #25 created (develop→main for Bug 1) — CI green, pending merge
- [x] Global settings optimized (model/effortLevel/permissions)
- [x] everything-claude-code plugin disabled (230→40 skills)
- [x] claude-mem log level silenced
