# Claude Code 最佳实践

> 基于本项目（Vue/Koa/Supabase + Vercel/Railway）和已优化的全局配置整理。按优先级从高到低。

---

## 1. 模型分层使用

| 场景 | 模型 | 切换方式 | 理由 |
|---|---|---|---|
| 日常改 bug / 小功能 | Sonnet 4.6 | `/model sonnet`（已设默认） | 能力够用，成本 ~1/5 Opus |
| 架构决策 / 多文件重构 / 复杂规划 | Opus 4.7 | `/model opus` | 深度推理 |
| 并行 sub-agent worker | Haiku 4.5 | agent 配置里指定 | 最省钱 |

**原则**：别全局用 Opus，按任务难度切换。单 session 内可随时切。

---

## 2. 上下文卫生

- **新议题必 `/clear`** —— 跨任务上下文污染严重，容易输出偏离
- **长任务 > 20 轮** —— 手动 `/compact` 压缩，超过 80% 上下文性能断崖下跌
- **单 session 干一件事** —— 改 bug、写功能、重构分开开 session
- **避免最后 20% 上下文窗口** —— 大型重构提前开新 session

---

## 3. 权限两级管理

### 全局 `~/.claude/settings.json`
放 99% 项目通用命令：`npm/pnpm/yarn/node/npx/git/supabase` 等。

### 项目 `.claude/settings.local.json`
放本项目特有：`gh`、`supabase` 具体子命令、部署命令。

### 绝对禁止
- ❌ `--dangerously-skip-permissions`
- ❌ `defaultMode: "acceptEdits"` + 宽松 bash 权限（双重放任）
- ❌ 把一次性绝对路径命令永久 allow

---

## 4. 开发工作流（项目强制）

```
方案确认 → TDD (RED) → 实现 (GREEN) → code-reviewer → security-reviewer* → commit
```

*涉及认证/用户输入/DB 查询/外部 API/Cookie/Session 时必须调用

**非琐碎改动先给方案**：新功能、重构、多文件改动、涉及认证/部署/DB 的修改都要先分析现状 → 提方案 → 等确认 → 再执行。

**可直接动手的例外**：单文件小修、拼写/格式修正、显而易见的 bug 且改动极小。

---

## 5. Git 工作流

| 规则 | 说明 |
|---|---|
| 每次改完立刻 commit | 小 commit 好 review、好 revert |
| 禁止 main 直推 | 必须走 PR，已有 ruleset 保护 |
| commit 前跑 `git diff` | 排除 `.env`、`settings.local.json` 意外泄漏 |
| Dependabot PR 批量处理 | 积 3-5 个再处理，别逐个处理 |
| Conventional Commits | `feat/fix/refactor/docs/test/chore/perf/ci:` 开头 |
| 文件 <= 800 行，函数 <= 50 行 | 超了必拆 |

---

## 6. TDD 实战节奏

```bash
# 后端 watch 模式
cd server && npm test -- --watch

# 前端 watch 模式
cd client && npm test -- --watch
```

**流程**：
1. 先写测试 → 确认失败（RED）
2. 写最小实现 → 确认通过（GREEN）
3. 重构
4. 验证覆盖率

**覆盖率策略**（项目特化）：
- 核心模块（routes/middleware/composables/stores/api.js）**≥ 90%**
- 非核心（UI primitives、纯渲染组件）按需测或交给 E2E
- 禁止凑数测试（测框架行为、测内部方法、为覆盖率测 main.js）

---

## 7. Skills 管理

- `everything-claude-code` 已禁用（节省 ~190 个 skill 元数据 tokens）
- **按项目开关插件**：`.claude/settings.local.json` 里 `enabledPlugins` 覆盖全局
- 做设计时再开 `figma`/`frontend-design`，平时关
- `find-skills` skill 可查当前可用 skill

**重新开启某插件**：
```json
// ~/.claude/settings.json
"enabledPlugins": {
  "everything-claude-code@everything-claude-code": true
}
```

---

## 8. Memory 系统原则

使用 `claude-mem` 插件跨 session 持久化。

### ✅ 存
- 用户角色、偏好、知识背景
- 失败教训、被纠正的做法（feedback 类型）
- 项目决策原因、外部约束
- 外部系统位置（Linear 项目名、Grafana URL）

### ❌ 不存
- 代码模式、文件路径、架构（可直接读代码）
- git 历史、谁改了什么（可查 git log）
- 已在 CLAUDE.md 里的内容
- 临时任务状态（用 todo 或 plan 持久化）

