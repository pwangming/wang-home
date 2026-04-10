# Kinetic Arcade - 贪吃蛇游戏实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan.

**Goal:** 实现霓虹风格贪吃蛇游戏，含用户认证、游戏、排行榜；未登录访客可试玩但成绩不保存

**Architecture:**
- 前端: Vue 3 + Vite + Naive UI，通过 Koa API 与 Supabase 交互
- 后端: Koa 作为 API 网关，负责认证校验和业务逻辑
- 数据库: Supabase PostgreSQL + Auth（仅注册/登录用户可保存成绩）

**Tech Stack:** Vue 3, Vite, Naive UI, Pinia, Vue Router, Vitest, Koa, Jest, Supabase CLI, Playwright CLI

---

## 偏差修复记录

### 2026-03-30 00:00 - 分数防伪造
分数提交流程改为两阶段：`POST /api/game-sessions/start` 创建一次性 session，`POST /api/leaderboard` 凭 sessionId 提交并验证

### 2026-03-30 00:10 - 游客规则统一
统一为"未登录访客仅可试玩，成绩不保存"，删除匿名登录与匿名入榜

### 2026-03-30 00:20 - Profile 自动建档
账号创建与 profile 建档原子化，依赖数据库触发器而非应用层手工插入

### 2026-03-30 00:30 - 邮箱确认状态处理
`needsEmailConfirmation=true` 时不进入登录态，前端显示待确认提示

### 2026-03-30 00:40 - Cookie 会话安全
统一使用 Koa HttpOnly 会话 Cookie，Supabase token 仅存服务端 session，前端不存储可读 token

### 2026-03-30 00:50 - 限流策略
高风险接口（登录/注册/游戏开始/分数提交）必须限流，本地内存限流，生产切换共享存储

### 2026-03-30 01:00 - 排行榜 API 网关
收回 `leaderboard_best` 直读权限，前端统一通过 Koa API 读取

### 2026-03-30 01:10 - 排名语义明确
`/api/leaderboard/rank/me` 返回真实名次，按 `best_score desc, best_score_at asc, user_id asc` 计算

### 2026-03-30 01:20 - E2E 网络断言时机
未登录路径测试需在 `page.goto()` 前开始监听请求，覆盖整个会话

### 2026-03-30 01:30 - 会话模型统一
统一为"浏览器仅持 Koa Cookie，Supabase token 存服务端 session"

### 2026-03-30 01:40 - RLS 更新策略
`game_sessions` 增加"仅允许更新自己 pending session"的受限 update 策略

### 2026-03-30 01:50 - 触发器时机
排行榜刷新在 verified 成绩写入成功时触发，而非开始对局时

### 2026-03-30 02:00 - CSRF 防护
所有写接口必须校验 `Origin`，本地开发允许 `ALLOWED_ORIGINS`

### 2026-03-30 02:10 - 用户名规范化
统一规范化字段与校验规则，自动建档与手动改名共用同一逻辑

---

## 文件结构

```
/home
├── client/
│   ├── src/
│   │   ├── components/game/     # SnakeGame, GameSidebar, LeaderboardModal
│   │   ├── views/               # LoginView, RegisterView, GameView
│   │   ├── stores/auth.js       # Pinia auth store
│   │   ├── lib/api.js           # Koa API client
│   │   ├── lib/supabase.js      # Supabase client (realtime)
│   │   └── router/index.js
│   └── tests/                  # Vitest + Playwright E2E
├── server/
│   ├── src/
│   │   ├── routes/auth.js       # /register, /login, /logout, /me
│   │   ├── routes/leaderboard.js # /leaderboard, /rank/me, /game-sessions/start
│   │   ├── middleware/auth.js    # authMiddleware, createUserScopedClient
│   │   └── middleware/rateLimit.js
│   └── tests/
├── supabase/migrations/001_initial_schema.sql
```

---

## 环境变量

**`client/.env.local`**
```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<from supabase status>
```

**`server/.env`**
```
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<from supabase status>
SESSION_SECRET=<random-secret>
RATE_LIMIT_STORE=memory
ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
```

---

## API 契约

### 认证接口

| 接口 | 方法 | 请求体 | 响应 | 说明 |
|------|------|--------|------|------|
| `/api/auth/register` | POST | `{email, password, username}` | `{success, user, needsEmailConfirmation?}` | HttpOnly Cookie |
| `/api/auth/login` | POST | `{email, password}` | `{success, user}` | HttpOnly Cookie |
| `/api/auth/logout` | POST | - | `{success}` | 清除 Cookie |
| `/api/auth/me` | GET | - | `{user}` | 验证 Cookie 会话 |

### 排行榜接口

| 接口 | 方法 | 请求体 | 响应 | 说明 |
|------|------|--------|------|------|
| `/api/leaderboard` | GET | - | `{leaderboard: [...]}` | 分页，按 `best_score desc` 排序 |
| `/api/leaderboard/rank/me` | GET | - | `{rank}` | 返回用户排名，无分数返回 `null` |
| `/api/game-sessions/start` | POST | `{speedMultiplier}` | `{sessionId}` | 创建对局，需认证 |
| `/api/leaderboard` | POST | `{sessionId, score, speedMultiplier, scoreMultiplier, endedAt, durationMs}` | `{success}` | 提交成绩，需认证 |

### 限流阈值

| 接口 | 阈值 |
|------|------|
| `POST /login` | 每 IP 15min 5次 |
| `POST /register` | 每 IP 1hr 3次 |
| `POST /game-sessions/start` | 每用户 1min 10次 |
| `POST /leaderboard` | 每用户 1min 10次 |

