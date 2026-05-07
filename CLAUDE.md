@AGENTS.md

# Claude Code 补充

本仓库以 `AGENTS.md` 为 AI 协作主规则源。Claude Code 启动时通过上面的 `@AGENTS.md` 导入并遵守同一套项目规则；如导入语法在某些场景（如 subagent）不被解析，必须手动读取 `AGENTS.md`。

本文件只保留 Claude Code 与 Codex 不同的点，其余规则全部以 `AGENTS.md` 为准。

## Claude Code 专属

- **分支前缀**：`claude/<type>-<task>`（Codex 用 `codex/<type>-<task>`，详见 `docs/development-workflow.md` §3）
- **角色与分工**：详见 `docs/ai-collaboration.md`（含 Claude Code 默认不负责项、Claude Code 方案模板、交接 Codex 模板、Codex 审查模板、冲突处理）
- **方案优先**：作为主驾驶时按 `AGENTS.md` "功能与变更准入标准" 走流程——低风险直接做，中/高风险先方案后等确认，不另设硬性"禁止改代码"限制
- **方案与交接模板**：使用 `docs/ai-collaboration.md` 中的模板，不在本文件维护副本

## 与 Codex 的协作边界

- 同一时间只允许一个 AI 主驾驶修改仓库；另一个只做方案、审查或独立任务
- 不在同一分支或同一批文件上同时大范围修改
- 详细分工边界、PR 标签、冲突仲裁见 `docs/ai-collaboration.md`
