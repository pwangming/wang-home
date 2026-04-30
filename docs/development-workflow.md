# 开发流程

> 本文档承接 `AGENTS.md` 中"功能与变更准入标准"与"分支流程"两节，记录日常任务的详细执行步骤。
> 如本文档与 `AGENTS.md` 冲突，以 `AGENTS.md` 为准，并在任务中指出需要修正文档冲突。

## 1. 任务生命周期

每个任务按以下顺序推进，所有判断点参照 `AGENTS.md`。

1. 接到需求或问题，**先按 §2 检查工作区与分支状态**。
2. 判断变更类型、影响范围和风险等级（低/中/高）。
3. 低风险：直接执行，保持改动范围聚焦。
4. 中风险：先读相关代码 → 给出方案和取舍 → 等待用户确认 → 实施。
5. 高风险：在中风险流程基础上，额外说明测试策略、回滚方式、安全影响和未覆盖风险，等待明确确认后再实施。
6. 实施阶段优先按 TDD 顺序：写测试（RED）→ 确认失败 → 写实现（GREEN）→ 确认通过 → 重构。
7. 实施完成后执行 §3 本地自检。
8. 自检通过后按 §6 PR 流程提交。
9. 任务结束按 §8 模板汇报。

中/高风险任务开始前必须回答 `AGENTS.md` 中列出的问题。

## 2. 工作区状态规则

任务开始前必须检查工作区与分支状态：

```bash
git status --short --branch
git branch -vv --all
```

发现已有未提交改动时：

- 判断是否与当前任务相关
- 与当前任务无关：保留现场，不覆盖、不还原、不顺手提交
- 与当前任务相关：纳入本次任务范围，并在方案中说明
- 切换分支前如果存在可能被覆盖的改动，先说明风险并等待用户确认处理方式

发现意义不明的文件、分支或配置时，先调查来源，不直接删除或重置。

## 3. 本地自检 checklist

提交前最少完成以下检查。具体测试范围按 `docs/testing-strategy.md` 矩阵决定。

- [ ] `git status --short --branch` 看清当前分支与改动
- [ ] diff 只包含本任务范围，无误伤其他文件
- [ ] 按改动文件类型运行 lint 和 format
- [ ] 按改动范围运行相关单元/集成测试
- [ ] 涉及前端可见改动时，做实际页面验证（参考 `AGENTS.md` 测试与验证策略）
- [ ] 涉及构建或部署改动时，运行 `npm run build --workspace=client`
- [ ] 涉及认证、用户输入、数据库、外部 API、Cookie/Session、支付时，做安全审查（参考 `docs/security-boundaries.md`）

文档-only 改动可跳过单元测试和构建，但必须检查 Markdown 格式和链接。

## 4. 分支命名

- Codex 默认分支：`codex/<type>-<task>`
- Claude Code 默认分支：`claude/<type>-<task>`
- `type` 复用 Conventional Commits 类型：`feat`、`fix`、`refactor`、`docs`、`test`、`chore`、`perf`、`ci`
- 分支名不使用冒号，使用连字符
- 一个分支只解决一个明确目标，不混合功能、重构、清理、流程改动
- 示例：
  - `codex/docs-development-workflow`
  - `codex/feat-achievement-system`
  - `codex/fix-auth-session-cookie`
  - `claude/docs-architecture-review`

详细分支策略（develop / release / main 关系）见 `AGENTS.md` 分支流程节。

## 5. Commit 规范

- 提交信息使用 Conventional Commits 格式：`<type>: <description>`，可附 body
- type 集合与分支命名一致
- Claude Code 与 Codex 全局已禁用 AI attribution（`~/.claude/settings.json`）；提交人保持 git config 中配置的真实用户身份
- 不使用 `--no-verify`、`--no-gpg-sign` 等跳过 hook 的标志
- 多行 commit message 必须通过 HEREDOC 传入，避免 shell 处理换行错误：

```bash
git commit -m "$(cat <<'EOF'
feat: 简短描述

详细说明，可多行。
EOF
)"
```

- 不在 `main` 上直接 commit；不 amend 已推送的 commit
- 不在同一个 commit 中混入"顺手清理"的无关改动

## 6. PR 流程

### 创建前检查

