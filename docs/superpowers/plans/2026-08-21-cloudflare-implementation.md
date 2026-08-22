# Cloudflare DNS and OSS CDN Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an actionable Cloudflare DNS/SSL/OSS CDN runbook to the YlTt2025 repository and expose it from the existing deployment documentation without changing the Next.js runtime or upload flow.

**Architecture:** Keep the application on Vercel and place Cloudflare in front of the production application and a dedicated OSS media hostname. Cloudflare proxies HTTPS `GET`/`HEAD` media reads and caches image/video responses; server-issued OSS signed `PUT` uploads continue to use the existing direct-origin path. The application selects the media hostname through the already-supported `MEDIA_CDN_BASE_URL` environment variable.

**Tech Stack:** Next.js 16 App Router, Vercel, Cloudflare DNS/SSL/cache rules, Alibaba Cloud OSS, Markdown documentation, PowerShell verification commands.

---

## File Map

- Create: `docs/deployment/cloudflare.md` — production runbook for Cloudflare DNS, Vercel custom domains, OSS custom domains, SSL/TLS, media cache rules, environment variables, verification, and rollback.
- Modify: `README.md` — link the new runbook from the deployment/operations guidance and clarify that `MEDIA_CDN_BASE_URL` is the Cloudflare media hostname.
- Do not modify: `next.config.ts`, `features/media/server/oss-service.ts`, `app/api/admin/media/upload-signature/route.ts`, or `lib/env.ts`; the current implementation already separates signed uploads from public reads and prioritizes `MEDIA_CDN_BASE_URL`.

### Task 1: Add the Cloudflare production runbook

**Files:**
- Create: `docs/deployment/cloudflare.md`

- [ ] **Step 1: Create the runbook with the production prerequisites and scope**

Write a Markdown document that states:

```markdown
# Cloudflare DNS and OSS CDN Runbook

This project keeps the Next.js application on Vercel. Cloudflare manages the production DNS zone and proxies the public application and media hostnames. Alibaba Cloud OSS remains the media origin and the signed upload destination.

Replace these placeholders with values from the Vercel, Alibaba Cloud, and Cloudflare dashboards before applying records:

- `<root-domain>`: production apex domain
- `<app-hostname>`: production application hostname, normally the apex or `www`
- `<media-hostname>`: dedicated media hostname, for example `media.<root-domain>`
- `<vercel-target>`: exact Vercel target shown for the custom domain
- `<oss-https-custom-domain-target>`: exact HTTPS OSS custom-domain target
- `<known-object-key>`: an existing public OSS object key used for testing

Do not commit domain-specific credentials, API tokens, AccessKeys, or certificate private keys.
```

Include a short “What this changes” section that explicitly says `MEDIA_CDN_BASE_URL` changes public media reads only; the signed upload endpoint and direct OSS `PUT` request remain unchanged.

- [ ] **Step 2: Document Vercel and OSS origin prerequisites**

Add ordered checklists with these concrete requirements:

1. Add `<app-hostname>` and any `www` alias to the Vercel project and complete Vercel domain verification.
2. Confirm the application loads through its Vercel hostname before enabling Cloudflare proxying.
3. Add `<media-hostname>` as an HTTPS custom domain on the OSS bucket.
4. Complete Alibaba Cloud ownership verification and certificate setup.
5. Confirm `https://<media-hostname>/<known-object-key>` works directly against the OSS custom domain before the Cloudflare record is proxied.

State that the CNAME targets must be copied from the dashboards and that an OSS upload endpoint must not be used as a public media origin.

- [ ] **Step 3: Document the Cloudflare DNS records and safe activation order**

Add this table using the real placeholder names:

| Name | Type | Target | Proxy status | Purpose |
| --- | --- | --- | --- | --- |
| `@` | A or CNAME flattening | `<vercel-target>` | Proxied after verification | Apex application domain |
| `www` | CNAME | `<vercel-target>` | Proxied after verification | Application alias |
| `media` | CNAME | `<oss-https-custom-domain-target>` | Proxied | Public media CDN |

Document this activation order: create DNS records as DNS-only, verify each origin, enable Cloudflare proxy for the media hostname, verify media caching, then enable proxy for the application hostnames. Mention that existing unrelated records must be preserved.

- [ ] **Step 4: Document SSL/TLS and security settings**

Specify the following Cloudflare settings:

- SSL/TLS mode: `Full (strict)`.
- `Always Use HTTPS`: enabled only after Vercel and OSS custom-domain HTTPS checks pass.
- Valid certificates required at both origins.
- No OSS AccessKey, signed URL secret, or Supabase secret is entered into Cloudflare.
- No cache rule applies to `/api/*`, `/auth/callback`, `/admin/*`, signed upload URLs, or requests with session-sensitive behavior.

