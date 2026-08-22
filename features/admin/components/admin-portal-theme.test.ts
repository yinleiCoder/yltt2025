import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const navigationPath = resolve(import.meta.dirname, "admin-navigation.tsx");
const detailsDialogPath = resolve(import.meta.dirname, "admin-user-details-dialog.tsx");

describe("后台 Portal 主题", () => {
  it("将中性后台令牌附加到 Sheet 和 Dialog 的 Portal 内容根节点", async () => {
    const [navigation, detailsDialog] = await Promise.all([
      readFile(navigationPath, "utf8"),
      readFile(detailsDialogPath, "utf8"),
    ]);

    expect(navigation).toContain('SheetContent className="admin-surface');
    expect(detailsDialog).toContain('DialogContent className="admin-surface');
  });
});
