import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

describe("README OSS CORS guidance", () => {
  it("includes POST for avatar form uploads in both CORS instructions", () => {
    expect(readme).toContain("`PUT`、`POST`、`GET`、`HEAD`");
    expect(readme).toContain("允许 `PUT`、`POST`、`GET`、`HEAD` 的 CORS 来源");
  });
});
