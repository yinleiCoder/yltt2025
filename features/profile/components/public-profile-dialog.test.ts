import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const dialogPath = resolve(import.meta.dirname, "public-profile-dialog.tsx");

describe("PublicProfileDialog", () => {
  it("renders only public email and age fields", async () => {
    const source = await readFile(dialogPath, "utf8");

    expect(source).toContain('profile.email ? ["邮箱", profile.email] : null');
    expect(source).toContain("profile.age");
    expect(source).toContain('["年龄", `${profile.age}岁`]');
    expect(source).not.toContain("birthDate");
  });
});
