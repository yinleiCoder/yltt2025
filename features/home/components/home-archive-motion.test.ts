import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const motionPath = resolve(import.meta.dirname, "home-archive-motion.tsx");

describe("HomeArchiveMotion", () => {
  it("空归档没有索引节点时不把空选择器传给 GSAP", async () => {
    const source = await readFile(motionPath, "utf8");

    expect(source).toContain(
      'const heroIndexItems = scope.querySelectorAll<HTMLElement>("[data-home-hero-index] > *");',
    );
    expect(source).toContain("if (heroIndexItems.length) {");
    expect(source).toMatch(/intro\.from\(\s+heroIndexItems,/);
  });
});
