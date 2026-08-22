import { z } from "zod";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const ossEnvironmentSchema = z.object({
  OSS_REGION: z.string().min(1),
  OSS_BUCKET: z.string().min(1),
  OSS_ACCESS_KEY_ID: z.string().min(1),
  OSS_ACCESS_KEY_SECRET: z.string().min(1),
  OSS_ENDPOINT: z.string().min(1).optional(),
  OSS_PUBLIC_BASE_URL: z.url().optional(),
  MEDIA_CDN_BASE_URL: z.url().optional(),
});

const publicMediaEnvironmentSchema = z.object({
  OSS_PUBLIC_BASE_URL: z.url().optional(),
  MEDIA_CDN_BASE_URL: z.url().optional(),
});

const siteUrlSchema = z.object({
  SITE_URL: z.url(),
});

export function getTrustedAppOrigin(): string {
  const siteUrl = process.env.SITE_URL;

  if (!siteUrl) {
    if (process.env.NODE_ENV !== "production") {
      return "http://localhost:3000";
    }

    throw new Error("生产环境必须配置 SITE_URL。");
  }

  const environment = siteUrlSchema.parse({ SITE_URL: siteUrl });
  const url = new URL(environment.SITE_URL);

  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("生产环境的 SITE_URL 必须使用 HTTPS 协议。");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("SITE_URL 必须使用 HTTP 或 HTTPS 协议。");
  }

  return url.origin;
}

export function getPublicEnvironment() {
  return publicEnvironmentSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function hasPublicSupabaseEnvironment(): boolean {
  return publicEnvironmentSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }).success;
}

export function getOssEnvironment() {
  return ossEnvironmentSchema.parse({
    OSS_REGION: process.env.OSS_REGION,
    OSS_BUCKET: process.env.OSS_BUCKET,
    OSS_ACCESS_KEY_ID: process.env.OSS_ACCESS_KEY_ID,
    OSS_ACCESS_KEY_SECRET: process.env.OSS_ACCESS_KEY_SECRET,
    OSS_ENDPOINT: process.env.OSS_ENDPOINT,
    OSS_PUBLIC_BASE_URL: process.env.OSS_PUBLIC_BASE_URL,
    MEDIA_CDN_BASE_URL: process.env.MEDIA_CDN_BASE_URL,
  });
}

export function getPublicMediaBaseUrl(): string | null {
  const environment = publicMediaEnvironmentSchema.parse({
    OSS_PUBLIC_BASE_URL: process.env.OSS_PUBLIC_BASE_URL,
    MEDIA_CDN_BASE_URL: process.env.MEDIA_CDN_BASE_URL,
  });

  return environment.MEDIA_CDN_BASE_URL ?? environment.OSS_PUBLIC_BASE_URL ?? null;
}
