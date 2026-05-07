# 系统设计审计

> 位置：`docs/audits/`，评估快照型文档，**不是当前执行依据**
> 评估日期：2026-05-06
> 评估口径：从系统设计角度盘点当前模块、识别缺陷、给出优先级建议
> 本文档记录**当前状态快照**，是后续规划与改造的输入；具体改造方案请新建 `docs/superpowers/plans/*.md` 落地
> 与 `AGENTS.md` / `docs/ARCHITECTURE.md` / `docs/superpowers/plans/ci-deploy-gating-and-branch-alignment.md` 中**已知且有计划**的项，本文只引用不重复

## 1. 模块清单

| 层 | 模块 | 体量 | 备注 |
|---|---|---|---|
| 前端 | Vue 3 SPA：5 views（Auth/Game/Reset）+ 5 game 组件（含 Canvas 蛇 423 行）+ 4 composables + 2 Pinia stores + Naive UI | 4347 行 | MVP 完整 |
| 后端 | Koa：2 路由（auth 440 行、leaderboard 202 行）+ 4 中间件（auth/csrf/rateLimit/securityHeaders）+ supabase client lib | 1024 行 | 极薄一层 |
| 数据 | Supabase：1 个 migration，含 `profiles`、`game_sessions`、`leaderboard_best` view、`leaderboard_events` realtime 触发表、RLS、auto-create profile trigger | 159 行 SQL | 单文件累积 |
| 部署 | Vercel（前端）→ rewrite `/api/*` → Railway（后端） | — | 分支不对称（已知，详见 `docs/ARCHITECTURE.md` §1） |
| CI | GitHub Actions：CI、develop auto-merge、CodeQL、Dependabot | — | 不 gate 部署（已知，详见同上） |
| 测试 | Vitest（client 单元）+ Jest（server 单元）+ Playwright（E2E） | 30+ 测试文件 | 投入充足 |

## 2. 缺陷分级

### A. 架构分层（中等问题）

- **无 service / repository 层**：路由 handler 同时负责参数校验、业务规则、Supabase 调用。`server/src/routes/leaderboard.js` 已显出味道（202 行内塞了 dual-mode 校验、session 验证、duration 检查、双通道分支）；后续加成就 / 任务 / 付费时会快速膨胀
- **数据访问无抽象**：直接调用 supabase-js client，迁 ORM、换数据源或加缓存层时全要改
- **影响**：可维护性、可测性、未来重构成本

### B. 游戏防作弊（**严重短板**）

- 客户端完全掌控分数计算：`client/src/components/game/SnakeGame.vue` 在 client 决定吃食物、buff 生效、score 累加；server 仅校：`score ≤ MAX_DIRECT_SUBMIT_SCORE(6000)`、`durationMs ∈ [1s, 10min]`、`scoreMultiplier ↔ speedMultiplier` 映射
- **Direct submit 通道（无 sessionId）仍开放**——`POST /api/leaderboard` 在不传 `sessionId` 时直接 insert，明显作弊入口
- 无服务端回放 / 移动序列校验：没有 move log，无法重放验证分数合理性
- 无 session TTL：`game_sessions.start` 后任意时间补 submit 都通过
- 无 idempotency key：网络重试可能多次写入（`is_verified` 拦得住二次 update，挡不住首次 insert 重复）
- **影响**：排行榜公平性、付费 / 成就权益的可信度

### C. 可观测性（**几乎为零**）

- 无结构化 logger（全 `console.log/error`，难以采集与告警）
- 无 APM / error tracking（未接入 Sentry 等）
- 无 metrics（接口 P95、错误率、活跃用户、登录失败率全黑盒）
- `/api/health` 仅回 `{status:'ok'}`，未检 DB 连通、未检关键依赖
- 无 request trace id，跨服务排错靠肉眼
- **影响**：故障响应速度、问题定位成本、运营决策依据

### D. 扩展性（**单点死锁**）

- 内存 rate limiter（已记于 `docs/ARCHITECTURE.md` §7，多实例直接绕过）
- 无 Redis / 缓存层（rate limit、session、leaderboard 缓存都缺）
- `leaderboard_best` 是普通 view 不是 materialized view，大量用户时排行榜每次实时全表 `row_number()`
- 排行榜分页用 `range(from,to)` offset 模式，深翻页性能差
- **影响**：上量后水平扩展受限、排行榜响应时间不可控

