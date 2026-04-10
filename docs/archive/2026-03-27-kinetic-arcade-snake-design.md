# Kinetic Arcade - 贪吃蛇游戏设计文档（修订版）

## 1. 项目概述

- **项目名称**: Kinetic Arcade - 霓虹贪吃蛇
- **类型**: 全栈 Web 游戏
- **核心功能**: 玩家在网页游玩贪吃蛇，登录后可提交成绩进入排行榜，支持未登录试玩与实时排行刷新
- **目标用户**: 休闲游戏玩家

## 2. 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 + Vite |
| UI 组件库 | Naive UI |
| 后端框架 | Koa (Node.js) |
| 数据库 & Auth | Supabase (PostgreSQL + Auth) |
| 状态管理 | Pinia |
| 路由 | Vue Router |
| 实时数据 | Supabase Realtime（唯一实时通道） |

## 3. 系统架构

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Vue 3 (Vite)  │ ←──→ │   Koa Backend   │ ←──→ │    Supabase     │
│   + Naive UI    │      │   (Node.js)     │      │  PostgreSQL     │
└─────────────────┘      └─────────────────┘      │  + Auth         │
                                                   │  + Realtime     │
                                                   └─────────────────┘
```

**前端职责**:
- 页面路由与 UI 渲染
- 游戏状态管理与交互
- 调用 Koa API 提交/查询数据
- 订阅 Supabase Realtime 获取排行榜刷新

**Koa 后端职责**:
- 业务逻辑与参数校验
- 鉴权（校验 Supabase JWT）
- 排名计算与响应组装

**Supabase 职责**:
- 用户认证（邮箱/密码登录）
- 数据存储
- 数据变更推送（Realtime）

## 4. 关键业务规则

### 4.1 排名口径（统一定义）

- 排行榜采用“**每个用户最高分**”参与排名。
- 排序规则：
1. `best_score` 降序
2. `best_score_at` 升序（更早达到该分数者靠前）
3. `user_id` 升序（最终稳定排序）
- 用户个人历史战绩在 `game_sessions` 保留，不直接作为排行榜展示主体。

### 4.2 试玩模式规则

- 未登录访客可直接进入 `/game` 试玩。
- 未登录访客的成绩**不保存**，也**不参与排行榜**。
- 用户需要先完成注册/登录，后续成绩才可提交并参与排行榜。

## 5. 数据库设计

### 5.1 表结构

#### `profiles`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK, FK -> auth.users(id) | 用户 ID |
| username | text | NOT NULL, UNIQUE | 展示名 |
| username_normalized | text | NOT NULL, UNIQUE | 规范化用户名 |
| avatar_url | text | NULL | 头像 |
| created_at | timestamptz | NOT NULL DEFAULT now() | 创建时间 |
| updated_at | timestamptz | NOT NULL DEFAULT now() | 更新时间 |

> `profiles` 必须在 `auth.users` 创建后自动建档，避免出现已注册但无 profile 的孤儿账号。

#### `game_sessions`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK DEFAULT gen_random_uuid() | 局记录 ID |
| user_id | uuid | NOT NULL, FK -> profiles(id) | 用户 ID |
| session_id | uuid | NOT NULL, UNIQUE | 一次性对局会话 ID |
| score | integer | NOT NULL CHECK (score >= 0) | 分数 |
| speed_multiplier | numeric(4,2) | NOT NULL CHECK (speed_multiplier > 0) | 速度倍数 |
| score_multiplier | numeric(4,2) | NOT NULL CHECK (score_multiplier > 0) | 得分倍数 |
| started_at | timestamptz | NOT NULL DEFAULT now() | 对局开始时间 |
| ended_at | timestamptz | NULL | 对局结束时间 |
| submit_source | text | NULL | 提交来源 |
| is_verified | boolean | NOT NULL DEFAULT false | 是否通过服务端最小校验 |
| verification_reason | text | NULL | 校验结论/失败原因 |
| played_at | timestamptz | NOT NULL DEFAULT now() | 对局时间 |
| created_at | timestamptz | NOT NULL DEFAULT now() | 创建时间 |

### 5.2 排行榜查询视图（建议）

```sql
create view leaderboard_best as
with ranked as (
  select
    gs.user_id,
    gs.score as best_score,
    gs.played_at as best_score_at,
    row_number() over (
      partition by gs.user_id
      order by gs.score desc, gs.played_at asc, gs.id asc
    ) as rn
  from game_sessions gs
  where gs.is_verified = true
)
select
  user_id,
  best_score,
  best_score_at
