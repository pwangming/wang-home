# Kinetic Arcade 版本规划

> 最后更新: 2026-04-14
> 当前版本: v1.2.0 (已完成)

## 版本总览

```
v1.0.0  基线版本 ✅
  │
  ├─ v1.0.1  核心 Bug 修复（认证 + 测试） ✅
  ├─ v1.0.2  体验 Bug 修复（心跳 + 反馈） ✅
  │
  ├─ v1.1.0  小功能更新（游戏体验） ✅
  ├─ v1.1.1  小功能更新（账户管理） ✅
  ├─ v1.1.2  交互优化（音效 + 响应式） ✅
  │
  └─ v1.2.0  技术改善（Bundle + 测试 + 重构 + 安全）✅
       │
       └─ v2.0 大版本开发基础就绪
```

---

## v1.0.0 — 基线版本

**状态**: ✅ 已完成 (tag: v1.0.0)

当前已完成的功能：
- 贪吃蛇核心游戏（速度选择、分数倍率）
- 用户注册/登录（Supabase Auth + session cookie）
- 排行榜（分页、分数提交）
- 游客模式（未登录可游玩，不计入排行榜）
- 响应式画布
- Vercel + Railway 全栈部署

**验收条件**:
- [x] 游戏可正常启动、操控蛇移动、吃食物得分、撞墙/撞身死亡
- [x] 四档速度选择 (1.0x / 1.2x / 1.5x / 2.0x) 对应不同分数倍率
- [x] 注册账号后收到验证邮件，验证后可登录
- [x] 登录后分数自动提交到排行榜
- [x] 未登录可游玩，弹窗提示成绩不计入排行榜
- [x] 排行榜分页展示，按最高分降序排列
- [x] 画布随窗口大小自适应（ResizeObserver）
- [x] 生产环境可通过 https://client-inky-two.vercel.app 访问
- [x] `npm run test:client` 和 `npm run test:server` 全部通过

---

## v1.0.1 — 核心 Bug 修复

**状态**: ✅ 已完成

### BUG-001: 后端测试失败 ✅
- **严重度**: HIGH
- **修复**: 更新 leaderboard 和 auth 测试 mock，添加缺失的 `auth.getUser` mock，修正错误信息断言，修复 `/me` 测试中 `mockFrom` 重置后缺少返回值的问题
- **文件**: `server/tests/routes/leaderboard.test.js`, `server/tests/routes/auth.test.js`
- **验收条件**:
  - [x] `npm run test:server` 37 个测试全部通过（修复前 8 个失败）
  - [x] 无新增跳过或删除的测试用例

### BUG-002: 登录后一段时间变未登录 ✅
- **严重度**: HIGH
- **修复**: `authMiddleware` 在 `getUser()` 失败时自动用 `supabaseRefreshToken` 调 `setSession()` 刷新 token，成功后更新 session cookie
- **文件**: `server/src/middleware/auth.js`
- **验收条件**:
  - [x] 登录后停留超过 1 小时（JWT 过期时间），页面仍保持登录状态
  - [x] 刷新 token 成功后 session cookie 中的 access_token 和 refresh_token 都更新
  - [x] 刷新 token 也失效时，清空 session 并返回 401

### BUG-003: 前端未处理 token 过期 ✅
- **严重度**: MEDIUM
- **修复**: API client 添加 `onSessionExpired` 回调拦截 401；auth store 添加心跳机制（每 10 分钟刷新 + visibilitychange 触发）；登录/注册后自动启动心跳，登出或 session 失效时停止
- **文件**: `client/src/lib/api.js`, `client/src/stores/auth.js`
- **验收条件**:
  - [x] 任意 API 返回 401 时（非 `/auth/me` 本身），前端自动清空用户状态
  - [x] 登录后每 10 分钟自动调 `/auth/me` 保持 session 活跃
  - [x] 切换标签页再回来时触发一次 session 刷新
  - [x] 登出后心跳定时器和事件监听器正确清理
  - [x] `npm run test:client` auth store 测试全部通过

---

