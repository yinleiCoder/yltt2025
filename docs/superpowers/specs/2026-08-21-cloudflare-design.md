# Cloudflare DNS and OSS CDN Design

## Goal

Configure Cloudflare for the existing YlTt2025 deployment without moving the Next.js application off Vercel:

- Cloudflare owns DNS for the production domain.
- The application domain continues to resolve to the existing Vercel project.
- A dedicated media hostname proxies and caches public media from Alibaba Cloud OSS.
- The application switches to the media hostname through `MEDIA_CDN_BASE_URL`.

## Scope

### Included

- A repository runbook for Cloudflare DNS, proxy, SSL/TLS, cache, and verification settings.
- The DNS and origin prerequisites for an Alibaba Cloud OSS custom media hostname.
- Production environment variable guidance.
- Rollback and cache-invalidation procedures.

### Excluded

- Moving the Next.js runtime to Cloudflare Workers or Pages.
- Migrating media from OSS to Cloudflare R2.
- Changing the signed upload flow or exposing OSS credentials to the browser.
- Direct Cloudflare account changes. Those require the production domain, zone access, and the actual OSS endpoint.

## Current System

The app is a Next.js 16 App Router application with server-rendered pages, Server Actions, a route handler, Supabase session refresh, and server-side OSS signing. The repository already resolves public media URLs in this order:

1. `MEDIA_CDN_BASE_URL`
2. `OSS_PUBLIC_BASE_URL`

Media object keys remain relative paths. Image transformation query parameters such as `x-oss-process` must be retained when Cloudflare caches media responses.

## Recommended Architecture

```text
Browser
  |
  | HTTPS
  v
Cloudflare DNS and proxy
  |-- example.com / www.example.com --> Vercel custom domain
  |
  `-- media.example.com -------------> Alibaba OSS HTTPS custom domain
```

The main site and media hostname are separate origins. Cloudflare provides the public edge certificate and proxy for both hostnames. Vercel remains responsible for serving the Next.js application, while OSS remains responsible for storage and signed `PUT` uploads.

## DNS and Origin Setup

Use placeholders until the real domain is supplied:

| Name | Type | Target | Proxy | Purpose |
| --- | --- | --- | --- | --- |
| `@` | A or CNAME flattening | Vercel target shown by the project | Proxied after Vercel verification | Apex application domain |
| `www` | CNAME | Vercel target shown by the project | Proxied after Vercel verification | Application alias |
| `media` | CNAME | OSS custom-domain target/endpoint | Proxied | Public media CDN |

The exact Vercel target and OSS endpoint must come from the respective dashboards. Do not guess an OSS region endpoint or point the media record at an upload-only/private endpoint.

Before enabling the `media` proxy:

1. Add the media hostname to the OSS bucket as an HTTPS custom domain.
2. Complete Alibaba Cloud ownership verification and certificate setup.
3. Confirm the OSS custom hostname serves a known public object over HTTPS.
4. Add the same hostname to Cloudflare and verify the CNAME target.

Before enabling proxying for the application hostname:

1. Add the production hostname to the Vercel project.
2. Complete Vercel DNS/domain verification.
3. Verify the origin works directly through its Vercel hostname.
4. Enable Cloudflare proxy and verify the hostname again.

## SSL/TLS and Security

- Set Cloudflare SSL/TLS mode to `Full (strict)`.
- Use valid certificates at both Vercel and the OSS custom domain.
- Enable `Always Use HTTPS` after both origins pass HTTPS checks.
- Keep the OSS bucket public-read/private-write as required by the current application. Do not publish access keys or signed upload credentials in Cloudflare settings.
- Do not cache `/api/*`, authentication callbacks, admin routes, or any request that contains session-sensitive behavior.
- Keep media upload requests on the existing server-issued OSS signed URL path. Cloudflare only fronts public `GET`/`HEAD` media reads.

## Media Cache Policy

Apply the cache rule only to the media hostname:

- Match: hostname equals `media.example.com` and method is `GET` or `HEAD`.
- Cache eligibility: eligible for cache, with a long browser/edge TTL for immutable object keys.
- Cache key: include the query string because OSS image processing uses `x-oss-process` parameters.
- Respect origin errors and do not cache `4xx`/`5xx` responses for a long TTL.
- Do not apply this rule to `PUT`, signed URLs, the main application hostname, or API routes.

If content is replaced at the same object key, purge the affected URL or use a new object key. The current upload flow already generates unique object keys, so normal uploads do not require a global purge.

## Application Environment

Set production secrets in the deployment platform, not in Git:

```text
MEDIA_CDN_BASE_URL=https://media.example.com
OSS_PUBLIC_BASE_URL=https://<oss-origin-domain>
```

`MEDIA_CDN_BASE_URL` is the only application setting needed to switch public reads to Cloudflare. Keep `OSS_PUBLIC_BASE_URL` as a rollback fallback, but do not use it as the primary URL once the CDN hostname is verified.

## Verification

Verify the following before considering the setup complete:

- `dig` or an equivalent DNS lookup returns the intended Cloudflare records.
- `https://example.com` and `https://www.example.com` present valid certificates and load the Vercel app.
- `https://media.example.com/<known-object-key>` returns the media object with status `200`.
- A repeated media `GET` includes a Cloudflare cache result such as `HIT` after the first request.
- An image URL with `x-oss-process` still returns the transformed image.
- Admin upload still obtains an OSS signed `PUT` URL and completes successfully.
- `/auth/callback`, login, session refresh, comments, and admin authorization still work through the production hostname.
- The original OSS URL remains usable for rollback before it is removed from environment configuration.

## Rollback

1. Set `MEDIA_CDN_BASE_URL` back to the original `OSS_PUBLIC_BASE_URL` value or remove it.
2. Redeploy the Vercel project so server-rendered URLs use OSS directly.
3. If the issue is limited to stale media, purge the media hostname cache.
4. Keep Cloudflare DNS records intact until the direct OSS and application paths have been revalidated.

## Alternatives Considered

### Cloudflare Worker media proxy

A Worker could rewrite requests to OSS and centralize cache logic. It would add source code, deployment, observability, and origin-header behavior to maintain. It is unnecessary while OSS supports an HTTPS custom domain and Cloudflare can proxy it directly.

### Cloudflare R2 migration

R2 would remove the cross-provider media origin but requires moving objects, changing the upload signer, validating permissions, and planning a rollback. It is outside the requested DNS/CDN configuration.

