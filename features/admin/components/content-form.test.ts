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

  it("renders the story gallery as a separate section below Markdown", async () => {
    const source = await readFile(resolve(import.meta.dirname, "content-form.tsx"), "utf8");

    expect(source).toContain('data-testid="story-image-gallery-upload"');
    expect(source.indexOf("<StoryMarkdownEditor")).toBeLessThan(source.indexOf('data-testid="story-image-gallery-upload"'));
    expect(source.indexOf('data-testid="story-image-gallery-upload"')).toBeLessThan(source.indexOf("<StoryImageUpload"));
  });
});
