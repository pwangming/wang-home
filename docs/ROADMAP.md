# Kinetic Arcade 版本规划

> 最后更新: 2026-04-10
> 当前版本: v1.0.0 (已打 tag)

## 版本总览

```
v1.0.0  当前状态，打 tag 作为基线
  │
  ├─ v1.0.1  核心 Bug 修复（认证 + 测试）
  ├─ v1.0.2  体验 Bug 修复（心跳 + 反馈）
  │
  ├─ v1.1.0  小功能更新（游戏体验）
  ├─ v1.1.1  小功能更新（账户管理）
  │
  └─ v1.2.0  技术改善（测试 + 重构 + CI）
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

**状态**: 🔴 未开始

### FEAT-001: 个人最高分展示
- **说明**: GameSidebar 显示当前登录用户的历史最高分
- **涉及**: 后端新增 API、前端 sidebar 组件
- **验收条件**:
  - [ ] 已登录用户在 sidebar 看到「我的最高分: XXX」
  - [ ] 未登录用户不显示最高分区域
  - [ ] 新游戏打破最高分后，sidebar 实时更新数值
  - [ ] 后端 `GET /api/leaderboard/rank/me` 返回最高分数据
  - [ ] 对应单元测试通过

### FEAT-002: 排行榜当前用户高亮
- **说明**: LeaderboardModal 中高亮当前用户所在行
- **涉及**: `client/src/components/game/LeaderboardModal.vue`
- **验收条件**:
  - [ ] 打开排行榜弹窗后，当前登录用户所在行有明显视觉区分（背景色/边框）
  - [ ] 未登录时不高亮任何行
  - [ ] 用户不在当前页时无高亮（不误标其他用户）

### FEAT-003: 游戏暂停功能
- **说明**: 按空格键或 P 键暂停游戏，显示暂停遮罩
- **涉及**: `client/src/components/game/SnakeGame.vue`, `GameView.vue`
- **验收条件**:
  - [ ] 游戏中按 P 键暂停，画面冻结并显示半透明遮罩「已暂停」
  - [ ] 再次按 P 键恢复游戏，蛇继续移动
  - [ ] 暂停期间不计时、不计分、蛇不移动
  - [ ] 空格键不触发暂停（避免与方向键冲突，如果空格有其他用途则跳过）
  - [ ] 暂停状态下切换标签页再回来仍保持暂停

### FEAT-004: 记住速度偏好
- **说明**: 用 localStorage 记住上次选择的速度倍率
- **涉及**: `client/src/views/GameView.vue`
- **验收条件**:
  - [ ] 选择 1.5x 速度开始游戏，刷新页面后速度选择器默认值为 1.5x
  - [ ] 清除 localStorage 后恢复默认值 1.0x
  - [ ] localStorage 中存储的值被篡改为无效值时，回退到 1.0x

---

## v1.1.1 — 账户管理更新

**状态**: 🔴 未开始

### FEAT-005: 密码找回
- **说明**: 接入 Supabase `resetPasswordForEmail` 流程
- **涉及**: 新增 ResetPasswordView、后端 reset 路由
- **验收条件**:
  - [ ] 登录页面有「忘记密码?」链接，点击进入密码重置页
  - [ ] 输入注册邮箱后提交，收到 Supabase 密码重置邮件
  - [ ] 点击邮件中的重置链接，跳转到设置新密码页面
  - [ ] 输入新密码后提交成功，提示「密码已重置，请重新登录」
  - [ ] 使用新密码可以正常登录
  - [ ] 输入未注册的邮箱时，不泄露该邮箱是否存在（统一提示「如果该邮箱已注册，您将收到重置邮件」）

### FEAT-006: 用户名修改
- **说明**: 登录后可修改用户名（设置面板或弹窗）
- **涉及**: 后端新增 profile update API、前端设置组件
- **验收条件**:
  - [ ] 已登录用户可通过顶部导航进入设置/个人信息
  - [ ] 可修改用户名，提交后顶部导航和排行榜实时更新
  - [ ] 用户名格式校验：只允许字母、数字、下划线，长度 2-20
  - [ ] 用户名唯一性校验：已被占用时提示「该用户名已被使用」
  - [ ] 后端 `PATCH /api/auth/profile` 更新 profiles 表
  - [ ] 对应单元测试通过

---

## v1.2.0 — 技术改善

**状态**: 🔴 未开始

### TECH-001: 测试覆盖率提升
- **目标**: 前后端测试覆盖率 >= 80%
- **当前**: 前端 16 tests (2 files)，后端 37 passed (6 files)
- **计划**: 补充 SnakeGame、GameView 组件测试；添加 E2E 测试覆盖核心流程
- **验收条件**:
  - [ ] `npm run test:client -- --coverage` 报告 >= 80% 行覆盖率
  - [ ] `npm run test:server -- --coverage` 报告 >= 80% 行覆盖率
  - [ ] E2E 测试覆盖：注册 → 登录 → 游戏 → 分数提交 → 排行榜 核心流程
  - [ ] E2E 测试覆盖：token 过期后自动刷新场景
  - [ ] CI 中测试全部通过

### TECH-002: GameView.vue 拆分
- **现状**: 571 行，职责过多（游戏控制、分数提交、弹窗管理、键盘事件）
- **计划**: 提取 `useGameSession` composable、提取分数提交逻辑、提取键盘快捷键处理
- **验收条件**:
  - [ ] GameView.vue 不超过 300 行
  - [ ] 提取至少 2 个 composable（游戏会话管理、分数提交）
  - [ ] 拆分后所有现有测试仍通过
  - [ ] 页面功能无回归（手动验证或 E2E）

### TECH-003: 全局错误处理
- **现状**: 各组件各自 try-catch，错误提示不统一
- **计划**: API client 添加全局错误拦截，统一 toast 提示机制
- **验收条件**:
  - [ ] 所有 API 错误通过统一的错误处理器处理
  - [ ] 网络错误显示「网络连接失败，请检查网络」
  - [ ] 服务器 500 错误显示「服务器异常，请稍后重试」
  - [ ] 业务错误（400/401/403/409）显示后端返回的具体 error 信息
  - [ ] 不再有未捕获的 Promise rejection

### TECH-004: CI/CD 流水线
- **计划**: GitHub Actions 运行 lint + test + build，PR 时自动检查
- **验收条件**:
  - [ ] `.github/workflows/ci.yml` 文件存在且语法正确
  - [ ] PR 到 develop/main 时自动触发 CI
  - [ ] CI 步骤包含：install → lint → test:client → test:server → build
  - [ ] CI 失败时阻止 PR 合并（branch protection rule）
  - [ ] CI 通过时在 PR 显示绿色 check

---

## 变更日志

| 日期 | 变更内容 |
|------|----------|
| 2026-04-09 | 初始版本规划创建 |
| 2026-04-09 | v1.0.0 tag 已打；BUG-001/002/003/004 修复完成 |
| 2026-04-09 | BUG-005/006 修复完成，v1.0.1 + v1.0.2 全部完成 |
| 2026-04-10 | 全部条目补充验收条件（含已完成项追溯 + 未完成项前置定义） |