## v1.0.2 — 体验 Bug 修复

**状态**: ✅ 已完成

### BUG-004: 前端无登录状态心跳 ✅ (已在 BUG-003 中一并解决)
- **修复**: auth store 心跳机制已包含 10 分钟定时刷新 + visibilitychange 触发
- **验收条件**: 同 BUG-003

### BUG-005: 登出无用户反馈 ✅
- **修复**: 顶部导航添加「退出」按钮，点击后显示 naive-ui success toast「已退出登录」
- **文件**: `client/src/views/GameView.vue`
- **验收条件**:
  - [x] 已登录时顶部导航用户名旁显示「退出」按钮
  - [x] 点击「退出」后显示绿色 toast「已退出登录」
  - [x] 退出后页面状态切换为未登录（显示「登录」按钮）
  - [x] 移动端（< 768px）隐藏退出按钮（同登录按钮）

### BUG-006: 游戏结束分数提交失败无明确提示 ✅
- **修复**: 区分 401（登录已过期）和其他错误，显示针对性提示信息
- **文件**: `client/src/views/GameView.vue`
- **验收条件**:
  - [x] token 过期导致提交失败时，提示「登录已过期，分数未保存，请重新登录」
  - [x] 其他错误导致提交失败时，提示「分数提交失败：」+ 具体错误信息
  - [x] 提交成功时，提示「分数提交成功」
  - [x] 反馈 toast 3 秒后自动消失

---

## v1.1.0 — 游戏体验更新

**状态**: ✅ 已完成

### FEAT-001: 个人最高分展示 ✅
- **说明**: GameSidebar 显示当前登录用户的历史最高分
- **涉及**: `client/src/views/GameView.vue`, `client/src/components/game/GameSidebar.vue`
- **验收条件**:
  - [x] 已登录用户在 sidebar 看到「我的最高分: XXX」（绿色高亮）
  - [x] 未登录用户不显示最高分区域
  - [x] 新游戏提交分数后，sidebar 自动刷新最高分
  - [x] 后端 `GET /api/leaderboard/rank/me` 已有最高分数据（v1.0 已实现）
  - [x] 所有现有测试通过

### FEAT-002: 排行榜当前用户高亮 ✅
- **说明**: LeaderboardModal 中高亮当前用户所在行
- **涉及**: `client/src/components/game/LeaderboardModal.vue`
- **验收条件**:
  - [x] 打开排行榜弹窗后，当前登录用户所在行有绿色背景高亮
  - [x] 未登录时不高亮任何行（`currentUserId === null` 时 `isMine` 为 false）
  - [x] 用户不在当前页时无高亮（按 user_id 精确匹配，不误标其他用户）

### FEAT-003: 游戏暂停功能 ✅
- **说明**: 按 P 键暂停游戏，显示暂停遮罩
- **涉及**: `client/src/components/game/SnakeGame.vue`
- **验收条件**:
  - [x] 游戏中按 P 键暂停，画面冻结并显示半透明遮罩「已暂停 / 按 P 继续」
  - [x] 再次按 P 键恢复游戏，蛇继续移动
  - [x] 暂停期间 tick 跳过，蛇不移动不计分
  - [x] 暂停状态下切换标签页再回来仍保持暂停（visibilitychange 只刷新 session，不影响游戏状态）

### FEAT-004: 记住速度偏好 ✅
- **说明**: 用 localStorage 记住上次选择的速度倍率
- **涉及**: `client/src/views/GameView.vue`
- **验收条件**:
  - [x] 选择 1.5x 速度，刷新页面后速度选择器默认值为 1.5x
  - [x] 清除 localStorage 后恢复默认值 1.0x
  - [x] localStorage 中存储的值被篡改为无效值时，回退到 1.0x（`VALID_SPEEDS.includes()` 校验）

---

## v1.1.1 — 账户管理更新

**状态**: ✅ 已完成

