# 多模块平台化重构 Vision

> 创建：2026-05-06
> 状态：**讨论中**（边讨论边改，未达"方案确认"态）
> 性质：高层 vision + gap 分析，是后续多个子 plan 的母文档；本文不直接执行
> 子 plan 落地后回填链接到对应小节
> 审计输入：`docs/audits/system-design-audit.md`

## 0. 背景与目标

**当前**：单游戏 MVP（贪吃蛇），Vue 3 SPA + Koa + Supabase。

**目标**：演进为多模块平台
- 主页：模块入口（游戏模块 + AI 应用模块）
- 游戏模块：贪吃蛇是其中一个游戏，未来支持 N 个游戏
- AI 应用模块：N 个 AI 工具
- 用户头像 → 设置页 → 后台管理系统（按角色访问）

**性质**：架构跨级跃迁，不是渐进迭代。涉及数据模型、权限、模块化、后台、AI 能力等多层重写。

## 1. 现状 vs 目标 gap

| 维度 | 现状 | 目标 | gap |
|---|---|---|---|
| 路由 | 5 views，全游戏相关 | 主页 + 游戏 + AI + 设置 + 后台 | 大 |
| 数据模型 | `game_sessions` 单表绑死蛇 | 多游戏 + 多 AI 应用 + 角色 + 审计 | 大 |
| 权限 | 登录/游客二态 | RBAC（user / admin / 可能更多） | 全空白 |
| 后端结构 | 2 个平铺 router | 模块化 router + service 层 + 任务队列 | 大 |
| 客户端结构 | 平铺 components/views | 模块化（games/<id>、ai/<id>） | 中 |
| 后台 | 无 | 独立 admin 视图 + 接口 + 审计 | 全空白 |
| AI 能力 | 无 | gateway + 配额 + 流式 + 安全 | 全空白 |

## 2. 必须补充的 12 项

### A. 数据模型扩展（**P0**）

新增表：
```sql
games             (id, slug, name, icon, enabled, display_order, metadata jsonb)
ai_apps           (id, slug, name, provider, model, enabled, quota_config jsonb)
user_roles        -- 或直接 profiles.role enum
ai_usage          (user_id, app_id, tokens_in, tokens_out, cost, created_at)
audit_logs        (id, actor_id, action, target_type, target_id, payload jsonb, created_at)  -- append-only
system_configs    (key, value jsonb, updated_by, updated_at)
```

改造现有：
- `game_sessions ADD COLUMN game_id uuid REFERENCES games(id)`
- `leaderboard_best` view 改为按 `game_id` 分组重写

不先做这步，后续所有路由 / 前端代码都要二次改。

**子 plan**：未创建（建议优先建立）

### B. RBAC 权限（**P0**）

- DB：`profiles.role` enum（`user` / `moderator` / `admin` / `superadmin`）
- 后端 middleware：`requireRole('admin')`，组合到 `/api/admin/*`
- RLS：admin 可读全表，普通用户保持现有策略
- 前端：route guard + UI 元素按角色显隐
- **关键约束**：admin 不能修改自己的 audit_log（append-only + RLS deny update）

**子 plan**：未创建

### C. 模块化目录结构（**P0**）

前端：
> 路径基线为 Monorepo Phase 1 完成后状态（详见 5.7）

```
apps/web/src/modules/
  games/
    _shared/            # GameFrame、ScoreSubmit、LeaderboardCard 通用基座（Phase 2 抽出到 packages/game-framework）
    snake/
      SnakeGame.vue
      route.js          # 自注册
      api.js
  ai/
    _shared/            # ChatPanel、StreamRenderer（Phase 2 抽出到 packages/ai-framework）
    chat-bot/
  admin/
    users/
    games/
    audit/
  settings/
    profile/
    security/
    preferences/
  home/
    HomeView.vue        # 模块卡片聚合
```

后端：
```
apps/api/src/routes/
  games/snake.js
  ai/chat-bot.js
  admin/{users,games,audit}.js
```

**子 plan**：未创建（建议与 A 同期落地，蛇游戏作迁移参考实现）

### D. 服务端分层（**P0**，原审计 P1 升级）

