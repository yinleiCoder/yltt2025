import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("media transcoder browser-only dependencies", () => {
  it("loads heic2any only when an HEIC file is prepared", async () => {
    const source = await readFile(
      resolve(process.cwd(), "features/media/client/transcode-media.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/^import heic2any from "heic2any";/m);
    expect(source).toMatch(/await import\("heic2any"\)/);
  });
});