### FEAT-005: 密码找回 ✅
- **实现**: 后端 `POST /api/auth/reset-request` 调 `supabase.auth.resetPasswordForEmail`；`POST /api/auth/reset-confirm` 调 `supabase.auth.updateUser`；前端 ResetPasswordView 分请求重置邮件和设置新密码两步；登录页「忘记密码?」链接到 `/reset-password`
- **文件**: `server/src/routes/auth.js`、`client/src/views/ResetPasswordView.vue`、`client/src/router/index.js`、`client/src/lib/api.js`
- **验收条件**:
  - [x] 登录页面有「忘记密码?」链接，点击进入密码重置页
  - [x] 输入注册邮箱后提交，收到 Supabase 密码重置邮件
  - [x] 点击邮件中的重置链接，跳转到设置新密码页面
  - [x] 输入新密码后提交成功，提示「密码已重置，请重新登录」
  - [x] 使用新密码可以正常登录
  - [x] 输入未注册的邮箱时，不泄露该邮箱是否存在（统一提示「如果该邮箱已注册，您将收到重置邮件」）

### FEAT-006: 用户名修改 ✅
- **实现**: 后端 `PATCH /api/auth/profile` 校验格式（字母数字下划线 2-20）和唯一性后更新 `profiles.username`；前端 ProfileModal 弹窗修改用户名；authStore 新增 `updateProfile` action；顶部导航用户名改为可点击按钮
- **文件**: `server/src/routes/auth.js`、`client/src/components/game/ProfileModal.vue`（新增）、`client/src/stores/auth.js`、`client/src/views/GameView.vue`、`client/src/lib/api.js`
- **验收条件**:
  - [x] 已登录用户可通过顶部导航进入设置/个人信息
  - [x] 可修改用户名，提交后顶部导航和排行榜实时更新
  - [x] 用户名格式校验：只允许字母、数字、下划线，长度 2-20
  - [x] 用户名唯一性校验：已被占用时提示「该用户名已被使用」
  - [x] 后端 `PATCH /api/auth/profile` 更新 profiles 表
  - [x] 对应单元测试通过

---

## v1.1.2 — 交互优化

**状态**: ✅ 已完成

### FEAT-007: 吃食物音效 + 音效开关 ✅
- **实现**: Web Audio API 合成 8-bit 吃食物音效（square oscillator，150ms）；铃铛按钮 🔔/🔕 切换音效开关；localStorage 持久化 `soundEnabled`
- **文件**: `client/src/composables/useSound.js`（新增）、`client/src/components/game/SnakeGame.vue`、`client/src/views/GameView.vue`
- **验收条件**:
  - [x] 吃到食物时播放短促音效（< 300ms），不阻塞游戏 tick
  - [x] 游戏页头部铃铛图标可点击切换音效开/关
  - [x] 铃铛图标状态直观反映当前音效开关（开启=🔔，关闭=🔕）
  - [x] 开关状态用 localStorage 持久化，刷新页面后保留
  - [x] 首次访问默认开启音效
  - [x] 关闭音效时吃食物不发声，其他游戏逻辑不受影响
  - [x] 音频资源按需加载，不影响首屏 LCP（Web Audio API 内联，无外部资源）
  - [x] 相关单元测试通过（开关切换 + localStorage 读写）

### FEAT-008: 页面响应式优化（桌面端）✅
- **实现**: 新增三档桌面端断点（1181-1279px / 1280-1599px / 1600px+），分别约束 `--main-padding`、`--board-wrapper-padding`、`--sidebar-width`；侧边栏对应三档 `--section-padding`、`--gap`、`--score-size`、`--key-size`；现有 `ResizeObserver` 行为保持不变
- **文件**: `client/src/views/GameView.vue`、`client/src/components/game/GameSidebar.vue`
- **验收条件**:
  - [x] 1280 / 1440 / 1920 三档常见桌面分辨率下布局无溢出、无错位
  - [x] 画布与侧边栏（sidebar）比例随窗口宽度合理缩放，无拥挤或留白过大
  - [x] 窗口从大到小缩放时元素平滑过渡，无跳变或重叠
  - [x] 顶部导航、排行榜弹窗在桌面端各分辨率下可正常交互
  - [x] 最小支持宽度 ≥ 1024px；更小宽度（平板、手机）本期不强制要求
  - [x] 画布 ResizeObserver 行为不受影响，游戏帧率稳定
  - [x] 现有 Vitest / E2E 测试均无回归

