# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

YlTt2025 是一个个人影像档案全栈应用:公开展示摄影(photography)、视频(videos)、故事(stories)三类归档内容,配独立管理后台。技术栈:Next.js 16 App Router + React 19 + TypeScript(strict)、Tailwind CSS v4、Supabase(Auth + RLS/RBAC)、阿里云 OSS 直传媒体、Vercel 托管(域名与媒体 CDN 由 Cloudflare 代理,详见 [docs/deployment/cloudflare.md](docs/deployment/cloudflare.md))。

**注意:这是 Next.js 16**,与训练数据中的约定有 breaking changes。根目录 AGENTS.md 是 `next dev` 自动生成维护的(next 16 新增);写 Next API/约定相关代码前,先查 `node_modules/next/dist/docs/` 对应指南。已确认的差异:`middleware.ts` 已被 [proxy.ts](proxy.ts) 取代。

## 常用命令

```bash
npm run dev        # 开发服务器(需 .env.local,模板见 .env.example)
npm run build      # 生产构建
npm run start      # 生产运行
npm run typecheck  # tsc --noEmit(项目唯一的静态检查;无 lint/eslint 脚本)
npx vitest run                 # 运行全部测试
npx vitest                       # watch 模式
npx vitest run features/media/domain/upload-policy.test.ts   # 单个测试文件
```

- 测试与实现同目录存放(`*.test.ts(x)`),共 6 个文件 15 个用例;无 vitest 配置,`@/*` 路径别名自动从 tsconfig 解析,直接 `npx vitest run` 即可。
- 部分"组件测试"只做静态源文件断言或 `renderToStaticMarkup`(无 jsdom),遵循既有写法即可。

## 架构约定

### 分层(核心约定:禁止跨界)

`features/<feature>/` 内按职责分四层,所有 feature 遵守同构:

