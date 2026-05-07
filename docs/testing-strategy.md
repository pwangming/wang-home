# 测试策略

> 本文档承接 `AGENTS.md` 中"测试原则"节的底线，记录详细测试矩阵、覆盖率取舍和各类改动对应的验证方式。
> 如本文档与 `AGENTS.md` 冲突，以 `AGENTS.md` 为准。

## 测试工具职责

| 工具 | 用途 | 不替代什么 |
|---|---|---|
| Vitest（client） | 函数、composable、store action、表单校验、fetch 错误处理 | 不替代 E2E |
| Jest（server） | 路由、middleware、session、CSRF、限流、错误处理、边界条件 | 不替代 E2E |
| Playwright | E2E、真实浏览器流程、UI、路由、表单、游戏交互、响应式、关键用户路径 | 不替代代码级单元测试 |
| Chrome DevTools / browser MCP | 调试、观察、截图、网络/Cookie/CSS/DOM 分析 | 不作为 CI 必需依赖 |

按下方测试矩阵组合验证；涉及真实用户路径时，Vitest/Jest、Playwright 和实际页面验证互不替代。

## 改动范围 → 必跑测试矩阵

| 改动类型 | 必跑 | 推荐附加 |
|---|---|---|
| 文档-only | Markdown 格式 + 链接检查 | — |
| 无行为变化（纯注释 / 重命名 / typing / 生成类型文件同步） | diff 自检，确认无运行时代码变化 | 相关 lint（如改动文件会被 lint 覆盖） |
| 前端 utility / helper | `npm run test --workspace=client` | — |
| 前端 store / composable | `npm run test --workspace=client` | 涉及 UI 时手动页面验证 |
| 前端 view / 路由 | `npm run test --workspace=client` + Playwright 关键流程 | 实际页面验证 |
| 前端样式 / 动画 | 手动页面验证（多视口） | Playwright 视觉回归（如有） |
| 后端 route / handler | `npm run test --workspace=server` | E2E（涉及前端流程时） |
| 后端 middleware（auth/csrf/rateLimit/session） | `npm run test --workspace=server` + E2E 登录/写接口 | 实际页面验证 cookie 行为 |
| Supabase migration | 当前态：本地 Supabase 验证；远程操作需用户确认 | 目标态：staging Supabase 验证 + 回滚脚本验证 |
| 跨前后端（认证、排行榜、游戏结算、未来支付） | client + server 单元 + E2E | 实际页面验证两环境 |
| 构建/部署改动 | `npm run build --workspace=client` | server 启动检查 |
| Bug 修复 | 必补回归测试 + 上述对应改动测试 | — |

## 覆盖率策略

不追求整体 100%，追求核心模块高覆盖，非核心按需测。

### 核心模块（必须重点测）

- `server/src/routes/*`
- `server/src/middleware/*`
- `client/src/lib/api.js`
- `client/src/composables/*`
- `client/src/stores/*` 公开 action（`_` 内部方法除外）
- Login / Register / ResetPassword 等表单校验函数
- 数据转换函数
- fetch 错误处理路径

### 非核心模块（按条件分支或业务规则测）

- 展示性组件只测条件分支和 fallback
- UI primitives 通常不加单元测试
- 速度/得分倍率映射用 `it.each` 测规则，不测渲染
- `GameView.vue`、`SnakeGame.vue` 主要由 Playwright E2E 覆盖

### 禁止凑数测试

- 不测 Vue 框架行为（模板按钮数、点击是否 emit）
- 不测下划线开头的内部清理方法
- 不测未来功能占位文案
- 不把同一规则拆成多个 `it` 刷行数（用 `it.each`）
- 不为覆盖率测 `App.vue`、`main.js`、router

## 当前前端覆盖率门槛

当前前端覆盖率阈值由 `client/vitest.config.js` 配置，并通过 GitHub CI 的 `test-client` job 执行 `npm run test:coverage --workspace=client` 强制检查。

| 指标 | 阈值 |
|---|---:|
| lines | 90% |
| statements | 90% |
| branches | 85% |
| functions | 80% |

## 实际页面验证

涉及前端可见 UI、路由、表单、样式、游戏画面或关键交互改动时，除单元测试 / 构建外**必须做实际页面验证**。

### 至少检查

- [ ] 页面正常加载，无控制台报错
- [ ] 新增或修改的 UI 可见，布局正常
- [ ] 关键交互可用（点击、输入、提交、跳转）
- [ ] 无明显遮挡 / 溢出 / 重叠 / 空白
- [ ] 移动端/窄屏风险高时，必须检查窄屏（≤ 480px）

### 工具偏好

- 优先 Playwright CLI
- 让用户看每一步页面：`--headed` / `--ui` / `--debug`
- 难复现问题：保留 trace / video

```bash
npm run test:e2e --workspace=client -- --headed
npm run test:e2e --workspace=client -- --ui
npm run test:e2e --workspace=client -- --debug
```

## E2E 关键场景清单

发布前必须跑通的关键流程（按优先级）：

1. 登录 / 注册 / 找回密码
2. 游戏开始 → 进行 → 结算 → 提交分数
3. 排行榜读取与排序
4. 个人资料编辑
5. 皮肤选择（已上线）
6. 账户安全设置
7. 邮箱变更确认跳转
8. 未来：成就解锁、支付下单 / 支付回调

E2E 不在 CI 跑（个人项目不建独立 Supabase 测试环境）；本地用 `cd client && npm run test:e2e` 在发版前 / 大功能改动时自测。

## 修 bug 必补回归

- 所有 bug 修复必须新增能复现该 bug 的测试
- 测试名应含 bug 标识或行为描述
- 不能补测试时必须说明原因和剩余风险
- 不允许通过弱化断言、删测试、mock 核心逻辑来"通过"

## 测试隔离与清理

- 单元测试不依赖外部网络、外部数据库（除非显式 setup mock）
- 后端测试使用独立 test fixture，不污染本地 / staging Supabase
- E2E 使用专用测试账号 / 测试数据；运行后清理
- 不在测试中硬编码生产密钥或真实账号

## 失败排查顺序

1. 看错误信息，定位失败位置
2. 检查测试隔离（mock 是否泄漏到下个 test）
3. 检查 mock 是否反映真实行为
4. 修实现，**不修测试**（除非测试本身错）
5. 修测试时说明原因 + 让用户确认

## 最终汇报

任务汇报模板见 `docs/development-workflow.md` §8。

本节强调：测试与页面验证字段必须填写，不能因"环境限制"沉默跳过——无法验证时必须显式说明原因（缺少账号、缺少 staging、CI 不跑 E2E 等）。
