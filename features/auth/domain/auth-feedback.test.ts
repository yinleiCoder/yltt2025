import { describe, expect, it } from "vitest";

import {
  getAuthErrorMessage,
  getAuthHashErrorCode,
  getAuthErrorRedirectPath,
  parseAuthCredentials,
} from "./auth-feedback";

describe("parseAuthCredentials", () => {
  it("normalizes a valid email and preserves the password", () => {
    expect(parseAuthCredentials("  USER@example.com ", "password-123")).toEqual({
      value: {
        email: "user@example.com",
        password: "password-123",
      },
    });
  });

  it("returns a validation error for an invalid email", () => {
    expect(parseAuthCredentials("not-an-email", "password-123")).toEqual({
      error: "请输入有效的邮箱地址。",
    });
  });

  it("returns a validation error for a short password", () => {
    expect(parseAuthCredentials("user@example.com", "short")).toEqual({
      error: "密码至少需要 8 个字符。",
    });
  });
});

describe("getAuthErrorMessage", () => {
  it("maps invalid credentials to a recoverable message", () => {
    expect(getAuthErrorMessage(new Error("Invalid login credentials"))).toBe(
      "邮箱或密码不正确。",
    );
  });

  it("maps an unconfirmed account to an actionable message", () => {
    expect(getAuthErrorMessage(new Error("Email not confirmed"))).toBe(
      "请先完成邮箱确认，再登录。",
    );
  });

  it("explains when the provider rejects an email address", () => {
    expect(
      getAuthErrorMessage(new Error("Email address is invalid")),
    ).toBe("请输入可接收邮件的有效邮箱地址。");
  });

  it("maps a duplicate account error code to Chinese", () => {
    expect(
      getAuthErrorMessage(new Error("email_exists: User already registered")),
    ).toBe("该邮箱已注册，请直接登录。");
  });

  it("maps a provider rate limit error code to Chinese", () => {
    expect(
      getAuthErrorMessage(new Error("over_email_send_rate_limit")),
    ).toBe("请求过于频繁，请稍后再试。");
  });

  it("maps a GitHub provider setup error without exposing provider details", () => {
    expect(
      getAuthErrorMessage(new Error("Provider is not enabled: github")),
    ).toBe("GitHub 登录暂不可用，请稍后再试。");
  });

  it("maps an unverified email error code to Chinese", () => {
    expect(
      getAuthErrorMessage(new Error("email_not_confirmed")),
    ).toBe("请先完成邮箱确认，再登录。");
  });

  it("does not expose unknown provider errors", () => {
    expect(getAuthErrorMessage(new Error("internal provider detail"))).toBe(
      "认证请求失败，请稍后重试。",
    );
  });

  it("maps expired verification links to Chinese", () => {
    expect(getAuthErrorMessage(new Error("otp_expired"))).toBe(
      "登录链接已失效，请重新发起登录。",
    );
    expect(getAuthErrorMessage(new Error("flow_state_expired"))).toBe(
      "登录链接已失效，请重新发起登录。",
    );
    expect(
      getAuthErrorMessage(
        new Error("The sign-in link expired or could not be verified. &#x20;"),
      ),
    ).toBe("登录链接已失效，请重新发起登录。");
  });

  it("maps GitHub callback verification failures to Chinese", () => {
    expect(getAuthErrorMessage(new Error("bad_code_verifier"))).toBe(
      "GitHub 登录验证失败，请重新发起登录。",
    );
    expect(getAuthErrorMessage(new Error("bad_oauth_callback"))).toBe(
      "GitHub 登录验证失败，请重新发起登录。",
    );
  });
});

describe("getAuthHashErrorCode", () => {
  it("reads a Supabase error code from a URL fragment", () => {
    expect(
      getAuthHashErrorCode(
        "#error=access_denied&error_code=otp_expired&error_description=expired",
      ),
    ).toBe("otp_expired");
  });

  it("ignores fragments that do not describe an auth error", () => {
    expect(getAuthHashErrorCode("#archive")).toBeNull();
  });
});

describe("getAuthErrorRedirectPath", () => {
  it("keeps the requested destination when returning OAuth errors", () => {
    expect(getAuthErrorRedirectPath("bad_code_verifier", "/profile")).toBe(
      "/login?error=bad_code_verifier&next=%2Fprofile",
    );
  });
});
