# 计划 4：接入支付（学习型 MVP）

> 状态：✅ 方案确认（2026-04-20）——Stripe 测试模式 + 单一皮肤包买断，学习流程为主
> 分支：`feat/payment-learning`（待创建）
> 基分支：`develop`
> **硬依赖**：2.3（皮肤基建已就绪，本计划只加 entitlement 门闸）+ 单实例部署复核（见 README 项目级约束 1）
> 预计工作量：实现 1 ~ 1.5 周（学习 + 调试）
> 模型主力：**最强 Opus 全程**（支付几乎所有环节都是安全关键）

---

## 🎯 学习目标

个人项目，不追求真实销售。目标：

1. 跑通 Stripe Checkout 完整流程（测试模式）
2. 理解 webhook 签名验证 + 幂等性为什么关键
3. 学会权益模型（purchase → entitlement 解耦）
4. 体会支付安全的关键防线

**不做**：真实收款、税务、发票、合规、订阅、国内支付、退款策略页、订单历史 UI、促销。

---

## 📋 商业决策（已简化确认）

| 项 | 决策 | 理由 |
|---|---|---|
| Q1 卖什么 | **E 一次性买断皮肤包** | 最简流程，无 recurring |
| Q2 市场 | **海外 Stripe 测试模式** | 测试卡即可，不涉合规 |
| Q3 订阅/买断 | **买断** | 无 webhook 续费复杂度 |
| Q4 退款 | **不主动做退款 UI**，但后端处理 `charge.refunded` webhook 撤权益 | 学习幂等/状态机 |
| Q5 税务/发票 | **跳过**（Stripe Tax 不启用） | 无真实收入 |

---

## 🎯 范围（MVP）

**一个产品 + 一个权益**：

- 产品：`skin_pack_v1` — "霓虹皮肤包" $4.99（测试模式金额随意）
- 权益：`skin_pack_v1`（同名，1:1 映射）
- 解锁后：GameView 皮肤选择器可选新配色

---

## 💡 架构

```
用户 → /shop 点购买
  ↓
后端 POST /api/payments/checkout （登录态 + CSRF）
  ↓ Stripe SDK 创建 Checkout Session
  ↓ 返回 session.url
前端跳 Stripe 托管页（测试卡 4242 4242 4242 4242）
  ↓ 付款成功
Stripe → POST /api/payments/webhook （签名验证 + 幂等）
  ↓ 写 purchases 状态 completed + upsert user_entitlements
前端回调 /shop/success → 轮询 /api/me/entitlements → 显示「已解锁」
```

---

## 🗄 数据建模（简化）

```sql
-- products：单表硬编码入 seed，保留结构便于以后扩展
create table products (
  id text primary key,                  -- 'skin_pack_v1'
  name text not null,
  price_cents integer not null,
  currency text default 'usd',
  stripe_price_id text not null,        -- Stripe 端的 Price ID
  active boolean default true
);

-- purchases：订单 + 幂等 key
create table purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  product_id text references products(id) not null,
  stripe_session_id text unique not null, -- 幂等
  amount_cents integer not null,
  status text not null,                   -- 'pending' | 'completed' | 'refunded'
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- user_entitlements：解耦权益
create table user_entitlements (
  user_id uuid references auth.users not null,
  entitlement_id text not null,           -- 'skin_pack_v1'
  granted_at timestamptz default now(),
  granted_by_purchase uuid references purchases(id),
  primary key (user_id, entitlement_id)
);

-- RLS：purchases/entitlements 仅本人可读，products 公开
```

**简化点**：无 `currency` 多样化、无 `metadata` jsonb、无 `payment_intent_id`（暂不需要）、无 products.description/icon。

---

## 🔒 核心安全清单（学习重点）

| 项目 | 风险 | 落地 |
|---|---|---|
| Webhook 签名验证 | 🔴 不验证=可伪造订单 | `stripe.webhooks.constructEvent(raw, sig, secret)` |
| 幂等性 | 🔴 重复 webhook=重复解锁 | `stripe_session_id unique` 约束 + upsert |
| 服务端最终定价 | 🔴 前端篡改价 | 只传 `productId` 给后端，价格从 DB 取 |
| Stripe secret key 隔离 | 🔴 泄露=真损失 | 仅 Railway env，**绝不进前端/git** |
| Raw body 保留给 webhook | 🔴 签名验证需原始字节 | koa-bodyparser 排除 `/webhook` 路由 |
| CSRF on checkout | 🟡 复用现有 middleware |
| 错误日志脱敏 | 🟡 不打印 secret/session_id 全量 |

---

## 📦 改动清单（3 个子 PR）

### 🔹 4.1 基础设施 + 后端核心（Opus 主力）

