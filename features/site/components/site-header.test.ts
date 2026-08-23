import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("SiteHeader", () => {
  it("keeps public archive links visible on mobile", async () => {
    const source = await readFile(
      resolve(process.cwd(), "features/site/components/site-header.tsx"),
      "utf8",
    );

    expect(source).not.toContain("hidden text-[#222222] transition-colors hover:bg-[#FFF083] sm:inline");
    expect(source).not.toContain("hidden transition-colors hover:bg-[#FFF083] sm:inline");
  });
});
