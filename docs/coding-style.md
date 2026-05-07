# 代码规范

> 本文档承接 `AGENTS.md` 中"代码规范"节的底线，记录详细命名、注释、错误处理、文件组织等约定。
> 如本文档与 `AGENTS.md` 冲突，以 `AGENTS.md` 为准。

## 底线（来自 AGENTS.md）

- 单文件不超过 800 行，超过需拆分
- 单函数不超过 50 行，嵌套不超过 4 层
- 优先返回新对象，避免原地修改
- 显式处理错误，不静默吞异常
- 前端不保留 `console.log/warn/error`，后端启动日志除外
- 改动范围聚焦，不做无关重构

## 命名

| 元素 | 风格 | 示例 |
|---|---|---|
| 文件（Vue 组件） | PascalCase | `GameView.vue` |
| 文件（utility / helper） | camelCase | `formatScore.js` |
| 文件（store / composable） | camelCase | `useAuth.js`、`gameStore.js` |
| 文件（路由 / middleware） | kebab-case 或 camelCase | `auth.js`、`game-sessions.js` |
| 函数 / 变量 | camelCase | `fetchLeaderboard()` |
| 常量 | UPPER_SNAKE | `MAX_SCORE`、`DEFAULT_LIMIT` |
| 类型 / 类 | PascalCase | `GameSession` |
| Vue composable | `use` 前缀 | `useAuth`、`useGameLoop` |
| 私有 / 内部方法 | 下划线前缀 | `_cleanup()`（不测） |
| 测试文件 | `.test.js` 后缀 | `auth.test.js` |
| E2E 测试 | `.spec.js` 后缀 | `login.spec.js` |

避免：

- 缩写无解释（`mng`、`hdlr`）
- 单字母变量（`for` 循环 index 除外）
- 与全局/库名冲突（`map`、`filter` 作为变量名）

## 文件组织

- 按功能 / 领域组织，不按文件类型扁平堆叠
- 一个文件一个主导出 + 辅助 helper
- 共享 helper 放 `client/src/lib/` 或 `server/src/utils/`
- 不在组件里散落 fetch、不在 store 里写 UI 逻辑

## 注释

- 默认不写注释。命名清晰即可读
- 只在以下情况写注释：
  - 隐含约束（"调用方必须先 `init()`"）
  - 反直觉的 workaround（"workaround for Safari bug #..."）
  - 复杂正则、状态机
- 不写解释 WHAT 的注释（"this function returns x"）
- 不写引用任务/PR 编号的注释（"added for #123"）—— 信息归 commit / PR

## 错误处理

- 显式 try/catch，不静默 swallow
- 服务端日志含足够上下文（user_id、route、参数 hash），不含敏感值
- 用户面向错误：友好 message + 稳定 error code，不暴露内部
- 不滥用 `try { ... } catch { /* ignore */ }`
- 不为不可能发生的场景加 fallback；只在系统边界（用户输入、外部 API、文件系统）做防御性校验

## 不变性

- 用 `{ ...obj, field: newValue }` 替代 `obj.field = newValue`
- 用 `[...arr, item]` / `arr.filter(...)` 替代 `arr.push(...)` / `arr.splice(...)`
- Pinia / Vue store 中遵循 store API（`$patch`、action），不直接 mutate state
- 性能敏感场景例外（大数组 / 高频更新），但需注释说明

## Import 顺序

1. Node / 标准库
2. 第三方依赖（`vue`、`pinia`、`koa`）
3. 项目内 alias（`@/...`、`~/...`）
4. 相对路径（`./`、`../`）
5. 类型 import（`import type ...`）单独一组

每组之间空一行；组内建议按字母序（如 lint 未强制，不为排序单独做大范围 churn）。

## 异步与并发

- 优先 `async/await`，不混用 `.then().catch()`
- 并行独立请求用 `Promise.all`，不串行 await
- 超时与取消：长请求加 `AbortController` 或超时包裹
- 不在循环中 `await` 独立请求（除非有明确顺序依赖）

## 日志

- 前端不写 `console.log/warn/error`（除调试时临时加，提交前移除）
- 后端如已有统一 logger，优先使用 logger；尚未接入 logger 的启动日志可保留 `console.*`
- 启动日志、配置 dump 可保留，但不能含敏感值
- 错误日志含 stack trace，但响应给用户的不含

## 类型与校验

- 项目当前为 JavaScript（无 TypeScript）；新增代码保持一致
- 函数边界（路由 handler、API helper）用注释或 JSDoc 说明参数类型
- 服务端用 schema-based 校验（如已引入 `zod` / `joi`），新增校验跟随现有风格
- 不在前端校验后忽略服务端校验

## Vue / 前端特定

- 单文件组件 `<script setup>` 优先
- props 必须声明类型（即使 JS）和必要 default
- emit 名 kebab-case（`@user-updated`）
- store 公开 action camelCase；内部方法 `_` 前缀
- composable 返回响应式对象时鼓励用 `readonly` 标识不可变量，尤其是跨组件共享状态
- 不在 template 写复杂表达式，抽 computed
- v-for 必须 `:key`，且 key 稳定唯一
- 不在生命周期 hook 直接调副作用 API；用 composable 封装

## Koa / 后端特定

- 中间件按职责分文件，不在 `index.js` 写大段业务逻辑
- 路由 handler 返回值通过 `ctx.body` + `ctx.status` 显式设置
- 不在 handler 里直接 throw 字符串；用 Error 子类或统一错误工厂
- 数据库查询参数化，不字符串拼接

## 测试代码风格

- 一个 `describe` 一个被测对象
- 一个 `it` 一个行为；不堆叠 5 个 expect 测多种行为
- 用 `it.each` 替代多个相似 `it`
- 测试名描述行为，不描述实现（"rejects when password too short"，不是 "calls validate function"）
- 不测下划线开头内部方法
- 不测 Vue 框架行为（按钮渲染数量、emit 触发）
- 详细测试矩阵见 `docs/testing-strategy.md`

## 提交粒度

- 一个 commit 一个完整、可独立通过 CI 的小步
- 不在同一 commit 混入功能 + 重构 + 文档
- 重构应独立 commit，便于 diff review

## 工具与自动化

- 格式化：项目当前未强制 Prettier；保持现有风格
- Lint：`npm run lint --workspace=client` / `--workspace=server`
- 类型检查：当前 JS 无独立 type check
- 提交前自检见 `docs/development-workflow.md` §2

## 反模式速查

| 反模式 | 改 |
|---|---|
| 800+ 行单文件 | 拆模块 |
| 50+ 行函数 | 抽小函数 |
| 4+ 层嵌套 | 提前 return / 早期 break |
| 修改入参 | 返回新对象 |
| `try { } catch { }` 空 catch | 处理或重抛 |
| 组件里 `fetch` | 用 `lib/api.js` |
| `console.log` 留在前端 | 删除或换 logger |
| 测试内部下划线方法 | 测公开 API |
| 一次提交多目的 | 拆 commit |