- `services/`（业务规则）+ `repositories/`（DB 调用）+ routes（薄）
- `middleware/audit.js`：admin 操作自动写 `audit_logs`
- 路由注册器：`routes/index.js` 集中挂载

引用 `docs/audits/system-design-audit.md` §A。

### E. 主页 / 信息架构（**P1**）

- `/` 主页：模块卡片（游戏入口 / AI 应用入口 / 推荐 / 最近）
- 主页聚合 API：`GET /api/home/feed`（推荐游戏 + 我的最近 + AI 入口）
- 头像下拉：profile / settings / admin（按角色）/ logout
- 404、403、500 页面

### F. 后台架构决策（**P1**，先决策再做）

| 方案 | 优 | 缺 |
|---|---|---|
| 同 SPA 内 `/admin/*` | 共享认证、共享组件、上线快 | bundle 膨胀；admin 错误可能影响主站；UI 风格双套 |
| 独立 admin SPA（子域名） | 边界清晰、bundle 隔离、可用 admin 框架（Naive Pro / Ant Pro） | 维护两套部署；跨域 cookie / SSO |
| **预选：同 SPA 内 + 路由级懒加载** | 折中 | bundle 边界靠 `import()` |

后台必备能力（最小）：
- 用户管理（搜索、封禁、重置密码、查看战绩 / AI 用量）
- 游戏开关与排序、参数配置
- AI 应用配置（API key 在 server，admin 只配模型 / 配额）
- 审计日志查看（不可改）
- 系统看板（DAU、接口错误率、成本）

**待用户确认**：选哪个方案？

### G. AI gateway 服务层（**P1**）

- `server/src/services/ai/gateway.js`：统一封装 provider（OpenAI / Anthropic / 本地）
- API key **绝对** server only，不走 `VITE_*`
- 必备：
  - 配额引擎（per user / per app / per day）
  - 流式响应（SSE，Koa `ctx.res.write`）
  - prompt 注入基础防护（系统提示固化在 server，用户输入只进 `user` role）
  - 用量记账（每次调用写 `ai_usage`）
  - 内容安全过滤（明文敏感词 + provider safety）
- **风险**：成本爆炸。必须 hard-cap（per user 每日 token 上限），不能只靠 rate limit

### H. 用户中心 / 设置独立化（**P2**）

- 当前 `ProfileModal.vue` 弹窗保留为快速入口
- 完整设置走独立页：`/settings/{profile,security,preferences,skin,subscription}`
- security 子页：改密、2FA、active sessions（查 supabase auth sessions）
- 数据导出（GDPR-ready）

### I. 设计系统统一（**P2**，但必须早起头）

- 当前霓虹主题只对游戏模块。AI 模块、设置、后台需统一 design token 或显式区分视觉
- 抽象 design token：`--color-*`、`--space-*`、`--radius-*`、`--shadow-*`
- 模块可局部覆盖 token，基础组件统一
- i18n 提前埋（vue-i18n），后期再翻译；否则改文案要改三千处

### J. 监控 / 可观测（**P0**，原审计 P0 保持）

- Sentry（前后端）
- 结构化 logger（pino）
- request trace id（uuid，跨服务透传）
- AI 用量 dashboard（成本与用量必须可视）

引用 `docs/audits/system-design-audit.md` §C。

### K. Redis 引入（**P1**）

- 限流：从内存换 Redis（多实例）
- AI 流式 / 长任务的 session 保活
- 主页聚合 cache
- 可能的 BullMQ（AI 批处理、报表生成）

### L. 测试策略升级（**P2**）

- E2E：跨模块流程（首页 → 游戏 → 排行榜 → 设置 → admin）
- 角色矩阵测试：guest / user / admin 各跑一轮
- AI 接口契约测试（mock provider）

## 3. 优先级与依赖

