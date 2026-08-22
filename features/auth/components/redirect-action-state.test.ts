import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("redirect action pending states", () => {
  it("shows pending feedback for destructive and sign-out forms", async () => {
    const [deleteForm, profileMenu, adminShell] = await Promise.all([
      readFile(resolve(process.cwd(), "features/admin/components/delete-content-form.tsx"), "utf8"),
      readFile(resolve(process.cwd(), "features/auth/components/profile-menu.tsx"), "utf8"),
      readFile(resolve(process.cwd(), "features/admin/components/admin-sign-out-button.tsx"), "utf8"),
    ]);

    expect(deleteForm).toContain("useFormStatus");
    expect(profileMenu).toContain("onSubmit={handleSignOutSubmit}");
    expect(adminShell).toContain("useFormStatus");
    expect(deleteForm).toContain("正在删除...");
    expect(profileMenu).toContain("正在退出...");
    expect(adminShell).toContain("正在退出...");
  });
});
