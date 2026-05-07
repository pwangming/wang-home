# 计划 3：成就系统

> 状态：✅ 方案确认（2026-04-21 对齐修订）——两表建模、客户端触发 + schema 校验、白名单规则函数、12 成就、`/achievements` 路由
> 分支：`feat/achievements`（待创建，拆成 3 个子 PR）
> 基分支：`develop`
> **硬依赖**：2.2（gameContext 接口 `handleGameOver(finalScore, speedMult, scoreMult, gameContext)`）、2.1a（ProfileModal tab 容器 — 用作成就入口）
> 预计工作量：8 ~ 14 小时（分 3 个子 PR）
> 模型主力：**Opus ~35%**（架构 + 建模 + 安全审查）、**Minimax ~65%**（测试 + 前端 UI + 种子数据）

---

## 📍 现状摘要

**项目中完全没有成就相关代码**（grep 无匹配）。从零搭建。

## 🎯 推荐范围（默认方案，请确认）

**阶段一：本地成就 + 数据库存储 + 首批 12 个成就**

不做：
- ❌ 社交成就（"打败好友"等）
- ❌ 成就排行榜（和主排行榜分离）
- ❌ 成就兑换奖励（和支付耦合的功能）
- ❌ 带赛季的周期性成就

做：
- ✅ 基于游戏行为的个人成就
- ✅ 持久化到 Supabase
- ✅ 游戏结束后结算解锁
- ✅ 成就列表页 + 解锁时 Toast 通知

---

## 💡 架构设计（决策已确认）

### 决策 1：数据建模 ✅ 两张表

```sql
-- 成就定义表（种子数据）
create table achievements (
  id text primary key,                    -- 'first_bite', 'centurion'
  title text not null,                    -- '初尝禁果'
  description text not null,              -- '第一次吃到食物'
  icon text,                              -- emoji 或图标 URL
  category text,                          -- 'milestone', 'score', 'skill'
  points integer default 0,               -- 成就点数（用于未来等级系统）
  hidden boolean default false,           -- 是否隐藏成就
  created_at timestamptz default now()
);

-- 用户解锁记录
create table user_achievements (
  user_id uuid references auth.users not null,
  achievement_id text references achievements(id) not null,
  unlocked_at timestamptz default now(),
  progress jsonb,                         -- 进度型成就的累计数据
  primary key (user_id, achievement_id)
);

-- RLS: 用户只能读自己的 user_achievements；achievements 表公开可读
```

### 决策 2：触发引擎架构 ✅ A 客户端触发

- 前端 gameOver 时 POST 本局数据到 `/api/achievements/check`
- 服务端按规则判断解锁
- 理由：此项目无作弊利益，简单优先。缺点（前端可伪造）已接受

### 决策 3：进度型成就实现 ✅ progress jsonb

- `user_achievements.progress` 存 JSON，例如 `{ "diamondCount": 37 }`
- 每局结束时更新 progress，达到阈值 → `unlocked_at` 填充
- 并发写：用 Supabase upsert + atomic increment

### 决策 4：规则执行 ✅ 白名单规则函数（不用表达式解释器）

```js
// server/src/lib/achievementRules.js
export const RULES = [
  {
    id: 'first_bite',
    trigger: 'onGameEnd',
    evaluate: ({ gameContext }) => gameContext.foodEaten >= 1
  },
  {
    id: 'centurion',
    trigger: 'onGameEnd',
    evaluate: ({ gameContext }) => gameContext.score >= 100
  },
  {
    id: 'diamond_hunter',
    trigger: 'onGameEnd',
    progressKey: 'diamondCount',
    evaluate: ({ progress }) => (progress.diamondCount || 0) >= 10
  }
]
```

仅执行仓库内硬编码规则函数。**禁止 `eval` / `Function` / 动态表达式解释器**。

### 决策 5：首批 12 个成就 ✅ 全部采用

| ID | 标题 | 描述 | 条件 | 类型 |
|---|---|---|---|---|
| first_bite | 初尝禁果 | 第一次吃到食物 | foodEaten >= 1 | 一次性 |
| centurion | 百分达人 | 单局得分 >= 100 | score >= 100 | 一次性 |
| 500_club | 五百强 | 单局得分 >= 500 | score >= 500 | 一次性 |
| marathoner | 马拉松 | 单局生存 >= 120 秒 | durationMs >= 120000 | 一次性 |
| speed_demon | 极速恶魔 | 1.5x 速度下得分 >= 50 | speedMultiplier>=1.5 && score>=50 | 一次性 |
| no_death | 不死鸟 | 单局吃到 50 个食物 | foodEaten >= 50 | 一次性 |
| diamond_hunter | 钻石猎人 | 累计吃到 10 颗钻石 | diamondCount >= 10 | 累计 |
| ghost_master | 幽灵大师 | 幽灵模式下吃到 5 个食物 | ghostEats >= 5 | 累计 |
| early_bird | 早起的鸟 | 注册后 7 天内玩 >= 10 局 | - | 累计+时间窗 |
| persistent | 坚持不懈 | 累计游戏局数 >= 50 | totalGames >= 50 | 累计 |
| leaderboard_top10 | 榜上有名 | 进入全球前 10 | - | 外部计算（见下方决策 7） |
| all_speeds | 全速征服 | 3 个速度档位都有得分记录 | - | 累计 |