from ranked
where rn = 1;
```

> 实际实现可改为物化视图或 SQL 函数；核心是统一排名口径，不允许前后端各算一套。

### 5.3 RLS 策略（完整最小集）

```sql
alter table profiles enable row level security;
alter table game_sessions enable row level security;

-- profiles: 可公开读用户名与头像；用户可改自己的资料
create policy "profiles are publicly readable" on profiles
  for select using (true);
create policy "users can update own profile" on profiles
  for update using (auth.uid() = id);
create policy "users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- game_sessions: 只允许写入/读取自己的原始局数据
create policy "users can insert own sessions" on game_sessions
  for insert with check (auth.uid() = user_id);
create policy "users can read own sessions" on game_sessions
  for select using (auth.uid() = user_id);
create policy "users can finalize own pending sessions" on game_sessions
  for update using (auth.uid() = user_id and ended_at is null and is_verified = false)
  with check (auth.uid() = user_id);
```

> 公共排行榜读取通过后端聚合接口完成，避免直接暴露原始局数据。

- `leaderboard_best` 不对前端或匿名客户端直接开放查询权限。
- 排行榜读取统一通过 Koa API 聚合输出，便于统一做分页、限流、字段裁剪、审计和缓存。
- 排行榜实时刷新事件仅在成绩通过校验并真正影响入榜数据时触发，不在“开始对局”阶段触发。

### 5.4 Profile 建档规则

- 不允许依赖应用层“注册成功后再手动插入 `profiles`”作为唯一建档手段。
- 应通过数据库触发器、事务型函数或等价原子机制，在 `auth.users` 创建后自动生成 `profiles` 记录。
- 若注册时需要用户名，可先生成临时默认值，再通过受控接口更新；不得接受“认证用户已创建但 profile 缺失”的最终状态。

### 5.5 用户名规则

- 用户名需先做规范化，再进入存储和唯一性判断。
- 建议规范化规则：去首尾空白、转小写、限制字符集为 `a-z0-9_`。
- 需限制长度，并设置保留词黑名单。
- 排行榜展示名与用户手动改名都必须走同一套校验与规范化流程。

## 6. 鉴权与会话流程

1. 前端通过 Koa 认证接口完成注册/登录。
2. Koa 在登录成功后创建服务端会话，并下发 `HttpOnly`、`Secure`、`SameSite` 的会话 Cookie。
3. 浏览器 Cookie 只承载 Koa 会话标识；Supabase `access token` / `refresh token` 仅保存在服务端会话中。
4. 前端后续请求通过 Cookie 携带会话，不在浏览器端保存可读 token。
5. Koa 中间件从服务端会话中恢复 Supabase 凭证并校验当前用户身份。
6. 所有写接口均以服务端解析出的 `user_id` 为准，忽略客户端提交的 `user_id`。

### 6.1 邮箱确认规则

- 若部署环境开启邮箱确认，注册成功后可返回 `needsEmailConfirmation = true`，此时前端不得将用户视为已登录。
- 仅当用户持有有效登录会话时，才允许提交成绩和访问需要登录态的接口。
- 未确认邮箱但尚未完成登录的用户，可查看确认提示，但不能进入“已登录可保存成绩”状态。

### 6.2 会话安全基线

- 前端不得将 `access_token`、`refresh_token` 或其他长期凭证存入 `localStorage` / `sessionStorage`。
- 认证成功后仅使用服务端下发的 `HttpOnly Cookie` 维持登录态。
- 浏览器端 Cookie 不直接作为 Supabase JWT 使用，Supabase 原始凭证仅保存在 Koa 服务端会话中。
- 生产环境 Cookie 必须启用 `HttpOnly`、`Secure`，并至少设置 `SameSite=Lax`。
- 需配套启用 CSP，避免 XSS 后直接窃取或滥用会话。
- 所有改数据接口必须启用 CSRF 防护；至少校验 `Origin`，推荐同时校验 `Referer` 或使用 CSRF token / 双提交 Cookie。

### 6.3 限流与滥用防护

- 以下接口必须启用限流：`POST /api/auth/login`、`POST /api/auth/register`、`POST /api/game-sessions/start`、`POST /api/leaderboard`。
- 限流维度至少包含 IP；对已登录接口还应包含 `user_id` 维度。
- 超限时统一返回 `429`，并使用一致的错误消息。
- 本地开发可使用内存限流器验证逻辑；生产环境应替换为 Redis 或其他共享存储实现，避免多实例限流失效。

## 7. API 设计

### 7.1 认证相关

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 邮箱注册 |
| POST | /api/auth/login | 邮箱登录 |
| POST | /api/auth/logout | 登出 |
| GET | /api/auth/me | 获取当前用户 |

### 7.2 排行榜相关

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/game-sessions/start | 创建一次性对局 session |
| GET | /api/leaderboard?page=1&pageSize=20 | 获取排行榜（按统一口径） |
| GET | /api/leaderboard/rank/me | 获取当前登录用户排名摘要 |
| POST | /api/leaderboard | 提交已完成对局的成绩并完成校验 |

> 删除 `GET /api/leaderboard/subscribe`（SSE 方案），实时更新统一走 Supabase Realtime。

### 7.3 请求/响应示例

**POST /api/game-sessions/start**
```json
{
  "speedMultiplier": 1.5
}
```

```json
{
  "success": true,
  "data": {
    "sessionId": "2bbf0d40-18dd-4a50-9851-dc45b6a7b0b2",
    "startedAt": "2026-03-20T10:00:00Z"
  }
}
```

**POST /api/leaderboard**
```json
{
  "sessionId": "2bbf0d40-18dd-4a50-9851-dc45b6a7b0b2",
  "score": 1240,
  "speedMultiplier": 1.5,
  "scoreMultiplier": 2.0,
  "endedAt": "2026-03-20T10:03:00Z",
  "durationMs": 180000
}
```

```json
{
  "success": true,
  "data": {
    "bestScore": 1240,
    "rank": 5,
    "totalPlayers": 100,
    "verified": true
  }
}
```

**GET /api/leaderboard?page=1&pageSize=2**
```json
{
  "success": true,
  "data": [
    { "rank": 1, "username": "Player1", "bestScore": 5000, "bestScoreAt": "2026-03-20T10:00:00Z" },
    { "rank": 2, "username": "Player2", "bestScore": 4500, "bestScoreAt": "2026-03-21T09:00:00Z" }
  ],
  "meta": { "page": 1, "pageSize": 2, "totalPlayers": 100 }
}
```

**GET /api/leaderboard/rank/me**
```json
{
  "success": true,
  "data": {
    "rank": 5,
    "bestScore": 1240,
    "bestScoreAt": "2026-03-20T10:00:00Z",
    "totalPlayers": 100
  }
}
```

## 8. 页面结构

| 页面 | 路径 | 说明 |
|------|------|------|
| 登录页 | /login | 邮箱/密码登录 |
| 注册页 | /register | 邮箱注册 |
| 游戏主页 | /game | 贪吃蛇游戏 + 侧边栏 |
| 排行榜弹窗 | (Modal) | 游戏内弹出 |

## 9. 功能清单（当前仓库状态：设计中）

### 9.1 认证功能
- [ ] 邮箱/密码注册
- [ ] 邮箱/密码登录
- [ ] 未登录试玩模式（成绩不保存）

### 9.2 游戏功能
- [ ] 贪吃蛇游戏界面
- [ ] 得分显示
- [ ] 速度/得分倍数显示

### 9.3 排行榜功能
- [ ] 分数提交
- [ ] 排行榜查询
- [ ] 当前用户排名查询
- [ ] 实时排名变化（Supabase Realtime）

## 10. 项目结构

### 10.1 当前仓库（2026-03-27）

```
/home
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-03-27-kinetic-arcade-snake-design.md
```

### 10.2 目标结构（实施后）

```
/home
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   └── game/
│   │   ├── views/
│   │   │   ├── LoginView.vue
│   │   │   ├── RegisterView.vue
│   │   │   └── GameView.vue
│   │   ├── stores/
│   │   ├── router/
│   │   ├── lib/
│   │   │   └── api.js
│   │   └── App.vue
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   └── leaderboard.js
│   │   ├── middleware/
│   │   └── index.js
│   └── package.json
└── docs/
```

## 11. 设计风格

- **主题**: 霓虹/Neon
- **主色调**: 深色背景 + 霓虹渐变
- **布局**: 桌面优先，兼顾移动端自适应
- **组件风格**: 圆角卡片、毛玻璃、发光阴影