- **domain/** — 纯业务规则与 zod schema,零 I/O、零 React,**自带 vitest 测试**。例:`media/domain/upload-policy.ts`(上传校验与 object key 生成)、`admin/domain/role-policy.ts`(角色变更规则)、`content/domain/location-privacy.ts`(地点隐私投影)、`content/domain/public-media-content.ts`(DB 行 → 公开域对象的纯映射)。
- **server/** — `"use server"` Server Actions(供表单/`useActionState`)与 RSC 直接调用的服务函数;顶部 `import "server-only"`。**每个 mutation 入口的第一件事是重新鉴权**(`requireAdministrator()` / `requireCurrentProfile()`,见 [auth-service.ts](features/auth/server/auth-service.ts)),不要相信调用方。
- **components/** — 客户端组件(`"use client"`),props 接收 server 层已映射好的 camelCase 域对象,直接渲染。
- **client/** — 浏览器专用 helper(EXIF/视频元数据读取等,仅 client 引用)。

snake_case DB 行 → camelCase 域对象的转换发生在 server 层,映射纯函数放在 domain(如 `toPublicVideo`);组件永远不见原始行。

### 目录导览

- [features/](features/) — 每个 feature 是垂直切片。公开内容展示按类型分成 `photography`/`stories`/`videos`,与路由 `/photography`、`/stories`、`/videos` 一一对应(archive/detail 展示组件 + 各自的 markdown/gallery);`content` 只存放内容数据模型与读写服务(不再放组件);`media` 是跨类型共享的媒体基础设施(上传策略/URL/OSS 签名/浏览器读取器)与播放组件;`admin`/`auth`/`comments`/`profile`/`home`/`site` 各归其位。新增页面组件先归入对应 kind 的 feature,再考虑放 `media`;展示组件只消费 `content` 的 domain/server 产物,不直接写查询。
- [app/](app/) — 路由:公开页在 `(site)` 路由组(布局含 SiteHeader + CurrentUserProvider);`admin` 布局在 [app/admin/layout.tsx](app/admin/layout.tsx) 用 `requireAdministrator()` 整组拦截(未登录 → `/login?next=/admin`,非管理员 → `/`);`login`/`register` 认证页;`auth/callback` OAuth/邮件回跳;`api/*` 为签名与 geocode 路由处理器。页面本身是瘦壳:server component 调 `features/*/server` 服务取数后渲染客户端组件。
- [components/ui/](components/ui/) — shadcn(base-nova 风格,基于 `@base-ui/react`)生成的原语;样式一律用语义 token(Tailwind v4 CSS-first,主题变量在 [app/globals.css](app/globals.css),无 tailwind.config)。
- [lib/](lib/) — `env.ts` 用 zod 校验环境变量(生产缺 `SITE_URL` 会抛错;`getTrustedAppOrigin()` 解析可信源);`supabase/{server,browser,proxy}.ts` 客户端工厂。
- [supabase/migrations/](supabase/migrations/) — 数据库单一权威,时间戳命名(从 `20260820101350_initial_content_platform.sql` 起),全部 schema/RLS/函数在此演进。
- [docs/](docs/) — 部署与设计/计划文档(中文)。

### Supabase 会话与授权模型

- 会话 cookie 刷新走 [proxy.ts](proxy.ts)(matcher 排除静态资源);Server Component 内 `createServerSupabaseClient()` 的 cookie 写入被静默吞掉(注释说明由 proxy 负责),别改成抛错。
- 服务端取当前用户:`getCurrentProfile()` 用 react `cache()` 包裹(同一请求内只查一次)。
- 授权**真正落在 DB RLS**:表策略 + `private.` schema 的 SECURITY DEFINER helper(`is_admin()`, `can_read_content()` 等,公共面仅暴露已发布内容)。应用的鉴权只是 UX 层。
- `profiles.role` 禁止直改(触发器 `profiles_protect_role` 拦截)→ 角色变更必须走 SECURITY DEFINER RPC `admin_change_user_role`(内含"最后管理员不可移除"+ 审计写 `role_audit_logs`);TS 侧 [role-policy.ts](features/admin/domain/role-policy.ts) `validateRoleChange` 是同一规则的镜像预检。公开他人资料经 `get_public_profiles` RPC 投影,隐私列由 `profiles.public_*` 布尔开关控制。
- 注册经 `handle_new_user` 触发器自动创建 `profiles` 行(role = 'user')。

### 内容数据模型

- [content_items](supabase/migrations/20260820101350_initial_content_platform.sql) 单一表承载三类内容:`kind` photo|video|story + slug/title/excerpt/markdown_body/cover_object_key/`is_featured`/`published_at`(空 = 草稿,公开查询仅放行已发布)/`occurred_at`(拍摄日期)/`location_*` 六列。
- 详情:`photo_details`、`video_details`(一对一,`content_id` 主键、随 content 级联删,带 kind 一致性触发器)、`story_images`(配图 + `sort_order`);`series` + `content_series` 组系列;`comments`(body ≤2000,`status` visible|hidden 作审核隐藏)。
- 地点隐私 `location_visibility`:precise | city | hidden → 公开面用 `toPublicLocation()` 投影(precise 才含精确坐标,hidden 输出 null),任何展示层不得绕过。
- 改造公共读取模型前先读 [public-media-content-service.ts](features/content/server/public-media-content-service.ts) 与同目录 domain 映射,它是摄影/视频/故事归档页的唯一取数入口;首页走 [featured-content-service.ts](features/content/server/featured-content-service.ts)(is_featured + 最近发布)。

### 媒体管线(阿里云 OSS 直传)

1. 客户端本地校验 → `POST /api/admin/media/upload-signature`(先 `requireAdministrator()`,401/403 中文错误)。
2. 服务端签发 5 分钟签名 PUT URL:object key 形如 `photos|videos|stories/<YYYY>/<MM>/<uuid>-<stem>.<ext>`,头像为 `avatars/<profileId>/...` 且用 **POST policy fields** 而非 PUT(见 [oss-service.ts](features/media/server/oss-service.ts))。
3. 浏览器直传 OSS,成功后把返回的 key + 浏览器读到的 EXIF(照片,exifr)/时长尺寸(视频)通过 Server Action 落库;删除由服务端 `deleteOssObject()` 执行。上传/删 key 边界规则集中在 [upload-policy.ts](features/media/domain/upload-policy.ts)(照片 ≤200MB、视频 ≤2GB、头像 ≤5MB,仅 JPEG/PNG/WebP/MP4),头像 key 所有权另有 `parseOwnedAvatarObjectKey` 校验。
4. 公开读取 URL 由 [public-media-url.ts](features/media/domain/public-media-url.ts) 组装:`MEDIA_CDN_BASE_URL`(Cloudflare CDN)优先于 `OSS_PUBLIC_BASE_URL`;缩略图靠 OSS `x-oss-process` query 参数,拼接时**必须保留 query string**。ali-oss 已在 `next.config.ts` 的 `serverExternalPackages`。

### 后台(/admin)

模块:内容(三类共用的新建/编辑表单 + 故事 markdown 编辑器 + 配图上传)、用户角色、评论审核、审计日志。Server Action 错误消息全部为中文,统一 `{ error?: string; success?: string }` 状态经 `useActionState` 回显。

## 其他约定

- UI 文案、action/DB 错误提示均为中文。
- 故事正文渲染:`react-markdown` + `remark-gfm` + `rehype-sanitize`(purify 后输出)+ typeset 排版类,与编辑器(`@uiw/react-md-editor`)存储原始 markdown。
- GSAP 动效只出现在客户端组件,统一经 `gsap.matchMedia` 的 `prefers-reduced-motion` 门控。
- 提交信息与文档用中文(见 git log 惯例)。
- 涉及媒体/认证/RBAC 的改动,对照 [docs/superpowers/](docs/superpowers/) 中已有的设计文档与既有测试再动手;新增 domain 规则必须配 colocated 测试。
