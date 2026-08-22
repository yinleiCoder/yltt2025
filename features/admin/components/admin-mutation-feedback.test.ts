import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin mutation feedback", () => {
  it("notifies role and comment status actions", async () => {
    const [role, comment] = await Promise.all([
      readFile(resolve(import.meta.dirname, "admin-user-role-form.tsx"), "utf8"),
      readFile(resolve(import.meta.dirname, "admin-comment-status-form.tsx"), "utf8"),
    ]);

    expect(role).toContain('import { toast } from "sonner"');
    expect(role).toContain("useEffect");
    expect(role).toContain("toast.success(state.success)");
    expect(comment).toContain("toast.success(state.success)");
    expect(comment).toContain("toast.error(state.error)");
  });
});