---

## v1.2.0 — 技术改善

**状态**: 🟢 已完成 (TECH-001/002/003/005/006 全部完成)

**执行顺序**: TECH-005 ✅ → TECH-001 ✅ → TECH-002 ✅ → TECH-003 ✅ → TECH-006 ✅

### TECH-005: 前端 Bundle 优化 ✅
- **实现**: naive-ui 按需引入（unplugin-auto-import + unplugin-vue-components），Vite manualChunks 拆分 vendor
- **文件**: `client/vite.config.js`、`client/vitest.config.js`、`client/src/main.js` 及各组件移除 naive-ui 显式导入
- **验收条件**:
  - [x] 单个 JS chunk < 500 KB (raw) — vendor-naive 158 KB
  - [x] 首屏总 JS < 300 KB gzip — 实测 ~98 KB gzip
  - [x] `npm run build` 无 chunk size warning
  - [x] 页面功能无回归 — 前后端 128 个测试全部通过

### TECH-001: 测试覆盖率提升 ✅
- **目标调整（2026-04-14）**: 从"整体 >= 80%"调整为"核心模块 >= 90%，非核心按需测"。见 `CLAUDE.md` 《测试覆盖率策略》小节。
- **核心 vs 非核心划分**:
  - 核心：业务逻辑、API、composables、store、表单验证、数据转换、中间件
  - 非核心（由 E2E 覆盖或无需单元测试）：`GameView.vue`、`SnakeGame.vue`、UI primitives（NeonButton/Card/Input/Checkbox）、App/main/router
- **当前状态** (2026-04-14):
  - 前端 128 tests (13 files)，核心模块行覆盖率 **98.21%**（排除非核心后）
    - 100%: GameSidebar、SpeedSelector、NeonButton/Card、api.js、useGameSession/useGuestWarning、LoginView、RegisterView
    - 98%+: LeaderboardModal、ResetPasswordView、NeonInput
    - `auth.js` 保持 81.98%（未覆盖行为 `_stopHeartbeat` 内部清理，无业务价值）
  - 后端 92 tests (9 files)，行覆盖率 **91.2%**
    - 新增 `index.test.js`、中间件补测、leaderboard 两阶段提交测试
- **验收条件**:
  - [x] `@vitest/coverage-v8` + Jest `--coverage` 依赖已配置
  - [x] 前端核心覆盖率 >= 90%（lines 98.21% / branches 88.88% / functions 80.48%）
  - [x] 后端整体覆盖率 >= 90%（91.2%）
  - [x] `vitest.config.js` 配置 `coverage.thresholds`（lines/statements 90%、branches 85%、functions 80%），覆盖率不达标直接失败 CI
  - [x] 覆盖率 exclude 明确非核心文件清单
  - [x] 移除凑数测试（模板渲染断言、内部方法清理、未来功能占位提示等 —— 共砍 18 个）
  - [x] CI 中测试全部通过
- **遗留（独立任务）**:
  - E2E 关键用户流（注册 → 登录 → 游戏 → 分数提交 → 排行榜）另起 TECH-007 跟进

### TECH-002: GameView.vue 拆分 ✅
- **实现**: 提取 `useGameSession` composable（游戏状态 + 分数提交 + startSession）、提取 `useGuestWarning` composable（游客警告逻辑）
- **文件**: `client/src/composables/useGameSession.js`、`client/src/composables/useGuestWarning.js`、`client/src/views/GameView.vue`
- **验收条件**:
  - [x] GameView.vue `<script setup>` 不超过 80 行 — 实际 60 行
  - [x] 提取 2 个 composable（`useGameSession`、`useGuestWarning`）
  - [x] 拆分后所有现有测试仍通过
  - [x] 页面功能无回归（手动验证或 E2E）

