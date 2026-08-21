import { describe, expect, it } from "vitest";

import {
  getAuthErrorMessage,
  getAuthHashErrorCode,
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

  it("does not expose unknown provider errors", () => {
    expect(getAuthErrorMessage(new Error("internal provider detail"))).toBe(
      "认证请求失败，请稍后重试。",
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