**Stripe 账号准备**（用户自己做，非代码）：
- 注册 Stripe 账号（https://dashboard.stripe.com/register）
- 拿测试模式 `sk_test_*` 和 `whsec_*`
- 创建 Product + Price（在 Dashboard 或 API）
- 安装 Stripe CLI（`stripe listen --forward-to localhost:4000/api/payments/webhook`）

**代码**：
- `supabase/migrations/00X_payments.sql` — 3 张表 + RLS（Opus 写）
- seed：插入 `skin_pack_v1` 产品一行（Minimax 写）
- 安装依赖（Day-1 必做）：
  - `server/` 安装 `stripe`
  - `server/` 安装 `raw-body`
- `server/src/lib/stripe.js` — SDK 初始化，env 读 key
- `server/src/routes/payments.js`（Opus 写）：
  - `GET /api/products` — 公开
  - `POST /api/payments/checkout` — 登录 + CSRF，调 `stripe.checkout.sessions.create`，metadata 塞 `userId + productId`
  - `POST /api/payments/webhook` — **raw body 模式**，处理 `checkout.session.completed` 和 `charge.refunded`
- `server/src/middleware/rawBody.js`（新）— 为 webhook 路由保留原始字节：

  ```js
  import getRawBody from 'raw-body'

  export function rawBodyMiddleware(pathRegex) {
    return async (ctx, next) => {
      if (pathRegex.test(ctx.path)) {
        const rawBody = await getRawBody(ctx.req, {
          length: ctx.request.length,
          limit: '1mb',
          encoding: null  // Buffer 原始字节
        })
        ctx.request.rawBody = rawBody
      }
      await next()
    }
  }
  ```

- `server/src/index.js` 改造（顺序关键，现在是全局 `app.use(bodyParser())`）：

  ```js
  const WEBHOOK_PATH = /^\/api\/payments\/webhook$/

  // bodyparser 之前：webhook 读 raw
  app.use(rawBodyMiddleware(WEBHOOK_PATH))

  // bodyparser 跳过 webhook（否则会吃掉 stream）
  const parser = bodyParser()
  app.use(async (ctx, next) => {
    if (WEBHOOK_PATH.test(ctx.path)) return next()
    return parser(ctx, next)
  })
  ```

- webhook 路由读 `ctx.request.rawBody` 调 `stripe.webhooks.constructEvent(rawBody, sig, secret)` 验证签名

**Day-1 基线检查（新增）**：

1. 先提交“空实现骨架 PR”：
   - `server/src/routes/payments.js` 挂到 `server/src/index.js`
   - 暂时返回 stub 200/501，保证路由连通
2. 再接 Stripe 逻辑与数据库写入
3. 完成 webhook raw body 冒烟：
   - 手工构造 payload + signature 走一遍
   - 确认 `ctx.request.rawBody` 非空且签名校验可执行

**测试**（Minimax）：
- 单元：webhook 签名验证（mock stripe.webhooks.constructEvent）
- 单元：幂等（同一 session_id 写两次，只完成一次）
- 单元：checkout 未登录拒绝、无 productId 拒绝
- 集成：Stripe CLI 本地转发 webhook，实测解锁

### 🔹 4.2 前端商品页 + 购买流程（Minimax + Opus 审查）

- `client/src/views/ShopView.vue` — 单商品卡片，读 `/api/products`
- `client/src/views/ShopSuccessView.vue` — 回跳页，轮询 `/api/me/entitlements`
- `client/src/stores/payment.js` — `products`、`entitlements`、`checkout(productId)`
- `client/src/lib/api.js` 加 `payments.checkout` / `me.entitlements` / `products.list`
- 路由注册 `/shop`、`/shop/success?session_id=:id`

### 🔹 4.3 皮肤 entitlement 门闸（Minimax 主力）

**前置**：2.3 已完成皮肤基建（`SKINS / skin store / SnakeGame 读 activeSkin / ProfileModal 皮肤 tab`）。本子 PR 只接入 entitlement 门闸逻辑：

- `client/src/stores/skin.js` — `fetchEntitlements()` action 调 `/api/me/entitlements`，填充 `state.entitlements`
- App 启动 / 登录后调 `fetchEntitlements()`
- ShopSuccessView 回跳后刷新 entitlements → 锁定皮肤变可选
- ProfileModal "皮肤" tab 锁定态按钮从"暂未开放"改为"购买解锁"→ 跳 `/shop`
- （2.3 的测试已覆盖 `availableSkins` getter 的 entitlement 逻辑，本 PR 只补接口调用测试）

**改动集中在 skin store 的数据填充**，SnakeGame / SKINS 常量都不动。

---

## 🧪 测试策略

**后端**：
- Webhook 签名验证 + 幂等 unit test（Opus 重点审）
- 集成：Stripe CLI + 测试卡 `4242 4242 4242 4242`
- 失败卡 `4000 0000 0000 0002` 订单状态不进 completed
- Refund：Stripe Dashboard 发起 refund → 看 entitlement 被撤

