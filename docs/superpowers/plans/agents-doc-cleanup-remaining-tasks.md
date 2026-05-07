# AGENTS.md / docs 体系清理 — 剩余任务

> 创建：2026-04-30
> 上下文：本会话已完成 AGENTS.md 减重 + 11 个 docs 填充/扩展 + 6 条 P0/P1 修订（详见下方"已完成"）。本表原列出 P2 优先级剩余条目，现已全部执行完成。
> 执行方式：Codex 按 `docs/ai-collaboration.md` "审查/建议提案模板"格式逐条发用户确认 + 执行，避免一次性大改失控。

## 剩余任务表

| # | 优先 | 任务 | 影响文件 | 改动量 |
|---|---|---|---|---:|
| — | — | 暂无剩余任务 | — | — |

## 已完成（本会话，2026-04-30）

| 提案 | 文件 | 状态 |
|---|---|---|
| #1 ai-collaboration.md 角色软化 | `docs/ai-collaboration.md` | ✅ |
| #2 4 处汇报模板统一到 development-workflow.md §8 | `AGENTS.md`、`docs/ai-collaboration.md`、`docs/testing-strategy.md`、`docs/release-process.md` | ✅ |
| #3 security-boundaries.md staging 验证改"本地 + 目标态" | `docs/security-boundaries.md` | ✅ |
| #4 AGENTS.md 第 5 行触发条件收窄 | `AGENTS.md` | ✅ |
| #5 development-workflow.md §7 工作区规则提前到 §2 | `docs/development-workflow.md` | ✅ |
| #6 project-context.md "架构说明"缩成链接 ARCHITECTURE.md | `docs/project-context.md` | ✅ |
| #7 AGENTS.md 节顺序：AI 分工协作提到准入标准之后 | `AGENTS.md` | ✅ |
| #8 release-process.md 章节顺序：部署时序提到上线检查清单之前 | `docs/release-process.md` | ✅ |
| #9 Dependabot PR 处理规则 | `docs/development-workflow.md` | ✅ |
| #10 Supabase 备份/快照机制说明 | `docs/release-process.md` | ✅ |
| #11 回滚 vs forward-fix 决策标准表 | `docs/release-process.md` | ✅ |
| #12 验证 CI 覆盖率阈值 enforce 并补说明 | `client/vitest.config.js`、`.github/workflows/ci.yml`、`docs/testing-strategy.md` | ✅ |
| #13 测试矩阵增加无行为变化豁免行 | `docs/testing-strategy.md` | ✅ |
| #14 coding-style.md 软化 readonly/import/logger 规则 | `docs/coding-style.md` | ✅ |
| #15 AGENTS.md 文档索引增加 plans README | `AGENTS.md` | ✅ |
| #16 incident postmortem 模板 | `docs/security-boundaries.md`、`docs/incidents/README.md` | ✅ |
| 新增：四段式提案模板写入 ai-collaboration.md | `docs/ai-collaboration.md` | ✅ |
| 新增：四段式偏好存用户 memory + MEMORY.md 索引 | `~/.claude/projects/.../memory/` | ✅ |

## 用户偏好的提案模板（执行时使用）

```text
## 提案 #N：<标题>

### 问题
<事实描述：当前规则/代码/文档存在什么问题，引用具体文件:行号>

### 建议
<推荐改法。代码/规则可贴片段>

### 优缺点
| 方案 | 优 | 缺 |
|---|---|---|
| 推荐方案 | ... | ... |
| 备选 1 | ... | ... |

### 最佳实践（取舍原因）
<为什么选推荐方案：原则、先例、可维护性、与项目现状的契合度>

### 具体改法（如需立即落地）
<最终内容或 diff>

确认后执行。
```

适用：**审查/修订/优化**场景。新功能方案另用 `docs/ai-collaboration.md` "Claude Code 方案模板"。

模板已写入 `docs/ai-collaboration.md` "审查/建议提案模板"节，跨会话/Codex 都可引用。

## 执行注意

- 一次发一条提案，等用户确认再发下一条；不要批量改。
- 推荐方案放优缺点表第一行。
- "最佳实践（取舍原因）"段必写为什么选推荐——这是用户偏好的核心，不是装饰。
- 涉及代码改动按 `AGENTS.md` 风险准入流程；本表所列 P2 任务多为文档改动，属低风险，可直接执行后汇报。

## 完成判定

全部 10 条已执行完。归档或提交前，再做一次 AGENTS.md + docs 全体扫读，确认：

1. 所有 doc 顺序合理、无时序倒挂
2. 所有"目标态"内容明确标注 `[目标态]`
3. 无重复事实多处描述
4. 无规则与现实矛盾
5. AGENTS.md 行数控制在 160–200 之间，未再膨胀

完成后此 plan 文件可移入 `docs/archive/` 或保留在 plans 作为历史记录。