### 使用规则
- 新 session 自动 load 最近 memory
- **用之前验证未过期**（recall 到 "文件 X"，先 grep 确认存在）

---

## 9. 部署流程（项目特化）

### 前端（Vercel）
- PR 自动给 Preview URL，先在 Preview 验证再 merge
- 部署域名：`https://client-inky-two.vercel.app`
- **不要**设置 `VITE_API_BASE` env var，让它默认走 `/api` 代理

### 后端（Railway）
- 自动从 Git push 部署
- 改 env 后重启并手动验证接口
- `app.proxy = true` 必须保留（TLS 终止在 Railway 边缘）

### 生产发布链路
```
feature branch → develop（PR + CI）→ main（PR + CI + Vercel Production）
```

**生产出问题**：**先回滚止血**，再前进修复。

---

## 10. 成本监控

每周扫 `~/.claude/cost-tracker.log`。警报线：

| 信号 | 阈值 | 原因 |
|---|---|---|
| 单日费用 | > $50 | 任务太散 / 上下文没清 |
| 单 session 费用 | > $20 | 该拆 session 了 |
| Opus 调用占比高 | > 30% | 审视是否必要用 Opus |

---

## 11. 危险操作铁律

**必须二次确认后再执行**：

- `git push --force`（特别是 main/master）
- `rm -rf`（特别是路径含变量）
- `DROP TABLE` / `TRUNCATE`
- 改 `main` 分支直接推送
- 删除 branch / tag
- 发 email / PR comment / Slack 消息
- 改 CI/CD 配置
- 上传敏感内容到第三方工具（diagram renderer、pastebin、gist）

`defaultMode: "default"` 的设计就是强制这些操作二次确认。

---

## 12. 日常清理

### 每次 session 结束
- 做完立即 `/exit`，别让 session 空闲烧钱

### 每周
- `~/.claude/projects/` 清老 session（当前 144MB）
- `git gc` 清仓库碎片
- `npm prune` 清未用依赖

### 每月
- 审视 `settings.json` 权限 allow 列表，删不再用的
- 审视 memory 过期条目
- 检查 `~/.claude/plugins/cache/` 大小

---

## 13. 写好 CLAUDE.md 让 AI 读懂

AI 扫描模式和人不同。原则：

- **表格 > 段落** —— AI 提取表格比段落准
- **关键约束用 🔴 / 粗体** —— AI 对视觉标记敏感
- **规则列表用 checklist** —— `- [ ]` 格式
- **禁止项单独一节列清楚** —— 别混在"建议"里
- **例外条件明确写** —— 避免 AI 过度保守或越界

---

## 14. Sub-agent 并行使用

独立任务并行跑，不串行：

```
同一消息里开多个 Agent：
- code-reviewer 审 auth 模块
- security-reviewer 扫注入
- test-runner 跑 E2E 回归
```

用场景：
- 多角度代码审查
- 并行探索大 codebase
- 独立模块的测试运行
- 多个数据源研究

**不要用场景**：
- 简单单文件任务（开 agent 反而慢）
- 有依赖关系的任务（必须串行）
- 为了"看起来忙"开一堆 agent

---

## 15. 项目特定快速参考

### 常用命令
```bash
npm run dev           # 同时启动前端和后端
npm run dev:client    # 前端 (端口 3000)
npm run dev:server    # 后端 (端口 4000)

cd client && npm test              # Vitest 前端单测
cd client && npm run test:e2e      # Playwright E2E
cd server && npm test              # Jest 后端单测

supabase db push                   # 推本地迁移到远程
supabase db push --project-ref kltksixmakbpcljjkvbw  # 推生产
```

### 关键 env 变量
- Railway：`SESSION_SECRET`、`SUPABASE_*`、`ALLOWED_ORIGINS`、`NODE_ENV=production`
- Vercel：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`（**不要** `VITE_API_BASE`）

### 项目 CLI（已本地安装）
Supabase CLI、Playwright CLI、Vercel CLI、Railway CLI、gh CLI

---

## 16. 一个 session 的理想开头

```
1. /clear（新议题）
2. 描述任务 + 约束
3. 若非琐碎 → 要求先出方案
4. 方案确认 → 开 TaskCreate 拆步骤
5. TDD 开始（先写测试）
6. 每完成一步 → 更新 Task 状态
7. 全部完成 → code-reviewer / security-reviewer
8. 审查通过 → commit + push
9. /exit
```

---

## 变更记录

- **2026-04-19**：初版创建，整理自全局 rules 和项目 CLAUDE.md，配合刚完成的 Claude Code 配置优化
