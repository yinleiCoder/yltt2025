# YlTt2025 认证、个人资料与后台界面设计

## 目标

统一登录、注册、公共导航和后台管理的中文体验，采用暖色编辑杂志风改造前台；为登录用户增加头像下拉菜单和个人中心；让评论只显示最小公开身份信息，并允许访客点击头像查看评论者主动公开的资料。

## 已确认的产品决策

- 前台使用方案 C：暖色编辑杂志风，纸张暖白、墨黑、陶土红和低饱和鼠尾草绿。
- 后台使用中性 shadcn Dashboard 风格，与前台内容气质区分。
- 所有登录、注册、个人中心、后台和评论相关文案使用简体中文，不做国际化层。
- 评论行只显示头像、昵称、正文和时间。
- 点击评论头像打开 Dialog，展示该评论者主动设置为公开的资料。
- 用户可以配置性别、真实姓名、手机号和住址是否公开。
- 头像与昵称作为评论归属的最小公开标识，默认用于评论展示。
- 管理员和资料本人可以查看完整资料。
- Server Action 和数据访问函数必须自行完成身份、角色和资源归属检查。

## 数据模型与权限

现有 `public.profiles` 保留 `id`、`display_name`、`avatar_url`、`role`、时间戳，并增加：

- `real_name text`，长度限制 1-80，可为空。
- `phone text`，长度限制 1-32，可为空。
- `address text`，长度限制 1-240，可为空。
- `gender text`，值限制为 `male`、`female`、`other`、`unknown`，可为空。
- `public_gender boolean not null default false`。
- `public_real_name boolean not null default false`。
- `public_phone boolean not null default false`。
- `public_address boolean not null default false`。

普通用户和管理员读取完整 `profiles` 行时继续遵循现有 RLS。公开资料不通过前端查询完整表，而通过 Supabase 数据访问函数返回固定列：

```text
id
avatar_url
display_name
gender（仅 public_gender = true）
real_name（仅 public_real_name = true）
phone（仅 public_phone = true）
address（仅 public_address = true）
```

该函数接受作者 ID 列表并只返回公开投影，避免浏览器先拿到私密字段再隐藏。函数使用固定查询列、受限 `search_path` 和明确的执行权限。迁移后通过 Supabase MCP 检查函数权限和公开调用结果。

头像沿用现有 OSS 签名方案，新增登录用户头像签名接口。仅允许当前登录用户申请上传，接受 JPEG、PNG、WebP，最大 5 MB；上传完成后才更新 `avatar_url`。

## 路由与组件

### 导航与用户菜单

`PublicAuthControls` 继续由服务端读取当前用户，并把资料传入客户端 `ProfileMenu`。登录状态显示 `Avatar` 和 `DropdownMenu`：

- 个人中心：`/profile`
- 管理后台：`/admin`，仅管理员
- 退出登录：现有 `signOutAction`

头像加载失败时使用昵称首字作为 `AvatarFallback`。未登录时显示“登录”和“注册”。

### 个人中心

新增 `app/profile/page.tsx` 和个人资料组件。页面要求当前用户登录，包含：

- 头像上传与预览。
- 用户昵称、真实姓名、手机号、住址、性别。
- “公开资料”开关区域，说明评论区只显示头像和昵称，点击头像可查看开启的字段。
- 保存按钮、提交中状态、字段级错误和成功 Toast。

资料更新由 `features/profile/server/actions.ts` 处理，使用 Zod 解析 FormData，重新验证当前用户，并只更新当前用户 ID 对应的行。

### 评论资料浮窗

扩展 `PublicComment`，加入安全的作者公开资料对象。`CommentsSection` 使用 `Avatar` 作为 Dialog trigger，`DialogContent` 包含必需的无障碍标题和公开字段；未公开或为空的字段不渲染。评论服务通过公开资料函数批量合并作者资料，避免每条评论产生独立请求。

### 登录与注册

保留现有 Server Action 和 GitHub 登录流程，重做 `app/login/page.tsx`、`app/register/page.tsx` 与表单组件：

- 暖色品牌侧区域 + 表单侧区域，移动端单列。
- 使用中文标题、标签、占位符、错误和提交状态。
- 通过 `FieldGroup`、`Field`、`Input`、`Alert` 和 `Button` 组合表单。
- 认证错误由领域层统一映射为中文提示。

### 后台

重做 `AdminShell` 和后台页面：

- 桌面端侧边栏，移动端使用 `Sheet`。
- 中文导航：概览、内容管理、用户管理、评论审核、审计日志。
- 概览显示指标卡、最近内容表格和状态 Badge。
- 用户表格显示头像、昵称、角色、注册时间和公开资料状态。
- 评论审核表格显示作者头像、昵称、正文、内容标题、状态和操作。

后台页面继续调用现有管理员服务，所有管理员操作保留服务端角色检查。

## 视觉与动画

- 前台基色：暖白纸张背景、墨黑文字、陶土红强调色、鼠尾草绿辅助色。
- 标题使用编辑感衬线字体，正文和控件使用系统中文无衬线字体。
- 卡片圆角保持不超过现有设计系统要求，避免卡片嵌套卡片。
- 认证和个人中心首次进入使用 GSAP timeline 做轻量 opacity/transform 动画。
- React 动画使用 `useGSAP` 清理上下文，用 `gsap.matchMedia()` 尊重 `prefers-reduced-motion`。
- 不在后台表格和评论列表使用持续动画或 ScrollTrigger。

## 错误处理与缓存

- 未登录访问个人中心跳转 `/login?next=/profile`。
- 非管理员访问后台跳转首页。
- 资料和上传错误显示中文、可操作的提示，不泄露 SQL 或内部异常。
- 公开资料缺失时 Dialog 显示“该用户暂未公开更多资料”。
- 资料更新后重新验证个人中心、根布局导航和评论相关页面，保证昵称与头像及时同步。
- Server Action 不信任客户端传入的用户 ID、角色或完整资料对象。

## 测试与验收

### 单元与服务测试

- 性别枚举、资料字段长度和手机号格式校验。
- 公开投影不会返回关闭的字段。
- 普通用户只能更新自己的资料，管理员可以查看完整资料。
- 评论查询正确批量合并公开作者资料。
- 默认头像和昵称回退稳定。

### 组件与浏览器验收

- 登录、注册、退出和 GitHub 登录流程保持可用且全中文。
- 登录后头像下拉菜单包含个人中心、管理员入口（仅管理员）和退出登录。
- 头像点击可打开资料 Dialog，未公开字段不渲染。
- 普通用户更新资料后，导航、个人中心和评论作者信息同步变化。
- 管理员可进入后台完成用户角色、评论状态和内容管理操作。
- 手机端认证、个人中心和后台侧边栏不横向溢出。
- `npm run typecheck`、`npm test`、`npm run build` 全部通过。

## 实施边界

本次只涉及认证页、注册页、公共导航、个人中心、评论作者资料浮窗、后台布局与相关 Supabase 资料字段及权限。不会引入完整国际化系统、社交关系、私信或新的内容类型。