Explain that Cloudflare proxying is for public media `GET`/`HEAD` reads; uploads continue to use the existing server-issued OSS signed `PUT` URL.

- [ ] **Step 5: Document the media cache rule and query-string behavior**

Add a rule specification with the exact match and behavior:

```text
Hostname equals <media-hostname>
AND request method is GET or HEAD

Cache eligibility: eligible for cache
Edge/browser TTL: long TTL suitable for immutable object keys
Cache key: include the full query string
Origin errors: do not cache 4xx/5xx responses for a long TTL
```

Explain that the full query string is required for OSS image processing parameters such as `x-oss-process`. Explicitly exclude `PUT`, signed upload URLs, the application hostname, and API routes. State that replacing an object at the same key requires purging that URL, while the app’s generated unique object keys normally avoid a global purge.

- [ ] **Step 6: Document environment variables, verification, and rollback**

Include this production environment example:

```text
MEDIA_CDN_BASE_URL=https://<media-hostname>
OSS_PUBLIC_BASE_URL=https://<oss-origin-domain>
```

State that `MEDIA_CDN_BASE_URL` is configured in Vercel’s production environment, `OSS_PUBLIC_BASE_URL` remains the rollback fallback, and neither belongs in Git.

Add PowerShell checks that can be run after replacing placeholders:

```powershell
Resolve-DnsName <app-hostname>
Resolve-DnsName <media-hostname>
curl.exe -I https://<app-hostname>
curl.exe -I https://<media-hostname>/<known-object-key>
curl.exe -I https://<media-hostname>/<known-object-key>
```

Require the app and media requests to return valid HTTPS responses, and require the second media request to expose a Cloudflare cache result such as `HIT` once the object is warm. Add checks for an image URL with `x-oss-process`, login/session refresh, `/auth/callback`, comments, admin authorization, and an admin media upload.

Document rollback as: remove or reset `MEDIA_CDN_BASE_URL` to the original OSS public URL in Vercel, redeploy, purge only affected media URLs if stale cache is the issue, and keep the DNS records until direct-origin access is revalidated.

- [ ] **Step 7: Run documentation lint checks**

Run:

```powershell
git diff --check
rg -n "TODO|TBD|FIXME|AccessKey|SUPABASE_SERVICE_ROLE_KEY" docs/deployment/cloudflare.md
```

Expected result: `git diff --check` has no output; the search only finds the intentional sentence that says credentials must not be committed and contains no real secret values.

### Task 2: Link the runbook from the project documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a deployment link near the existing OSS/deployment guidance**

Add a short section after the OSS section:

```markdown
## Cloudflare

生产环境继续使用 Vercel 托管 Next.js；Cloudflare 负责 DNS、HTTPS 代理和媒体 CDN。完整的 DNS 记录、OSS 自定义域名、缓存规则、验证与回滚步骤见 [`docs/deployment/cloudflare.md`](docs/deployment/cloudflare.md)。

配置 Cloudflare 媒体域名后，将 `MEDIA_CDN_BASE_URL` 设置为 `https://<media-hostname>`；该变量优先于 `OSS_PUBLIC_BASE_URL`，上传签名链路不变。
```

- [ ] **Step 2: Verify the README wording against the existing environment table**

Keep the existing `MEDIA_CDN_BASE_URL` table row and make sure it says the variable is optional, takes the HTTPS public media hostname, and overrides `OSS_PUBLIC_BASE_URL`. Do not add a new environment variable or put a real domain in the README.

- [ ] **Step 3: Run repository checks**

Run:

```powershell
npm run test
npm run typecheck
npm run build
git diff --check
```

Expected result: tests, TypeScript checking, and the Next.js production build pass; `git diff --check` has no output. No browser or Cloudflare account check can be run without the production domain and credentials, so the runbook’s DNS and HTTPS commands remain the external acceptance checks.

### Task 3: Review the final diff and commit the repository configuration

**Files:**
- Review: `docs/deployment/cloudflare.md`
- Review: `README.md`

- [ ] **Step 1: Confirm the diff is scoped**

Run:

```powershell
git diff -- docs/deployment/cloudflare.md README.md
git status --short
```

Confirm that only the new runbook and README changes are included from this implementation. Preserve unrelated user changes in `.gitignore`, `app/favicon.ico`, `public/`, `scripts/`, and other paths.

- [ ] **Step 2: Commit the documentation configuration**

Run:

```powershell
git add README.md docs/deployment/cloudflare.md
git commit -m "docs: add Cloudflare DNS and OSS CDN runbook"
```

Expected result: a commit containing only the Cloudflare runbook and its README link.

