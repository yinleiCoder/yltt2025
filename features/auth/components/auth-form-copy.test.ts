import { renderToStaticMarkup } from "react-dom/server";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/auth/server/actions", () => ({
  signInAction: vi.fn(),
  signInWithGitHubAction: vi.fn(),
  signUpAction: vi.fn(),
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children?: ReactNode }) => createElement("div", null, children),
  AlertDescription: ({ children }: { children?: ReactNode }) => createElement("p", null, children),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: ReactNode }) => createElement("button", props, children),
}));

vi.mock("@/components/ui/field", () => ({
  Field: ({ children, ...props }: { children?: ReactNode }) => createElement("div", props, children),
  FieldGroup: ({ children }: { children?: ReactNode }) => createElement("div", null, children),
  FieldDescription: ({ children, ...props }: { children?: ReactNode }) => createElement("p", props, children),
  FieldLabel: ({ children, ...props }: { children?: ReactNode }) => createElement("label", props, children),
  FieldSeparator: ({ children }: { children?: ReactNode }) => createElement("span", null, children),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => createElement("input", props),
}));

import { LoginForm, selectLoginError } from "./login-form";
import { RegisterForm } from "./register-form";

describe("认证表单文案", () => {
  it("使用简体中文邮箱占位符", () => {
    const markup = [
      renderToStaticMarkup(createElement(LoginForm, { next: "/" })),
      renderToStaticMarkup(createElement(RegisterForm, { next: "/" })),
    ].join("");

    expect(markup).toContain('placeholder="请输入常用邮箱"');
    expect(markup).not.toContain("name@example.com");
    expect(markup).toContain("欢迎回到 YLTT2025");
    expect(markup).toContain("加入 YLTT2025");
    expect(markup).toContain("使用 GitHub 登录");
    expect(markup).toContain("使用 GitHub 注册");
    expect(markup.match(/viewBox=\"0 0 496 512\"/g)).toHaveLength(2);
    expect(markup).toContain("服务条款");
    expect(markup).toContain("隐私政策");
  });

  it("只显示最近提交方式返回的错误", () => {
    expect(
      selectLoginError("github", {
        passwordError: "邮箱或密码不正确。",
        githubError: "GitHub 登录暂时不可用。",
      }),
    ).toBe("GitHub 登录暂时不可用。");

    expect(
      selectLoginError("password", {
        passwordError: "邮箱或密码不正确。",
        githubError: "GitHub 登录暂时不可用。",
      }),
    ).toBe("邮箱或密码不正确。");
  });
});