**依赖 2.2**：`diamond_hunter`、`ghost_master` 用 2.2 已暴露的 `gameContext.diamondCount` / `gameContext.ghostEats`。2.2 的 `handleGameOver` 第 4 参 `gameContext` 是本计划的核心接入点。

### 决策 7：`leaderboard_top10` 实现路径 ✅ 方案 B（提交分数后比对）

两选一后选 **方案 B**：

- **方案 B（采用）**：在 `server/src/routes/leaderboard.js` 的 submitScore 路由后，新增 hook：若本次分数进入全局 top10，upsert 写入 `user_achievements`。不跑定时任务，单次提交增量判定。
- 方案 A（弃）：定时任务扫描榜单 —— 项目无调度器，引入 cron 复杂度不值得。

**额外改动**：子 PR 3.1 路由清单加 `leaderboard.js` 的 submitScore 后置钩子。

### 决策 8：`/api/achievements/check` schema 校验 ✅ 必做

前端可伪造 `gameContext`，但 schema 层必须拒绝垃圾数据污染 `user_achievements.progress`：

```js
// 用 zod（Supabase 已有 TypeScript 生态，zod 最顺手）
import { z } from 'zod'

const gameContextSchema = z.object({
  foodEaten:        z.number().int().min(0).max(1000),
  diamondCount:     z.number().int().min(0).max(1000),
  ghostEats:        z.number().int().min(0).max(1000),
  durationMs:       z.number().int().min(0).max(3600 * 1000),  // 最长 1 小时
  score:            z.number().int().min(0).max(100000),
  speedMultiplier:  z.number().min(0.5).max(3),
  scoreMultiplier:  z.number().min(0.5).max(3)
}).strict()  // 拒绝未知字段
```

校验失败 → 400，不写任何记录。

### 决策 6：UI 位置 ✅ 采用推荐

- **成就列表页**：新路由 `/achievements`，从 ProfileModal 或 GameSidebar 进入
- **解锁通知**：右下角 Toast，持续 3-4 秒
- **进度显示**：成就卡片显示进度条（如 `37 / 100`）

---

## 📦 改动清单（分 3 个子 PR）

### 🔹 子 PR 3.1：数据库 + 后端基础（**最强 Opus** 主力）

1. Supabase 迁移 `supabase/migrations/002_achievements.sql`
   - 建表（见决策 1）
   - RLS 策略
   - 种子数据（插入 12 个成就定义）
2. `server/src/routes/achievements.js`（新文件）
   - `GET /api/achievements` — 公开所有成就定义
   - `GET /api/achievements/me` — 已登录用户已解锁 + 进度
   - `POST /api/achievements/check` — 接收本局 `gameContext`，**先过 zod schema 校验**（见决策 8），再触发检查，返回新解锁列表
3. `server/src/lib/achievementEngine.js`（新文件）
   - `evaluate(userId, gameContext)` — 调用 `achievementRules.js` 中白名单函数
   - 不引入表达式解析器
4. `server/src/routes/leaderboard.js` — submitScore 后置钩子（决策 7）
   - 提交后判定：本次分数是否挤进全局 top10 → 若是，upsert `user_achievements` 写入 `leaderboard_top10`
   - 单次提交一次 `select ... order by score desc limit 10` 判定，无需 cron
5. 路由挂载 + rate limit（防刷）
6. `server/package.json` 增加 `zod` 依赖（用于 `/check` schema 校验）

**测试**（**Minimax** 写）：
- 路由 CRUD 测试
- 引擎单元测试（各种条件评估）
- 权限测试（未登录不能访问 /me）

---

### 🔹 子 PR 3.2：前端列表页 + 状态管理（**Minimax** 主力）

1. `client/src/views/AchievementsView.vue`（新）
   - 展示所有成就卡片（已解锁高亮、未解锁灰）
   - 进度型显示进度条
   - 隐藏成就未解锁时只显示 "???"
2. `client/src/stores/achievements.js`（新 Pinia store）
   - `fetchAll()` / `fetchMine()` / `checkAchievements(gameData)`
3. 路由 + ProfileModal 加入口按钮
4. API client 方法

**测试**（**Minimax**）：
- store action 测试
- AchievementsView 渲染（解锁/未解锁/隐藏）

---

### 🔹 子 PR 3.3：解锁通知 + 游戏集成（**Minimax + Opus 混合**）

