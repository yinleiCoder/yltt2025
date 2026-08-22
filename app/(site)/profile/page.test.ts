import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const pagePath = resolve(import.meta.dirname, "page.tsx");

describe("个人中心页面", () => {
  it("在服务端加载当前用户资料，并将未登录用户送往带 next 参数的登录页", async () => {
    const source = await readFile(pagePath, "utf8");

    expect(source).toContain("getCurrentProfileDetails");
    expect(source).toContain('redirect("/login?next=/profile")');
    expect(source).toContain("AuthenticationRequiredError");
  });

  it("只向客户端表单传递可编辑的个人资料字段", async () => {
    const source = await readFile(pagePath, "utf8");

    expect(source).toContain("avatarUrl: profile.avatarUrl");
    expect(source).toContain("displayName: profile.displayName");
    expect(source).not.toMatch(/role:\s*profile\./);
    expect(source).not.toMatch(/createdAt:\s*profile\./);
    expect(source).not.toMatch(/updatedAt:\s*profile\./);
  });
});
