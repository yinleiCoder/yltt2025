# YlTt2025

YlTt2025 是一个 Next.js 16 全栈影像档案，公开展示摄影、短片和恋爱故事，并保留照片的 EXIF 与地点隐私等级。后台使用 Supabase Auth、RBAC、RLS 和阿里云 OSS。

## 开发

```bash
npm install
copy .env.example .env.local
npm run dev
```

打开 <http://localhost:3000>。

## 环境变量

复制 `.env.example` 到 `.env.local` 后填写：

| 变量 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key |
| `SITE_URL` | 应用的规范 HTTP(S) 源地址，用于 GitHub OAuth 和邮箱确认回调；生产环境必须使用 HTTPS |
| `OSS_REGION` | OSS 区域，例如 `oss-cn-hangzhou` |
| `OSS_BUCKET` | 媒体 Bucket 名称 |
| `OSS_ACCESS_KEY_ID` / `OSS_ACCESS_KEY_SECRET` | 服务端签名上传凭据 |
| `OSS_ENDPOINT` | 可选的 OSS endpoint |
| `OSS_PUBLIC_BASE_URL` | 公共媒体读取域名 |
| `MEDIA_CDN_BASE_URL` | 可选，配置后优先于 OSS 公共域名 |

真实凭据只能放在 `.env.local` 或部署平台的 Secret 中，不能提交到 Git。主账户 AccessKey 可以用于本地验证，但生产环境建议改为最小权限 RAM 子账户，并限制 Bucket、前缀和操作类型。

## Supabase

迁移文件位于 `supabase/migrations`，按时间顺序应用：

```text
20260820101350_initial_content_platform.sql
20260820192847_restrict_admin_role_rpc.sql
20260820231103_grant_rls_helper_execution.sql
20260821034638_tighten_public_grants.sql
20260821100000_fix_admin_role_rpc_current_role.sql
20260821120000_add_profile_details_and_public_projection.sql
20260822100000_add_profile_email_visibility.sql
```

首个管理员邮箱需要先加入 `admin_email_allowlist`，再注册并完成邮箱确认。管理员角色只能通过 `admin_change_user_role` RPC 调整，不能自我提权，也不能移除最后一位管理员。

## OSS

- Bucket 设为“公共读、私有写”，应用只保存 `objectKey`，上传通过服务端签名 URL 完成。
- CORS 允许开发域名 `http://localhost:3000` 的 `PUT`、`POST`、`GET`、`HEAD`，允许请求头 `Content-Type`，暴露 `ETag`。
- 公开读取域名填写 `OSS_PUBLIC_BASE_URL`；接入 Cloudflare 后只需切换 `MEDIA_CDN_BASE_URL`。
- 照片首页通过 OSS 图片处理输出 WebP/缩放 URL；视频只接受 H.264/AAC MP4。MOV、HEVC、ProRes 需先转码。

## Cloudflare

生产环境继续使用 Vercel 托管 Next.js；Cloudflare 负责 DNS、HTTPS 代理和媒体 CDN。完整的 DNS 记录、OSS 自定义域名、缓存规则、验证与回滚步骤见 [`docs/deployment/cloudflare.md`](docs/deployment/cloudflare.md)。

配置 Cloudflare 媒体域名后，将 `MEDIA_CDN_BASE_URL` 设置为 `https://<media-hostname>`；该变量优先于 `OSS_PUBLIC_BASE_URL`，上传签名链路不变。

## 路由

- `/`：精选接触表首页，GSAP `SplitText`/`ScrollTrigger` 动效
- `/photography`、`/photography/[slug]`：摄影列表与 EXIF 详情
- `/videos`、`/videos/[slug]`：短片列表与原生 MP4 播放器
- `/stories`、`/stories/[slug]`：安全 Markdown 故事正文
- `/admin`：管理员内容、用户角色、评论和审计入口

后台内容详情页支持编辑标题、slug、摘要、Markdown、地点隐私、发布状态和首页精选状态。照片/视频可以选择新文件替换；照片替换会在浏览器端重新读取 EXIF，保存成功后尝试清理旧 OSS 对象。删除内容会级联删除评论，并尝试清理关联媒体。

公开评论只读取 `visible` 记录；登录用户只能创建和维护自己的评论，管理员可隐藏或恢复评论。最终权限由 Supabase RLS 保障，页面服务层不替代 RLS。

## 验证

```bash
npm run test
npm run typecheck
npm run build
git diff --check
```

当前测试覆盖角色约束、内容映射、地点隐私、媒体 URL/上传策略、评论输入校验和公开媒体映射。浏览器验收应覆盖桌面/移动首页、公开列表与 404、管理员后台、评论权限、深色模式、减少动态效果和控制台错误。

## 交付前检查

1. 在 Supabase Auth 中启用邮箱确认和泄露密码保护，配置 `http://localhost:3000/auth/callback` 及生产回调地址。
2. 在 OSS 控制台设置 Bucket 为公共读、私有写，并将 `http://localhost:3000` 配置为允许 `PUT`、`POST`、`GET`、`HEAD` 的 CORS 来源。
3. 用管理员账号创建一条草稿，验证编辑、发布、撤回、精选切换和删除；不要直接使用唯一管理员或唯一生产媒体做破坏性测试。
4. 用普通账号和访客分别验证评论归属、隐藏评论和 `/admin` 路由保护。
5. 部署前复核 Supabase advisor：管理员角色 RPC 的 `SECURITY DEFINER` 是有意的受控入口，`admin_email_allowlist` 只应由受信任服务端维护。