1. 游戏结束时调 `store.checkAchievements(gameContext)` — 从 GameView.handleGameOver 触发
   - 2.2 已在 `handleGameOver(finalScore, speedMult, scoreMult, gameContext)` 暴露第 4 参；本迭代只加 `if (gameContext) api.achievements.check(gameContext)`
2. Toast 组件：`client/src/components/ui/AchievementToast.vue`
3. 多个成就同时解锁时排队显示
4. 在 2.1 tab 容器内加 `NTabPane name="achievements"`，内容可用"查看全部成就"按钮 → 跳 `/achievements` 页；或直接内嵌压缩列表

**Opus 审查点**：
- handleGameOver 中的异步调用顺序（成就检查、分数提交、UI 更新）
- 成就检查失败不能阻塞分数提交

---

## 🧪 TDD 步骤（总览）

### 每个子 PR 都按：RED → GREEN → review → commit

- 子 PR 3.1：后端完整 TDD，覆盖率 >= 90%
- 子 PR 3.2：前端列表页，store 覆盖核心分支
- 子 PR 3.3：集成测试 + 手动多局验证

---

## 🎯 模型分工一览

| 阶段 | 主要动作 | 模型 |
|---|---|---|
| 范围 / 成就清单 / 规则语法 | 设计 | **最强 Opus** |
| 数据建模 + RLS | 设计 + SQL | **最强 Opus** |
| 种子数据 SQL（12 行 INSERT） | 编写 | **Minimax** |
| 白名单规则函数集 | 实现 | **Minimax**，**Opus review** |
| 后端路由实现 | 编码 | **最强 Opus** |
| 后端测试 | 编码 | **Minimax** |
| 前端 store | 编码 | **Minimax** |
| 前端列表页 UI | 编码 | **Minimax** |
| Toast 通知 | 编码 | **Minimax** |
| 游戏集成（handleGameOver 改） | 编码 | **Minimax**，review **Opus** |
| 完整 code-review + security-review | 审查 | **最强 Opus** |
| commit + PR | 编写 | **最强 Opus** |

**Opus 占比约 35%**（设计 + 安全审查），**Minimax 占比 65%**。

---

## ✅ 验收标准

- [ ] Supabase 表创建 + RLS 生效（未登录不能读 user_achievements）
- [ ] `/api/achievements` 返回 12 个成就定义
- [ ] 玩一局达成 `first_bite` 条件，游戏结束后 Toast 显示解锁
- [ ] `/achievements` 页面正确显示已解锁 / 未解锁 / 进度
- [ ] 累计型成就（钻石猎人）进度随局累加
- [ ] 隐藏成就未解锁时显示 "???"
- [ ] 所有后端测试 + 前端测试全绿
- [ ] 仅执行白名单规则函数（无动态表达式执行）
- [ ] security-reviewer 无 CRITICAL / HIGH

---

## ⚠️ 风险与缓解

| 风险 | 缓解 |
|---|---|
| 动态规则执行引入注入漏洞 | 不引入表达式引擎，只用白名单规则函数 |
| 前端伪造 gameContext 刷成就 | 接受（无实际利益）；后续可服务端推导 |
| Toast 和 game over UI 冲突 | 错开层级 / 使用 portal |
| 迁移回滚困难 | 迁移文件按顺序，撤销迁移先写好 |
| 累计型成就的 progress jsonb 并发写 | Supabase RLS + 事务 / upsert with atomic increment |
| 种子数据漂移（本地和生产不一致） | 用 SQL migration 管理，不用 dashboard 手改 |

---

## 📋 PR 信息

- 分支基：`develop`
- 子分支：
  - `feat/achievements-backend`
  - `feat/achievements-ui`
  - `feat/achievements-integration`
- 每个子 PR 独立 review + merge

## 📝 后续（不在本计划范围）

- 成就点数 → 用户等级
- 成就兑换奖励（配合支付迭代）
- 社交成就（打败好友）
- 赛季成就
- 成就解锁动画 / 音效

---

## 📝 评审修订（2026-04-20）

- **硬依赖 2.2**：明确复用 `handleGameOver` 第 4 参 `gameContext`，不新造数据流
- **硬依赖 2.1**：ProfileModal tab 容器作为成就入口，不新开 modal
- **决策 7 新增**：`leaderboard_top10` 用 submitScore 后置钩子实现（单次查询），不跑定时任务
- **决策 8 新增**：`/api/achievements/check` 强制 zod schema 校验，拒绝垃圾 gameContext
- 子 PR 3.1 改动清单加 `leaderboard.js` 的 submitScore 钩子

## 📝 审查对齐修订（2026-04-21）

- 规则执行策略从“表达式 evaluator”降级为“白名单规则函数”，降低安全和维护复杂度
- 子 PR 3.1 明确增加 `zod` 依赖安装步骤，避免实现时遗漏
