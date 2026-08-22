import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("loading skeletons", () => {
  it("为公开、后台和评论区域保留稳定结构", async () => {
    const [publicPage, adminPage, comments, skeleton, globals] = await Promise.all([
      readFile(resolve(import.meta.dirname, "public-page-skeleton.tsx"), "utf8"),
      readFile(resolve(import.meta.dirname, "admin-page-skeleton.tsx"), "utf8"),
      readFile(resolve(import.meta.dirname, "comments-skeleton.tsx"), "utf8"),
      readFile(resolve(import.meta.dirname, "..", "ui", "skeleton.tsx"), "utf8"),
      readFile(resolve(import.meta.dirname, "..", "..", "app", "globals.css"), "utf8"),
    ]);

    expect(publicPage).toContain('aria-busy="true"');
    expect(publicPage).toContain("aspect-[3/2]");
    expect(adminPage).toContain("grid-cols-3");
    expect(adminPage).toContain("min-w-[46rem]");
    expect(comments).toContain('aria-busy="true"');
    expect(comments).toContain("h-16");
    expect(skeleton).toContain('className="animate-shimmer');
    expect(skeleton).not.toContain("motion-reduce");
    expect(globals).toContain("@keyframes skeleton-shimmer");
    expect(globals).not.toContain("prefers-reduced-motion");
  });
});
