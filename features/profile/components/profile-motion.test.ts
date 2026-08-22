import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const motionPath = resolve(import.meta.dirname, "profile-motion.tsx");

describe("ProfileMotion", () => {
  it("为所有用户播放 scoped 的 transform/opacity 时间线", async () => {
    const source = await readFile(motionPath, "utf8");

    expect(source).not.toContain("prefers-reduced-motion");
    expect(source).not.toContain("gsap.matchMedia");
    expect(source).toContain('opacity: 0, y: 12');
    expect(source).toContain("{ scope }");
  });
});
