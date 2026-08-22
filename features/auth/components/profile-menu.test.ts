import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  cloneElement,
  createElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
  signOutAction: vi.fn(),
}));

vi.mock("@/features/auth/server/auth-service", () => ({
  getCurrentProfile: authMocks.getCurrentProfile,
}));

vi.mock("@/features/auth/server/actions", () => ({
  signOutAction: authMocks.signOutAction,
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, ...props }: { children?: ReactNode }) =>
    createElement("span", props, children),
  AvatarImage: (props: Record<string, unknown>) => createElement("img", props),
  AvatarFallback: ({ children, ...props }: { children?: ReactNode }) =>
    createElement("span", props, children),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children?: ReactNode }) => createElement("div", null, children),
  DropdownMenuContent: ({ children, ...props }: { children?: ReactNode }) =>
    createElement("div", props, children),
  DropdownMenuGroup: ({ children }: { children?: ReactNode }) => createElement("div", null, children),
  DropdownMenuLabel: ({ children, ...props }: { children?: ReactNode }) =>
    createElement("span", props, children),
  DropdownMenuSeparator: (props: Record<string, unknown>) => createElement("hr", props),
  DropdownMenuTrigger: ({ children, ...props }: { children?: ReactNode }) =>
    createElement("button", props, children),
  DropdownMenuItem: ({ children, render, ...props }: {
    children?: ReactNode;
    render?: ReactElement;
  }) => render ? cloneElement(render, props, children) : createElement("button", props, children),
}));

import { PublicAuthControls } from "./public-auth-controls";

function collectRenderedElements(node: ReactNode): ReactElement[] {
  if (Array.isArray(node)) {
    return node.flatMap(collectRenderedElements);
  }

  if (!isValidElement(node)) {
    return [];
  }

  const element = node as ReactElement<{ children?: ReactNode }>;
  const children = element.props.children;

  if (typeof element.type === "function") {
    const component = element.type as (props: typeof element.props) => ReactNode;

    return [element, ...collectRenderedElements(component(element.props))];
  }

  return [element, ...collectRenderedElements(children)];
}

async function renderPublicAuthControls() {
  const element = await PublicAuthControls();

  return {
    elements: collectRenderedElements(element),
    markup: renderToStaticMarkup(element),
  };
}

describe("PublicAuthControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.signOutAction.mockResolvedValue(undefined);
  });

  it("在未登录时渲染登录与注册链接", async () => {
    authMocks.getCurrentProfile.mockResolvedValue(null);

    const { markup } = await renderPublicAuthControls();

    expect(markup).toContain('href="/login"');
    expect(markup).toContain('href="/register"');
    expect(markup).toContain("登录");
    expect(markup).toContain("注册");
  });

  it("将账户菜单声明为客户端组件以保留下拉菜单交互状态", () => {
    const source = readFileSync(
      resolve(process.cwd(), "features/auth/components/profile-menu.tsx"),
      "utf8",
    );

    expect(source.trimStart().startsWith('"use client"')).toBe(true);
  });

  it("使用菜单内容内的语义名称标签，避免缺失 Base UI group context", () => {
    const source = readFileSync(
      resolve(process.cwd(), "features/auth/components/profile-menu.tsx"),
      "utf8",
    );

    expect(source).toContain("<div className=\"truncate px-1.5 py-1 text-xs font-medium text-muted-foreground\">");
  });

  it("为表单退出项声明原生按钮语义以匹配 Base UI Menu.Item", () => {
    const source = readFileSync(
      resolve(process.cwd(), "features/auth/components/profile-menu.tsx"),
      "utf8",
    );

    expect(source).toMatch(
      /<DropdownMenuItem\s+nativeButton[\s\S]*render=\{<button type="submit" \/>\}/,
    );
  });

  it("在深色公开页面中输出可读的账户控件", async () => {
    authMocks.getCurrentProfile.mockResolvedValue(null);

    const element = await PublicAuthControls({ surface: "dark" });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("border-background/25");
    expect(markup).toContain("text-background");
  });

  it("为普通用户提供可访问头像、个人中心与已绑定退出操作的表单", async () => {
    authMocks.getCurrentProfile.mockResolvedValue({
      id: "user-1",
      displayName: "林默",
      avatarUrl: null,
      role: "user",
    });

    const { elements, markup } = await renderPublicAuthControls();

    expect(markup).toContain('aria-label="打开账户菜单"');
    expect(markup).toContain('data-icon="account"');
    expect(markup).toContain("林");
    expect(markup).toContain('href="/profile"');
    expect(markup).toContain("个人中心");
    expect(markup).toContain("<form");
    expect(markup).toContain("退出登录");
    expect(markup).not.toContain('href="/admin"');
    expect(
      elements.some(
        (element) =>
          element.type === "form" &&
          (element.props as { action?: unknown }).action === authMocks.signOutAction,
      ),
    ).toBe(true);
  });

  it("只为管理员提供管理后台入口，并保留默认头像回退字符", async () => {
    authMocks.getCurrentProfile.mockResolvedValue({
      id: "admin-1",
      displayName: null,
      avatarUrl: null,
      role: "admin",
    });

    const { markup } = await renderPublicAuthControls();

    expect(markup).toContain('href="/admin"');
    expect(markup).toContain("管理后台");
    expect(markup).toContain("用");
  });
});
