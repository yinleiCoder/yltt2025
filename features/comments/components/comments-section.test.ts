import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("CommentsSection feedback", () => {
  it("reports all comment mutations and locks controls while pending", async () => {
    const source = await readFile(resolve(import.meta.dirname, "comments-section.tsx"), "utf8");

    expect(source).toContain('import { toast } from "sonner"');
    expect(source).toContain("const [isMutating, startMutation] = useTransition();");
    expect(source).toContain("toast.success(result.success)");
    expect(source).toContain("toast.error(result.error)");
    expect(source).toContain("disabled={isPending || isMutating}");
  });
});