```
P0-前置（必须最先做，否则 P0 各项目录基线要改两次）
  Monorepo Phase 1（5.7）：pnpm + Turborepo + apps/packages 重组 + 部署配置同步

P0（基座，Phase 1 完成后开始）
  A. 数据模型扩展 ────┐
  B. RBAC ──────────┤
  C. 模块化目录 ─────┼──▶ 解锁 P1
  D. 服务端分层 ─────┤
  J. 监控/Sentry ────┘

P1（基础设施成型）
  E. 主页 + IA
  F. 后台架构（先决策再骨架）
  G. AI gateway
  K. Redis
  + 已有计划：CI gating + staging（plans/ci-deploy-gating-and-branch-alignment.md）

P2（产品体验）
  H. 用户中心独立化
  I. 设计 token + i18n
  L. 测试矩阵升级
  + Monorepo Phase 2（packages/ui + packages/game-framework，受 N≥2 触发）

P3（持续接入）
  - 第二个游戏（验证模块化 + 触发 Monorepo Phase 2）
  - 第一个 AI 应用（验证 gateway）
  - 后续模块陆续接入
  + Monorepo Phase 3（模块独立包，受痛点触发）
```

## 4. 落地路径建议

1. **Phase 1 Monorepo 迁移（P0 前置）**：pnpm + Turborepo + 目录重组 + Vercel/Railway 配置改。独立 PR，独立分支
2. **冻结新功能 1–2 周**，做 P0 五件（A / B / C / D / J）
3. **用现有蛇游戏作迁移验证**：从 `apps/web/src/components/game/*` 迁到 `apps/web/src/modules/games/snake/`，跑通 game_id 隔离 → 这是模块化的"参考实现"
4. **再做 P1**：F 后台决策 + G AI gateway 可并行
5. **后台与第一个 AI 应用同期上线**：后台 demo 包含"管理蛇游戏开关"+"管理 AI app 配额"两个真实场景，避免做空架子
6. **第二个游戏 / 第二个 AI 应用** 才是模块化是否成功的真正测试，**同时触发 Monorepo Phase 2**（packages/ui + packages/game-framework 抽取）

## 5. 关键决策点（待讨论）

按讨论顺序记录，每项决策后回填结论。

### 5.1 后台部署形态（F）
- 选项：同 SPA 内懒加载 / 独立 admin SPA
- 状态：**待讨论**
- 影响：决定后期 90% 的实现路径

### 5.2 角色粒度（B）
- 选项：二档（user / admin）/ 三档（user / mod / admin）/ 四档（含 superadmin）
- 状态：**待讨论**
- 影响：DB schema、middleware 复杂度、UI 复杂度

### 5.3 多游戏数据迁移策略（A）
- 选项：硬迁移（一次性给现有 game_sessions 全打 snake game_id）/ 软迁移（views 兼容旧无 game_id 数据）
- 状态：**待讨论**
- 影响：迁移风险、回滚成本

### 5.4 AI 模块的产品定位（G）
- 选项：通用聊天 / 工具集合（翻译、总结、改写等）/ 用户自定义 prompt 应用市场
- 状态：**待讨论**
- 影响：gateway 抽象层级、配额模型、UI 形态

### 5.5 现有 vs 新模块设计语言（I）
- 选项：全站霓虹 / 游戏模块霓虹 + 其他模块通用 / 全站重新设计
- 状态：**待讨论**
- 影响：design token 抽象层级、组件库选择

### 5.6 i18n 是否先期介入（I）
- 选项：现在埋 / 国际化时再做
- 状态：**待讨论**
- 影响：先期成本 vs 后期改造工作量

### 5.7 Monorepo 升级方案（贯穿）
- 背景：项目已是 npm workspaces 二包结构（`client/` + `server/`），平台化后需承载多模块 / 跨端共享 type / 共享 framework
- 选项：保持 npm workspaces / 升级 pnpm + Turborepo / 直接 Nx
- 状态：**已确认（2026-05-06）**
- **结论：Phase 1 升级为 pnpm + Turborepo + `apps/` + `packages/` 目录重组**

  目标结构：
  ```
  apps/
    web/              ← 原 client/
    api/              ← 原 server/
  packages/
    shared/           ← 跨端 types + Zod schemas + 常量（先空着，TS 化时填充）
  turbo.json
  pnpm-workspace.yaml
  ```

  分阶段：
  - **Phase 1（本次重构早期，P0 前置）**：迁工具链 + 目录重组 + 部署配置改。本阶段不抽业务 framework
  - **Phase 2（第 2 个游戏出现后）**：抽 `packages/ui/` + `packages/game-framework/`。受 `docs/audits/spec-debt.md` "N≥2 标准化前置" 约束
  - **Phase 3（模块多到痛时）**：游戏 / AI 应用各自独立包；触发条件 = 模块边界混乱
  - **Phase 4（可能不需要）**：admin 独立 SPA 或 micro-frontend

  **关键约束**：
  - Phase 1 必须**早于** P0 §A 数据模型 / §B RBAC / §C 模块化目录，否则模块化路径要改两次
  - Vercel / Railway 部署配置（rootDirectory、build command）要同步改
  - `docs/*` 中所有 `client/` `server/` 路径引用同步更新（走 spec-debt 紧急 / 批量通道）
  - 不选 Nx（当前体量过重）；不选 Lerna（维护已停滞）；不选 Yarn Berry / PnP（部署平台兼容性差）