**前端**：
- ShopView 渲染商品
- 已购买用户皮肤选择器显示新皮肤

**手动跑通**：
- 本地 Stripe CLI 转发 webhook → 测试卡付款 → 看数据库 → 皮肤可用

---

## 🎯 模型分工

| 阶段 | 模型 |
|---|---|
| Supabase migration SQL + RLS | **Opus** |
| seed 数据 + Stripe Dashboard 设置 | **用户 + Minimax** |
| `stripe.js` SDK 初始化 | **Minimax** |
| checkout 路由 | **Opus** |
| webhook 路由（签名 + 幂等） | **Opus** 重点 |
| raw body 中间件集成 | **Opus** |
| 后端测试（webhook / 幂等） | **Minimax**，Opus review |
| 前端 payment store | **Minimax** |
| 前端 ShopView + SuccessView | **Minimax** |
| 前端 skin store + 应用 | **Minimax** |
| security-reviewer | **Opus** 强制多轮 |
| commit + PR | **Opus** |

**Opus 占比 ~60%**（下调，因为简化后样板多），Minimax ~40%。

---

## ✅ 验收标准

- [ ] Stripe 测试卡完整走完 checkout → webhook → entitlement
- [ ] 伪造 webhook 签名被拒（返回 400）
- [ ] 同一 session_id 重复 webhook 不重复写 entitlement
- [ ] 前端传假 `price` 被后端忽略（价格从 DB 取）
- [ ] refund webhook 撤权益（entitlement 被删或 status='refunded'）
- [ ] 未登录无法调 `/checkout`
- [ ] Stripe secret key 不在前端 bundle / git 中
- [ ] 单元测试 + 集成测试全绿
- [ ] security-reviewer 无 CRITICAL / HIGH

---

## ⚠️ 风险

| 风险 | 缓解 |
|---|---|
| Webhook 签名验证实现错误 | 用 Stripe 官方 `constructEvent`，**不自己撸** |
| Koa bodyparser 吃掉 raw body | webhook 路由前单独保留 raw（或在 bodyparser 之前挂路由） |
| 幂等失败导致重复解锁 | `stripe_session_id unique` + upsert |
| Stripe secret 误入 git | `.env` 加 gitignore，部署前 grep 历史 |
| 本地 webhook 收不到 | Stripe CLI `listen --forward-to` 必装 |

---

## 📋 PR 信息

- 分支：`feat/payment-learning`（或子分支 `feat/payment-backend` / `feat/payment-frontend` / `feat/skin-integration`）
- 每个子 PR 独立 review + merge

---

## 🚦 开工前 Gate

1. [ ] **2.3 皮肤基建已合入**（`SKINS / skin store / SnakeGame 读取 / ProfileModal 皮肤 tab` 就绪）
2. [ ] **Railway 部署实例复核**：确认仍为单实例。若已 scale 到多实例，本计划必须先完成 rate limiter → Redis 迁移（见 README 项目级约束 1）
3. [ ] `server` 依赖安装完成（`stripe`、`raw-body`）
4. [ ] payments 路由骨架已挂载并可本地访问（即使先返回 stub）
5. [ ] webhook raw body 冒烟已通过（签名校验函数可跑通）
6. [ ] Stripe 测试账号注册成功
7. [ ] 测试模式拿到 `sk_test_*` 和 webhook `whsec_*`
8. [ ] Stripe Dashboard 创建一个 Product + Price（记下 Price ID）
9. [ ] Stripe CLI 本地安装 + `stripe login` 通过
10. [ ] Railway env 能注入 `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`（生产才用，学习阶段可跳）

**最短路径**：1~2 Gate 通过 → 3~5 本地准备 → 开工 4.1。

---

## 📝 后续（不在本计划范围）

- 真实收款（切换到 live mode + 合规）
- 订阅 / dunning
- 多币种 / Stripe Tax / 发票
- 退款 UI（用户自助申请）
- 促销码 / 折扣
- 订单历史页
- 国内支付
- App 内购

---

## 📝 评审修订（2026-04-20）

- **硬依赖 2.3**：皮肤基建剥离为独立计划，本计划 4.3 从"完整实现"改为"entitlement 门闸"
- **raw body 中间件具体化**：新增 `server/src/middleware/rawBody.js` + `server/src/index.js` 顺序改造代码
- **开工 Gate 加 2.3 合入 + 单实例复核**两条硬门槛
- Minimax 占比因拆分从 ~20% 升至 ~40%

## 📝 审查对齐修订（2026-04-21）

- 新增 Day-1 Gate：依赖安装、payments 路由骨架、raw body 冒烟校验
- 避免直接进入 Stripe 业务实现导致“路由未挂载/中间件顺序错误”这类基础故障
