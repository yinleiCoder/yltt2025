# YlTt2025 认证、个人资料与后台界面实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 YlTt2025 完成全中文认证体验、头像用户菜单、可配置公开资料、评论作者 Dialog 和 shadcn 风格后台，并用 Supabase MCP 验证资料权限。

**Architecture:** 在现有 App Router、Server Action 和 Supabase 数据访问层上增加 profile 领域模块。完整资料只由本人/管理员服务读取，评论通过固定列的公开资料函数得到最小安全投影。前台采用暖色编辑杂志风，后台采用独立的中性 Dashboard shell。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript、Tailwind CSS 4、现有 shadcn base-nova、Supabase SSR、Zod、OSS signed upload、GSAP 与新增的 `@gsap/react`。

---

### Task 1: 隔离工作区与基线

**Files:** `package.json`、`package-lock.json`（仅新增动画依赖）。

- [ ] 检查 `git rev-parse --git-dir`、`git rev-parse --git-common-dir` 和当前分支；若不是 linked worktree，询问是否创建 `.worktrees/profile-auth-admin-ui` 与 `codex/profile-auth-admin-ui` 分支，不覆盖现有未提交文件。
- [ ] 运行 `npm install`、`npm test`、`npm run typecheck`，记录基线失败，避免把既有问题归因于本功能。
- [ ] 安装声明的 React GSAP 集成依赖并确认 lockfile 更新：`npm install @gsap/react`；之后运行 `npm run typecheck`，确保依赖可被 Next.js 16 正确解析。

### Task 2: Profile 数据契约与安全公开投影

**Files:**
- Create: `supabase/migrations/20260821120000_add_profile_details_and_public_projection.sql`
- Create: `features/profile/domain/profile-schema.ts`
- Create: `features/profile/domain/profile-schema.test.ts`
- Create: `features/profile/domain/public-profile.ts`
- Create: `features/profile/domain/public-profile.test.ts`
- Create: `features/profile/server/profile-service.ts`
- Modify: `features/auth/server/auth-service.ts`

- [ ] 先写失败测试：昵称、真实姓名、手机号、住址、性别的 Zod 校验；`projectPublicProfile` 只返回开启且非空字段。运行 `npx vitest run features/profile/domain/profile-schema.test.ts features/profile/domain/public-profile.test.ts`，确认因模块不存在而失败。
- [ ] 实现 `parseProfileDraft`：昵称 1-80、真实姓名 1-80、手机号 1-32、住址 1-240；性别仅 `male | female | other | unknown`。
- [ ] 新增 migration：四个资料列、四个 `public_*` 默认 false 列和数据库约束；新增 `public.get_public_profiles(requested_profile_ids uuid[])` security-definer 函数，固定返回公开投影、`set search_path = ''`，只授予 `anon, authenticated` 执行权限。
- [ ] 实现完整资料读取和批量公开资料读取；扩展 `CurrentProfile` 的 `avatarUrl`，不要把角色、时间戳等无关列传给客户端。
- [ ] 运行上述 Vitest 和 `npm run typecheck`，确认通过。
- [ ] 通过已认证 Supabase MCP 检查远程 schema、应用迁移、函数 grants，并以关闭手机号的资料验证公开查询绝不返回手机号。

### Task 3: Profile 更新 Action 与头像上传

**Files:**
- Create: `features/profile/server/actions.ts`
- Create: `features/profile/server/actions.test.ts`
- Create: `app/api/profile/avatar/upload-signature/route.ts`
- Modify: `features/media/domain/upload-policy.ts`
- Modify: `features/media/server/oss-service.ts`

- [ ] 先写失败测试：未登录或错误字段拒绝更新；更新只能使用当前用户 ID；头像接口拒绝未登录、非图片和超过 5 MB 文件。
- [ ] 实现 `updateProfileAction`：`requireCurrentProfile`、Zod 解析、按当前 ID 更新、`revalidatePath('/profile')` 和公共布局；只返回中文成功/错误状态。
- [ ] 实现头像签名 Route：当前用户授权、JPEG/PNG/WebP、5 MB、`avatars/{year}/{month}` object key；响应只含 `uploadUrl/objectKey/expiresAt`，不接受客户端 profile ID。
- [ ] 运行 `npx vitest run features/profile/server/actions.test.ts features/media/domain/upload-policy.test.ts`。

### Task 4: 评论作者公开资料与 Dialog

**Files:**
- Modify: `features/comments/server/comment-service.ts`
- Modify: `features/comments/components/comments-section.tsx`
- Create: `features/profile/components/public-profile-dialog.tsx`
- Create: `features/profile/components/profile-avatar.tsx`
- Add current shadcn sources if absent: `components/ui/avatar.tsx`, `components/ui/dropdown-menu.tsx`, `components/ui/field.tsx`