- 当前分支已 push 到 origin
- CI / 自动化检查通过
- 无未解决的 merge 冲突
- 分支与目标分支保持基本同步

### PR 标题与内容

- 标题 ≤ 70 字符，遵循 Conventional Commits 风格
- Body 必须包含：
  - `## Summary`：1–3 条要点说明做了什么、为什么
  - `## Test plan`：勾选式 checklist，列出本次需验证的项

### 合并策略

- `develop` 分支 PR：创建后立即挂自动合并，等 CI 通过后自动 squash 合并并删除分支：

```bash
gh pr merge --auto --squash --delete-branch
```

- `main` 分支 PR：必须手动合并，合并前完成 `docs/release-process.md` 中的发布检查清单，确认无 CRITICAL/HIGH 风险后再合
- 不在 `main` 上启用自动合并，防止未经过最终验证的内容直接发布
- `release/*` 分支 PR 走与 `main` 相同的手动合并流程

### Dependabot PR 处理

- Dependabot PR 默认以 `develop` 为目标分支；不要直接合入 `main`。需要生产紧急安全修复时，先说明影响范围、测试结果和发布路径，再按 release/hotfix 流程进入 `main`。
- patch / minor 依赖更新可在 CI 全绿后挂 auto-merge，但必须先快速确认变更范围只包含对应 package / lockfile，且 release note 未提示 breaking change。
- major 版本、框架/构建工具/测试工具（如 Vite、Vitest、Playwright、Vue Router、Koa）和安全边界依赖（auth、session、CSRF、Supabase client）必须人工审查，不自动合并。
- 多个 Dependabot PR 同时出现时，优先安全补丁和低风险 patch；避免一次合并多条大版本升级，防止回归定位困难。
- 合并 Dependabot PR 后，如影响构建、测试或运行时行为，按本文件 §3 与 `docs/testing-strategy.md` 补充本地验证。

### 合并后动作

- 合并到 `develop` 或 `main` 后，主动运行 `vercel ls` 取最新 preview / production URL 发给用户
- 涉及生产发布（合入 `main`）时，按 `docs/release-process.md` 完成上线汇报
- 如果分支上有"修复发布问题"类提交，合入 `main` 后必须同步回 `develop`

## 7. 生成文件策略

`client/src/components.d.ts`、`client/src/auto-imports.d.ts` 等工具生成的类型声明文件不要手工编辑其内容。

- 出现 diff 时先确认来源：依赖更新、组件注册、自动导入、本地生成命令等
- 当代码改动确实影响组件或自动导入类型时，可以随对应功能一起提交生成文件变更，并在汇报中标明来源
- 当生成文件 diff 与当前任务无关时，保留现场，在汇报中列为"既有未提交改动"，不顺手提交、不还原
- 是否提交生成文件以项目当前约定为准；未定约定前不新增 `.gitignore` 规则、不批量删除生成文件
- 后续如要把生成文件改为忽略或固定生成时机，必须先给方案并等待确认

## 8. 任务完成汇报模板

每个任务结束时按以下结构汇报：

```text
分支：
创建或修改的文件：
运行过的测试与结果：
实际验证过的页面与结果：
未运行或未验证的项及原因：
剩余风险或未覆盖项：
后续建议（可选）：
```

涉及生产发布的任务，额外按 `docs/release-process.md` 中的发布汇报模板补充。

## 9. 自动化原则

- 把重复检查优先标准化为 npm scripts、CI 任务或文档清单
- 自动化脚本必须可在本地和 CI 中复现，不依赖个人机器状态
- 不为尚未稳定的流程过早添加复杂自动化
- 新增自动化前必须说明：
  - 解决什么重复问题
  - 本地怎么运行
  - CI 是否运行
  - 失败时如何排查
  - 是否会拖慢常规开发

## 不在本文范围

- 测试矩阵与覆盖率取舍：见 `docs/testing-strategy.md`
- 上线检查清单与回滚步骤：见 `docs/release-process.md`
- 安全审查清单：见 `docs/security-boundaries.md`
- 环境变量分组与同步规则：见 `docs/environment.md`
- AI 协作交接、冲突仲裁：见 `docs/ai-collaboration.md`
- MCP / plugins / skills 边界：见 `docs/ai-tooling.md`
