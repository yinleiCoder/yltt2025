import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const shellPath = resolve(import.meta.dirname, "admin-shell.tsx");

describe("AdminShell", () => {
  it("shows the current administrator avatar and display name above the sign-out action", async () => {
    const source = await readFile(shellPath, "utf8");

    expect(source).toContain('import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";');
    expect(source).toContain("profile: CurrentProfile");
    expect(source).toContain("profile.avatarUrl");
    expect(source).toContain("profile.displayName");
    expect(source.indexOf("<AdminAccountSummary")).toBeLessThan(
      source.indexOf("<form action={signOutAction}>"),
    );
  });
});