- [ ] 先写服务测试：多个作者批量合并，关闭字段不出现在结果，结果不包含 role 或资料时间戳。
- [ ] 让 `listPublicComments` 收集唯一作者 ID，调用一次 `listPublicProfiles`，用 Map 合并，保留评论排序。
- [ ] 使用 shadcn Avatar、Dialog、DialogTrigger、DialogContent 和无障碍标题；只渲染公开非空字段，头像按钮带 `查看某某的公开资料` 标签。
- [ ] 评论行显示头像、昵称、正文、时间；将英文 `Publishing` 改为 `发布中...`。
- [ ] 运行 `npx vitest run features/comments features/profile/domain` 与 `npm run typecheck`。

### Task 5: 受保护的个人中心

**Files:**
- Create: `app/profile/page.tsx`
- Create: `features/profile/components/profile-form.tsx`
- Create: `features/profile/components/profile-motion.tsx`

- [ ] 先写路由/组件失败测试：未登录跳转 `/login?next=/profile`，Dialog/form 不接收 role 等额外字段。
- [ ] Server Component 使用 `requireCurrentProfile` 和完整资料服务；客户端只接收表单所需字段。
- [ ] 使用 FieldGroup/Field、Input、Textarea、Select、Switch、Button、Avatar、Sonner，支持头像预览、上传、字段级错误、保存中状态和公开开关。
- [ ] 用 `useGSAP` + scoped ref + `gsap.matchMedia` 做 opacity/transform 进入动画并尊重 reduced motion。
- [ ] 用测试账号手动验证每个字段、有效/无效头像上传、刷新持久化和第二个账号查看公开字段。

### Task 6: 导航头像菜单与中文认证页

**Files:**
- Create: `features/auth/components/profile-menu.tsx`
- Modify: `features/auth/components/public-auth-controls.tsx`
- Modify: `features/auth/components/login-form.tsx`
- Modify: `features/auth/components/register-form.tsx`
- Modify: `app/login/page.tsx`
- Modify: `app/register/page.tsx`
- Modify: `features/auth/domain/auth-feedback.ts` and its test
- Modify: `features/photography/components/photography-header.tsx`, `features/home/components/archive-home.tsx`

- [ ] 先扩展认证错误测试，覆盖无效邮箱、错误密码、未确认邮箱、重复邮箱、频率限制和 GitHub 错误，断言不出现英文 fallback。
- [ ] 实现 Avatar + DropdownMenu：个人中心、管理员后台（按 role）、退出登录表单，使用 data-icon 和可访问标签。
- [ ] 登录/注册改为暖色品牌侧 + 表单侧响应式布局，所有标题、标签、占位符、错误、状态、链接改简体中文，保留 next 和现有 Server Actions。
- [ ] 用 `useGSAP` timeline 做轻量 opacity/transform 动画，不改变布局尺寸。
- [ ] 运行 `npx vitest run features/auth`、`npm run typecheck`，检查首页及摄影/短片/故事页共用菜单且无英文退出按钮。

### Task 7: shadcn 风格后台

**Files:**
- Modify: `features/admin/components/admin-shell.tsx`
- Modify: `app/admin/page.tsx`, `app/admin/users/page.tsx`, `app/admin/comments/page.tsx`, `app/admin/audit/page.tsx`
- Modify: `features/admin/server/admin-management-service.ts`, `features/admin/server/admin-service.ts`

- [ ] 先写管理员服务测试：用户映射头像、昵称、角色、注册时间、公开字段开关；评论映射头像、昵称和内容 ID且只允许管理员。
- [ ] 用桌面侧边栏 + 移动 Sheet；中文导航为概览、内容管理、用户管理、评论审核、审计日志。
- [ ] 用 Card、Badge、Table、Separator、Button 组合概览指标、最近内容、用户和评论表格；显示作者头像昵称和公开状态，保留现有服务端角色/状态校验。
- [ ] 运行 `npx vitest run features/admin features/comments` 与 `npm run typecheck`。

### Task 8: 全局视觉与响应式

**Files:** `app/globals.css`、`app/layout.tsx` 及 Tasks 5-7 的相关组件。

- [ ] 在现有 token 系统增加暖白、墨黑、陶土红、鼠尾草绿、边框和 focus ring 语义变量；保留可用的暗色 token。
- [ ] 为头像、表格列、表单控件、侧边栏和 Dialog 设置稳定尺寸；使用 gap、size、语义 token，避免负字距和卡片嵌套。
- [ ] 运行 `npm run typecheck`、`npm test`，搜索改动文件中的可见英文 UI 文案并替换为中文。

### Task 9: 完整验证与交付

**Files:** 无，除非验收发现缺陷。

- [ ] 运行 `npm test`、`npm run typecheck`、`npm run build`，三个命令都必须退出码 0。
- [ ] 运行 `npm run dev`，在桌面和移动 viewport 验证登录、注册、菜单、个人中心、头像上传、隐私 Dialog、后台用户/评论操作和退出。
- [ ] 覆盖未登录、普通用户、管理员三种状态；记录 Supabase/OAuth 环境限制，不把环境限制误报为代码通过。
- [ ] 运行 `git status --short` 和 `git diff --stat`，确认原有无关变更未被回退且每个改动文件都在计划内。
- [ ] 仅提交实现文件：`git add app components features lib supabase && git commit -m "feat: add profile privacy and Chinese admin UI"`。
