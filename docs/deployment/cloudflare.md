# Cloudflare DNS 与 OSS CDN 配置

本项目继续使用 Vercel 托管 Next.js 应用。Cloudflare 管理生产域名的 DNS，并代理主站和媒体域名；阿里云 OSS 继续作为媒体源站和签名上传目标。

## 使用前替换占位符

以下值必须从 Vercel、阿里云 OSS 和 Cloudflare 控制台取得后再执行配置：

- `<root-domain>`：生产环境根域名。
- `<app-hostname>`：生产应用域名，通常是根域名或 `www`。
- `<media-hostname>`：媒体域名，例如 `media.<root-domain>`。
- `<vercel-target>`：Vercel 自定义域名页面显示的准确目标。
- `<oss-https-custom-domain-target>`：OSS HTTPS 自定义域名对应的准确 CNAME 目标。
- `<known-object-key>`：用于验证的已存在公共 OSS 对象 key。

不要将域名账号凭据、Cloudflare API Token、阿里云 AccessKey 或证书私钥提交到 Git。

## 配置边界

配置 `MEDIA_CDN_BASE_URL` 只会改变公开媒体读取地址：页面生成的照片和视频 URL 会使用 Cloudflare 媒体域名。管理员上传仍先请求 Next.js 的签名接口，再使用服务端签发的 OSS `PUT` URL 直传 OSS；上传链路、Supabase 凭据和 OSS AccessKey 不需要交给 Cloudflare。

## 源站准备

### Vercel 应用

1. 在现有 Vercel 项目中添加 `<app-hostname>`，以及实际使用的 `www` 别名。
2. 完成 Vercel 的域名验证和证书签发。
3. 先通过 Vercel 提供的域名确认应用可用，再开启 Cloudflare 代理。

### OSS 媒体域名

1. 在 OSS Bucket 上绑定 `<media-hostname>` 为 HTTPS 自定义域名。
2. 完成阿里云的域名所有权验证和证书配置。
3. 直接访问 `https://<media-hostname>/<known-object-key>`，确认对象可以通过 HTTPS 返回。
4. OSS 自定义域名必须是公开读取源站；不要把上传专用、私有或签名接口 endpoint 当作公开媒体源站。

CNAME 目标必须复制自对应控制台。不要猜测 OSS 区域 endpoint；不同区域、加速域名和自定义域名的目标可能不同。

## Cloudflare DNS

先将记录设置为 `DNS only`，完成源站验证后再逐条启用代理。保留现有的其他 DNS 记录。

| 名称 | 类型 | 目标 | 代理状态 | 用途 |
| --- | --- | --- | --- | --- |
| `@` | A 或 CNAME flattening | `<vercel-target>` | 源站验证后启用代理 | 根域名应用 |
| `www` | CNAME | `<vercel-target>` | 源站验证后启用代理 | 应用别名 |
| `media` | CNAME | `<oss-https-custom-domain-target>` | 启用代理 | 公开媒体 CDN |

推荐启用顺序：

1. 添加所有 DNS 记录，保持 `DNS only`。
2. 验证 Vercel 应用域名和 OSS 媒体域名的 HTTPS 源站访问。
3. 开启 `<media-hostname>` 的 Cloudflare 代理，先验证媒体访问和缓存。
4. 再开启应用域名的 Cloudflare 代理，验证登录、回调和管理后台。

如果 Vercel 或 OSS 控制台仍显示域名未验证，先暂时保持 `DNS only`，不要通过猜测 CNAME 目标解决验证问题。

## SSL/TLS 与安全设置

在 Cloudflare 中配置：

- SSL/TLS 加密模式：`Full (strict)`。
- Vercel 和 OSS 自定义域名都必须拥有有效的 HTTPS 证书。
- 两个源站均通过 HTTPS 验证后，再开启 `Always Use HTTPS`。
- 不在 Cloudflare 中配置 OSS AccessKey、签名 URL 密钥、Supabase service role key 或其他应用 Secret。
- 不对主站的 `/api/*`、`/auth/callback`、`/admin/*` 或带会话状态的请求设置公共缓存。

Cloudflare 只代理公开媒体的 `GET`/`HEAD` 读取。签名上传使用服务端返回的 OSS `PUT` URL，不应改成经过媒体 CDN 的上传请求。

## 媒体缓存规则

在 Cloudflare Cache Rules 中创建只匹配媒体域名的规则。可使用以下表达式作为匹配条件：

```text
(http.host eq "<media-hostname>" and http.request.method in {"GET" "HEAD"})
```

规则行为：

- Cache eligibility：`Eligible for cache`。
- Edge 和浏览器 TTL：对不可变 object key 使用较长 TTL。
- Cache key：保留完整 query string。
- 源站 `4xx`/`5xx`：不要按长 TTL 缓存错误响应。
- 不匹配 `PUT`、签名上传 URL、主站域名和 API 路由。

必须保留完整 query string，因为照片缩略图使用 `x-oss-process` 参数；丢弃 query string 会导致不同尺寸的图片共用错误缓存。若同一个 object key 被覆盖，需清理对应 URL 的 Cloudflare 缓存；当前上传流程生成唯一 object key，正常新增媒体不需要全局清理缓存。

## Vercel 生产环境变量

在 Vercel 项目的 Production 环境设置：

```text
SITE_URL=https://<app-hostname>
MEDIA_CDN_BASE_URL=https://<media-hostname>
OSS_PUBLIC_BASE_URL=https://<oss-origin-domain>
```

`SITE_URL` 必须与 Supabase Auth 中允许的生产回调源一致。GitHub OAuth 和邮箱确认都会使用
`https://<app-hostname>/auth/callback`，不要填写媒体域名或带路径的 URL。

`MEDIA_CDN_BASE_URL` 会优先于 `OSS_PUBLIC_BASE_URL`，因此确认 CDN 媒体域名可访问后再保存并重新部署。保留 `OSS_PUBLIC_BASE_URL` 作为回退地址，但不要把真实值写入 Git。

## 验证

将以下命令中的占位符替换为实际值，在 PowerShell 中执行：

```powershell
Resolve-DnsName <app-hostname>
Resolve-DnsName <media-hostname>
curl.exe -I https://<app-hostname>
curl.exe -sS -D - -o NUL https://<media-hostname>/<known-object-key>
curl.exe -sS -D - -o NUL https://<media-hostname>/<known-object-key>
```

验收标准：

- 应用和媒体域名解析到预期的 Cloudflare 记录，并返回有效 HTTPS 响应。
- 第二次媒体请求在响应头中出现 Cloudflare 缓存结果，例如 `CF-Cache-Status: HIT`。
- 带 `x-oss-process` 的图片 URL 仍返回正确尺寸和格式的图片。
- 登录、Supabase session refresh、`/auth/callback`、评论和 `/admin` 权限保护通过生产域名正常工作。
- 管理员可以取得 OSS 签名 `PUT` URL 并完成媒体上传。
- 在切换 CDN 前记录的原始 OSS URL 仍然可访问，便于回退。

Cloudflare 账号控制台和生产域名未提供给本地环境时，DNS、证书、缓存命中和真实上传只能按上述清单在上线环境验收。

## 回退

1. 在 Vercel Production 环境删除 `MEDIA_CDN_BASE_URL`，或将其恢复为原始 `OSS_PUBLIC_BASE_URL`。
2. 重新部署 Vercel 项目，使服务端渲染的媒体 URL 回到 OSS 源站。
3. 如果问题只是旧媒体缓存，清理受影响的媒体 URL，不要先做全局清理。
4. 在直连 OSS 和主站路径重新验证通过前，保留 Cloudflare DNS 记录。