- 影响：影响所有 P0 子 plan 的目录基线；增加一个独立 P0 子 plan「Monorepo Phase 1 迁移」

## 6. 子 plan 派生表

讨论稳定后按下表派生具体子 plan，每个子 plan 在 `docs/superpowers/plans/` 单独成文。

| 子 plan 主题 | 对应小节 | 状态 |
|---|---|---|
| **Monorepo Phase 1 迁移**（pnpm + Turborepo + apps/packages 重组） | 5.7 | **未创建（P0 前置，最优先）** |
| 数据模型扩展 + 多游戏迁移 | A + 5.3 | 未创建 |
| RBAC 设计 + audit_logs | B + 5.2 | 未创建 |
| 模块化目录与路由注册 | C | 未创建 |
| 服务端分层重构 | D | 未创建 |
| 主页 + IA + 头像菜单 | E | 未创建 |
| 后台管理系统骨架 | F + 5.1 | 未创建 |
| AI gateway 服务层 | G + 5.4 | 未创建 |
| 设计 token + i18n 起步 | I + 5.5 + 5.6 | 未创建 |
| 监控与 logger 落地 | J | 未创建 |
| Redis + BullMQ | K | 未创建 |
| 用户中心独立化 | H | 未创建 |
| 测试矩阵升级 | L | 未创建 |

## 7. Spec 演进协同（与重构并行）

本次重构同时作为 `AGENTS.md` 与 `docs/*` 的**真实场景压测**，目标是重构结束时 spec 集达到完整、自洽、可执行的状态。

**机制**：

- 重构期间发现的 spec 缺口 / 冲突 / 过严 / 过松 → 进 [`docs/audits/spec-debt.md`](../../audits/spec-debt.md) 台账，**不当场改 `AGENTS.md` / `docs/*`**
- 紧急例外（涉及认证 / 数据库 / 支付 / 密钥 / 生产数据的 spec 风险）才允许立即修订，仍需在台账登记
- spec 修订走独立分支 + 独立 PR：`*/spec-*` 前缀；**不与业务代码 PR 混合**（少数文档与代码强耦合的例外明确说明）
- 每个里程碑（P0 / P1 / P2 完成）做一次 **Spec Reconciliation Pass**：批量处理 `待批量` 项，PR 名 `*/spec-reconcile-after-<phase>`
- 标准化前置：模块化规范、命名规范、设计 token 等需 **N≥2 真实模块验证** 才写入 `docs/*`（蛇 + 第二个游戏 / 第一个 AI 应用是验证窗口）
- **重构结束** = 全部子 plan 落地 + **Spec Final Audit 通过**

**Spec Final Audit**（重构终点）：

- 在 `docs/audits/` 新建 `spec-completeness-check.md`
- 全量审视 `AGENTS.md` + `docs/*` 是否完整、一致、可执行
- 与业内 best practice 对标（OWASP / Google 工程实践 / Anthropic agent guides 等），找盲区
- 通过后本 vision 文档归入 `docs/archive/`

## 8. 维护说明

- 本文档为**讨论中文档**，每次讨论后更新对应小节
- 决策达成后在 §5 对应小节标"已确认"+ 结论 + 日期
- 子 plan 创建后在 §6 标记并补链接
- 全部子 plan 落地 + Spec Final Audit 完成后，本文档转 "已归档" 状态