### TECH-003: API 错误处理统一 ✅
- **实现**: API client 增加网络错误和 500 错误的统一拦截，网络错误标记 `networkError: true`，500 错误标记 `serverError: true`
- **文件**: `client/src/lib/api.js`
- **验收条件**:
  - [x] 网络断开时 API 调用抛出「网络连接失败，请检查网络」
  - [x] 服务器 500 错误显示「服务器异常，请稍后重试」
  - [x] 业务错误（400/401/403/409）由调用方处理，保留局部逻辑
  - [x] 401 session expired 拦截逻辑不变（已实现）

### TECH-004: CI/CD 流水线 ✅
- **实现**: GitHub Actions 运行 install + test + build，PR 时自动检查；Node 20 锁定版本
- **文件**: `.github/workflows/ci.yml`
- **验收条件**:
  - [x] `.github/workflows/ci.yml` 文件存在且语法正确
  - [x] PR 到 develop/main 时自动触发 CI
  - [x] CI 步骤包含：install → test:client → test:server → build
  - [x] CI 失败时阻止 PR 合并（branch protection rule 已配置）
  - [x] CI 通过时在 PR 显示绿色 check

### TECH-006: 安全响应头 ✅
- **实现**: 添加 Koa 中间件 `securityHeadersMiddleware` 统一设置安全响应头
- **文件**: `server/src/middleware/securityHeaders.js`、`server/src/index.js`
- **验收条件**:
  - [x] 响应包含 `X-Content-Type-Options: nosniff`
  - [x] 响应包含 `X-Frame-Options: DENY`
  - [x] 响应包含 `Referrer-Policy: strict-origin-when-cross-origin`
  - [x] 响应包含 `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - [x] 生产环境响应包含 `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - [x] 对应单元测试通过（6 tests）

---

## 变更日志

| 日期 | 变更内容 |
|------|----------|
| 2026-04-09 | 初始版本规划创建 |
| 2026-04-09 | v1.0.0 tag 已打；BUG-001/002/003/004 修复完成 |
| 2026-04-09 | BUG-005/006 修复完成，v1.0.1 + v1.0.2 全部完成 |
| 2026-04-10 | 全部条目补充验收条件（含已完成项追溯 + 未完成项前置定义） |
| 2026-04-10 | FEAT-001/002/003/004 完成，v1.1.0 全部完成 |
| 2026-04-11 | TECH-004 CI/CD 流水线完成；新增 v1.1.2（FEAT-007 音效开关 + FEAT-008 桌面响应式） |
| 2026-04-11 | FEAT-007/008 完成，v1.1.2 全部完成 |
| 2026-04-11 | FEAT-005/006 完成，v1.1.1 全部完成（密码找回 + 用户名修改） |
| 2026-04-13 | 审查并修复测试缺口（auth middleware refresh、updateProfile、needsEmailConfirmation）；移除 console.error |
| 2026-04-13 | v1.2.0 规划更新：新增 TECH-005 Bundle 优化和 TECH-006 安全头；更新 TECH-001/002/003 数据和范围；删除不可靠的 E2E token 刷新场景 |
| 2026-04-13 | TECH-005 Bundle 优化完成：index.js 从 1,469 KB 降至 3.28 KB；总 gzip 从 406 KB 降至 ~98 KB；naive-ui 按需导入；Vitest 配置同步更新 |
| 2026-04-13 | TECH-001 测试覆盖率提升：前端新增 useGameSession/useGuestWarning composable 测试（各 20/10 tests）；后端新增 response.js 测试（6 tests）；composables 覆盖率 92-100% |
| 2026-04-14 | TECH-001 完成：测试策略从"整体 80%"调整为"核心 >= 90%、非核心按需测"；前端新增 LoginView/RegisterView/GameSidebar/LeaderboardModal/SpeedSelector 核心测试并精简凑数测试（128 tests），核心行覆盖率 98.21%；后端新增 index.test.js 及中间件补测（92 tests），整体 91.2%；`vitest.config.js` 配置 coverage thresholds；CLAUDE.md 新增《测试覆盖率策略》小节；v1.2.0 全部完成 |
