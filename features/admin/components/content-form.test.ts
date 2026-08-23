import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("ContentForm Base UI inputs", () => {
  it("does not pass changing default values to Base UI Input controls", async () => {
    const source = await readFile(
      resolve(process.cwd(), "features/admin/components/content-form.tsx"),
      "utf8",
    );

    expect(source).not.toMatch(/<Input[^>]*defaultValue=/);
  });
});