### E. 部署 / 环境（**已 documented，未落地**）

- 分支跟踪不对称（`main` → Vercel prod / `develop` → Railway prod）
- 无 staging Railway env
- CI 不 gate 部署（Wait for CI 关闭）
- **当前计划**：`docs/superpowers/plans/ci-deploy-gating-and-branch-alignment.md`

### F. 数据治理（轻量但会越积越重）

- 单 migration 文件 `001_initial_schema.sql` 累积所有 schema，未来加表 / 改字段缺乏清晰版本切片
- `game_sessions` 永久增长，无归档 / 分区策略
- `on delete cascade` 全链删除，无软删 / 审计 / 数据留存
- **影响**：审计合规、长尾运维、数据恢复

### G. 类型与代码质量

- 纯 JS（已计划 TS 化，详见相关 plan）
- ESLint 在但无 Prettier 强制
- 无前后端契约测试（API 字段口径靠人盯、文档同步靠自觉）
- 单组件 `GameView.vue` 632 行，接近 800 行上限
- **影响**：重构信心、跨端字段一致性

### H. 安全（**做了基本功**）

已有：

- ✅ Token 服务端 only，HttpOnly session cookie（详见 `docs/ARCHITECTURE.md` §2）
- ✅ CSRF Origin 校验（同上 §3）
- ✅ RLS + 后端聚合分发排行榜（同上 §5）
- ✅ 限流维度：IP + user_id（同上 §7）

仍缺：

- ❌ 无 audit log（登录、分数提交、profile 修改无审计轨迹）
- ❌ 无可见的密码策略配置（依赖 Supabase Auth 默认）
- ❌ 无 2FA、无 OAuth provider 多样化
- **影响**：合规审计、账号被盗的影响面控制

## 3. 整体评价

**不是简陋系统，但远未生产级。** 定位是「**有架构意识的 MVP**」。

证据：

- 同体量项目常缺的它有：CSRF、RLS、限流、Token 服务端化、E2E 测试、CI、AGENTS.md + docs/ 19 份文档体系
- 同体量项目不该有的它没有：service 分层、可观测性、防作弊、staging、Redis、监控告警

**形态**：典型「前端肥后端瘦」MVP。前端 4347 / 后端 1024 ≈ 4:1。游戏全在 client，server 退化为 auth + leaderboard CRUD 网关。

**最大隐藏风险：防作弊（B 类）**。一旦游戏被任何小圈子玩起来，排行榜会在很短时间内被脚本刷到 `MAX_DIRECT_SUBMIT_SCORE` 上限。这比「无 staging」「内存限流」严重得多，且修复成本最高（要做服务端模拟或 move log 重放）。

## 4. 优先级建议

突破 MVP 时建议按以下顺序处理：

| 优先级 | 项目 | 缺陷类 | 预估难度 | 前置 |
|---|---|---|---|---|
| **P0** | 服务端分数校验（move log + replay）+ 关掉 direct submit 通道 | B | 高 | 无 |
| **P0** | 结构化 logger + Sentry / 等价 error tracking | C | 低 | 无 |
| **P1** | service / repository 层抽象 | A | 中 | 推荐先 TS 化 |
| **P1** | CI 部署 gating + staging 落地 | E | 中 | 已有计划 |
| **P2** | Redis 限流 + materialized view + 分页游标 | D | 中 | 取决于上量节奏 |
| **P2** | TS 化（dts churn 已治） | G | 中 | 无 |
| **P2** | audit log + 密码策略 + 2FA | H | 中 | 取决于合规要求 |
| **P3** | migration 拆分 + 数据归档策略 | F | 中 | 取决于数据量 |

落地建议：

- 每项 P0 / P1 改造前先在 `docs/superpowers/plans/` 建独立 plan 文档
- 同一时间不并发多个 P0；防作弊改造期间避免与 service 分层重构冲突
- 改造完成后回头更新本文档对应小节，标注「已落地」+ 落地分支 / PR 链接

## 5. 维护说明

- 本文档为快照型，不需每次代码改动都更新
- 触发更新时机：
  - 完成上表中任一项改造
  - 出现新的系统级缺陷类别（如引入新模块、新外部依赖）
  - 半年内未更新时做一次复盘
- 更新时直接编辑对应小节并修改文首日期
