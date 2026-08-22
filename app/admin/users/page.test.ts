import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const pagePath = resolve(import.meta.dirname, "page.tsx");

describe("AdminUsersPage", () => {
  it("identifies public email and birth date in the user table", async () => {
    const source = await readFile(pagePath, "utf8");

    expect(source).toContain('user.publicProfile.email && "邮箱"');
    expect(source).toContain('user.publicProfile.birthDate && "出生日期"');
  });
});
