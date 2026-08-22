import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  redirect: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import { signInWithGitHubAction, signUpAction } from "./actions";

const canonicalSiteUrl = "https://yltt.example.cn";
const maliciousOrigin = "https://attacker.example";

function createCredentialsFormData() {
  const formData = new FormData();
  formData.set("email", "reader@example.cn");
  formData.set("password", "password123");
  formData.set("next", "/profile");
  return formData;
}

describe("认证回调地址", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SITE_URL = canonicalSiteUrl;
    mocks.headers.mockResolvedValue(new Headers({ origin: maliciousOrigin }));
  });

  it("注册确认邮件始终使用受信任的站点地址", async () => {
    const signUp = vi.fn().mockResolvedValue({ error: null });
    mocks.createServerSupabaseClient.mockResolvedValue({ auth: { signUp } });

    await signUpAction({}, createCredentialsFormData());

    expect(signUp).toHaveBeenCalledWith({
      email: "reader@example.cn",
      password: "password123",
      options: {
        emailRedirectTo:
          "https://yltt.example.cn/auth/callback?next=%2Fprofile",
      },
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/login?check-email=1&next=%2Fprofile",
    );
    expect(mocks.headers).not.toHaveBeenCalled();
  });

  it("GitHub 授权始终使用受信任的站点地址", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: "https://github.com/login/oauth/authorize" },
      error: null,
    });
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { signInWithOAuth },
    });

    await signInWithGitHubAction({}, createCredentialsFormData());

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "github",
      options: {
        redirectTo: "https://yltt.example.cn/auth/callback?next=%2Fprofile",
      },
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      "https://github.com/login/oauth/authorize",
    );
    expect(mocks.headers).not.toHaveBeenCalled();
  });
});
