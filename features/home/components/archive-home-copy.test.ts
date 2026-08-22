import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const archiveHomePath = resolve(import.meta.dirname, "archive-home.tsx");

describe("首页档案文案", () => {
  it("使用简体中文展示精选和影像索引标签", async () => {
    const source = await readFile(archiveHomePath, "utf8");

    expect(source).toContain("影像接触表");
    expect(source).toContain('label: "日期"');
    expect(source).toContain('label: "地点"');
    expect(source).toContain('label: "镜头"');
    expect(source).toContain('label: "曝光"');
    expect(source).toContain('label: "感光度"');
    expect(source).not.toContain("CONTACT SHEETS");
    expect(source).not.toContain("FEATURED");
    expect(source).not.toContain('label: "DATE"');
    expect(source).not.toContain('label: "PLACE"');
    expect(source).not.toContain('label: "LENS"');
    expect(source).not.toContain('label: "EXPOSURE"');
  });
});
