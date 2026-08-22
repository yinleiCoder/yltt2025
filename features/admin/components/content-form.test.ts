import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("ContentForm async feedback", () => {
  it("uses toast feedback and exposes busy state for long operations", async () => {
    const source = await readFile(resolve(import.meta.dirname, "content-form.tsx"), "utf8");

    expect(source).toContain('import { toast } from "sonner"');
    expect(source).toContain("toast.loading");
    expect(source).toContain("toast.success(state.success)");
    expect(source).toContain("aria-busy={isPending || isUploading || isSubmitting}");
    expect(source).toContain("disabled={isLocating}");
  });
});
