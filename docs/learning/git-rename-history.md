# Git 大规模目录迁移：保住 history 的 commit 拆分技巧 — 学习笔记

> 本文为个人学习笔记，**不是执行计划**。
> 起源：2026-05-07，monorepo Phase 1 讨论 D6（platform-refactor-vision）。
> 适用场景：`client/` `server/` → `apps/web/` `apps/api/` 这类**大量文件 + 路径引用同步修改**的迁移。

## 核心结论

**第一个 commit 必须是"纯 `git mv`"，不动任何文件内容。** 路径引用修复放后续 commit。否则 git 看不出 rename，history 断。

---

## 为什么 — git 没有 rename 操作

git 内部不存在"重命名"这个事实。`git mv a b` 实际等于：

```
git rm a
git add b
```

git 在你看 `git log --follow` / `git blame` 时，**临时**对比新增和删除文件的内容，**相似度 ≥ 50%** 就认为是 rename，否则就是"删一个 + 新增一个"。

意思是：**rename 不是存进 git 的事实，是 git 看历史时的猜测**。猜不出就丢历史。

## 失败模式

### 场景：合并 commit

```bash
git mv client/src/main.js apps/web/src/main.js
# 同时修改 import 路径
sed -i 's|from "client/|from "apps/web/|g' apps/web/src/main.js
git add -A
git commit -m "chore: migrate to monorepo"
```

git 比对时：
- 旧 `client/src/main.js`：100 行
- 新 `apps/web/src/main.js`：100 行 + 改了 60 行 import
- 相似度 = 40% < 50% 阈值 → **认为是 add+delete，不是 rename**
- `git log --follow apps/web/src/main.js` 只显示这一次新建，30 次历史**找不到**（实际还在 git 里，但没法用文件名追）

### 加剧因素

- 文件本身短（< 50 行）：少量改动就能跌破阈值
- 同 PR 改了几十个文件路径：每个文件独立判定，部分认 rename 部分不认，结果支离破碎
- 同时有 import 路径 + 配置路径 + 文档路径全改：相似度集体下降

## 正确做法 — commit 拆分

### 步骤 A：纯搬家 commit

```bash
git mv client apps/web
git mv server apps/api
git commit -m "chore: move client/server to apps/web apps/api"
```

特征：
- 文件内容 0 改动
- git 100% 认出 rename（相似度 = 100%）
- ⚠️ **代码此刻是坏的**：所有引用 `client/...` 的 config 都失效，build 失败
- history 在这一步已经救下来了

### 步骤 B：改地址 commit

```bash
# 改 vite.config.js / vercel.json / docs/*.md 里的 client/ → apps/web/
# 改 root package.json workspaces / pnpm-workspace.yaml
# 加 turbo.json
git commit -m "chore: update path references for monorepo migration"
```

特征：
- 在已 rename 的文件上改内容
- git 看到的是普通 edit，**无 rename 检测问题**（rename 已在 A 步定案）
- build 恢复

### 关键：A 和 B 不能合并

合并 = 同一 commit 既 rename 又改内容 → 相似度跌破 → history 断。

## 工作流落地

不用拆两个 PR。在迁移分支上**多个连续 commit**，最后整个分支合 base：

```
迁移分支
  commit 1: 纯 git mv（broken state）       ← 关键
  commit 2: 改路径引用 + 加 turbo + 改 pnpm（恢复）
  commit 3: 改 .npmrc / package.json name
  commit 4: 改文档路径
  ...
最终 PR：迁移分支 → develop（用 merge commit，不 squash）
```

**为什么 merge commit 不 squash**：squash 会把 commit 1 / 2 / ... 压成一个，rename + 改内容又混回同一 commit，**前面的努力全废**。

## 一次性本地 git 配置

```bash
git config diff.renames copies      # 同时检测复制（信息更全）
git config diff.renameLimit 999999  # 调高比对文件数上限（默认 1000，大目录会爆）
```

只在你本地生效，不写进 repo。CI / 其他人看不影响 — 因为前面已经把 history 救下来了，他们不需要这两个配置。

## 验证 history 是否保住

迁移合并后跑：

```bash
git log --follow apps/web/src/main.js
```

- 显示几十条历史 → 成功
- 只显示 1-2 条 → 第一个 commit 没拆干净，rename 检测失败了 → 需要在合并前 reset 重做

也可以验证 blame：

```bash
git blame apps/web/src/main.js
```

应能看到原作者 / 时间 / 原 commit hash，不是全部指向迁移 commit。

## 边界情况

### 文件本身要大改

如果迁移过程中**确实**要重写某个文件（比如 vite config 大改），不要试图在迁移 commit 里同时做。流程：

1. 迁移分支 commit 1：`git mv client apps/web`
2. 迁移分支 commit 2-N：路径引用修复
3. 迁移分支合入后，**另开一个 PR** 重写 vite config

把"搬家"和"重写"在时间线上分开。

### 同时 rename 目录 + rename 单个文件

可以，但分两个 commit：

```
commit 1: git mv client apps/web
commit 2: git mv apps/web/src/oldName.js apps/web/src/newName.js
```

不要在同一个 commit 既改目录名又改文件名 — git 大多数情况能认出，但不保证。

### Windows + Git for Windows 注意

- 大小写敏感问题：如果 rename 只是大小写变化（`Client/` → `client/`），需要 `git mv -f` 或两步 mv。本次 `client/` → `apps/web/` 不涉及。
- 路径长度：Windows 默认 260 字符限制；monorepo 嵌套深时可能撞，需 `git config core.longpaths true`。

## 适用范围 vs 不适用

**适用**：

- 大目录改名（`client/` → `apps/web/`）
- 项目结构重组（`src/components/` → `src/modules/<x>/components/`）
- 文件批量改前缀

**不适用 / 没必要**：

- 单文件改名又顺手改内容：直接一个 commit 即可，git 一般认得出（高相似度）
- 已经决定不要 history（如 fork 出独立项目）：直接重建即可

## 相关原理

- git rename 阈值由 `--find-renames=<n>` 控制，默认 50
- 调到 30 可救一些边界情况：`git log --find-renames=30 --follow <file>`
- 但不要靠调阈值兜底，源头拆 commit 才是正路

## 关联

- monorepo Phase 1 迁移子 plan（待创建）
- `AGENTS.md` 分支流程章节（commit 规范）