---

## 数据库 Schema

```sql
-- profiles: 自动建档
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  username_normalized text not null unique,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- game_sessions: 两阶段提交
create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  session_id uuid unique not null default gen_random_uuid(),
  score integer not null check (score >= 0),
  speed_multiplier numeric(4,2) not null check (speed_multiplier > 0),
  score_multiplier numeric(4,2) not null check (score_multiplier > 0),
  started_at timestamptz default now(),
  ended_at timestamptz,
  is_verified boolean default false,
  verification_reason text,
  played_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.game_sessions enable row level security;

create policy "profiles publicly readable" on public.profiles for select using (true);
create policy "users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "users can insert own sessions" on public.game_sessions for insert with check (auth.uid() = user_id);
create policy "users can read own sessions" on public.game_sessions for select using (auth.uid() = user_id);
create policy "users can finalize own pending sessions" on public.game_sessions for update using (auth.uid() = user_id and ended_at is null and is_verified = false);

-- 自动建档触发器
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare
  raw_username text := coalesce(new.raw_user_meta_data->>'username', 'player_' || left(replace(new.id::text, '-', ''), 12));
  normalized_username text := lower(regexp_replace(trim(raw_username), '[^a-zA-Z0-9_]', '', 'g'));
begin
  if normalized_username = '' then
    normalized_username := 'player_' || left(replace(new.id::text, '-', ''), 12);
  end if;
  insert into public.profiles (id, username, username_normalized) values (new.id, normalized_username, normalized_username) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- leaderboard_events: realtime 触发
create table public.leaderboard_events (id bigserial primary key, created_at timestamptz default now());
alter table public.leaderboard_events enable row level security;
create policy "leaderboard events publicly readable" on public.leaderboard_events for select using (true);

create or replace function public.notify_leaderboard_refresh() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.leaderboard_events default values; return null; end;
$$;

create trigger trg_notify_leaderboard_refresh after update of is_verified on public.game_sessions
for each row when (old.is_verified = false and new.is_verified = true) execute function public.notify_leaderboard_refresh();

-- leaderboard_best view
create or replace view public.leaderboard_best as
with ranked as (
  select user_id, score as best_score, played_at as best_score_at,
    row_number() over (partition by user_id order by score desc, played_at asc, id asc) as rn
  from public.game_sessions where is_verified = true
)
select r.user_id, p.username, p.avatar_url, r.best_score, r.best_score_at
from ranked r join public.profiles p on p.id = r.user_id where r.rn = 1
order by r.best_score desc, r.best_score_at asc, r.user_id asc;

-- realtime
alter publication supabase_realtime add table public.leaderboard_events;
```

---

## 实施检查清单

| Task | 名称 | 验收条件 |
|------|------|---------|
| 1 | 前端初始化 | Vite dev server 启动在 3000 端口 |
| 2 | 后端初始化 | Koa server 启动在 4000 端口，health check 正常 |
| 3 | Supabase 初始化 | profiles/game_sessions 表存在，trigger 验证通过，邮箱确认已关闭 |
| 4 | 认证中间件 | `authMiddleware` 验证 HttpOnly session cookie，测试通过 |
| 5 | 认证路由 | 登录/注册/登出/ME 正常工作，Cookie 会话正常，限流生效 |
| 6 | 排行榜路由 | 列表/排名/提交接口正常，两阶段提交验证，限流生效 |
| 7 | 前端 API 客户端 | credentials: include，错误抛出正确 |
| 8 | 认证 Store | init/login/register/logout 正常，Vitest 通过 |
| 9 | 登录页 | 表单验证，跳转 /game，Playwright E2E 通过 |
| 10 | 注册页 | 两种成功态处理，Playwright E2E 通过 |
| 11 | 贪吃蛇组件 | 速度/分数倍数映射，碰撞检测，Escape 结束，Vitest 通过 |
| 12 | 侧边栏组件 | 显示速度/分数倍数，Vitest 通过 |
| 13 | 排行榜弹窗 | Realtime 订阅/取消，错误处理，Vitest 通过 |
| 14 | 游戏主页 | 游客警告，分数提交反馈，Playwright E2E 通过 |
| 15 | 全流程 E2E | 注册→游戏→提交→排行榜，未登录不提交分数 |

---

## 关键验收项

- [ ] 登录成功下发 HttpOnly Cookie；注册返回 `needsEmailConfirmation=true` 时不进入登录态
- [ ] 注册后 profile 自动创建，username 规范化校验
- [ ] 写接口限流超限返回 429
- [ ] 写接口校验 Origin
- [ ] pending session 可更新，已完成 session 不可改
- [ ] `/rank/me` 返回真实名次，并列按时间先到先得
- [ ] `leaderboard_best` 不直连前端，统一经 Koa API
- [ ] verified 提交才触发 realtime，开始对局不触发
- [ ] sessionId 仅一次性，重复提交失败
- [ ] Realtime 断开显示提示
- [ ] 未登录玩家可试玩，不提交分数
- [ ] 分数提交显示"提交中→成功/失败"反馈
- [ ] 速度 1.0/1.2/1.5/2.0，分数倍数 1.0/1.5/2.0/3.0 自动映射

---

## 上线前准备

1. `supabase link --project-ref <ref>` 链接云端
2. `supabase db push` 推送迁移
3. 更新生产环境变量
4. 添加 pg_cron 清理 `leaderboard_events`（保留7天）
