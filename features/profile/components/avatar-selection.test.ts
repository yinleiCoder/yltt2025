import { describe, expect, it, vi } from "vitest";

import { changeAvatarSelection, type AvatarSelection } from "./avatar-selection";

const existingSelection: AvatarSelection = {
  file: new File(["avatar"], "avatar.png", { type: "image/png" }),
  objectKey: null,
  previewObjectUrl: "blob:existing-preview",
  previewUrl: "blob:existing-preview",
};

describe("getAvatarSelectionTransition", () => {
  it("保留已选有效头像预览，且选择不支持的文件时不创建或释放预览", () => {
    const createPreviewUrl = vi.fn();
    const revokePreviewUrl = vi.fn();

    const result = changeAvatarSelection({
      current: existingSelection,
      file: new File(["gif"], "avatar.gif", { type: "image/gif" }),
      initialAvatarUrl: "https://example.com/original.png",
      createPreviewUrl,
      revokePreviewUrl,
    });

    expect(result).toEqual({
      error: "头像仅支持 JPEG、PNG 或 WebP 图片。",
      kind: "invalid",
    });
    expect(createPreviewUrl).not.toHaveBeenCalled();
    expect(revokePreviewUrl).not.toHaveBeenCalled();
  });

  it("保留已选有效头像预览，且选择超限文件时不创建或释放预览", () => {
    const createPreviewUrl = vi.fn();
    const revokePreviewUrl = vi.fn();

    const result = changeAvatarSelection({
      current: existingSelection,
      file: new File([new Uint8Array(5 * 1024 * 1024 + 1)], "avatar.png", { type: "image/png" }),
      initialAvatarUrl: "https://example.com/original.png",
      createPreviewUrl,
      revokePreviewUrl,
    });

    expect(result).toEqual({ kind: "invalid", error: "头像文件不能超过 5 MB。" });
    expect(createPreviewUrl).not.toHaveBeenCalled();
    expect(revokePreviewUrl).not.toHaveBeenCalled();
  });

  it("替换或清空头像时标记旧临时预览供调用方释放", () => {
    const createPreviewUrl = vi.fn().mockReturnValue("blob:next-preview");
    const revokePreviewUrl = vi.fn();

    expect(
      changeAvatarSelection({
        current: existingSelection,
        file: new File(["next"], "next.webp", { type: "image/webp" }),
        initialAvatarUrl: "https://example.com/original.png",
        createPreviewUrl,
        revokePreviewUrl,
      }),
    ).toEqual({
      kind: "replace",
      selection: {
        file: expect.any(File),
        objectKey: null,
        previewObjectUrl: "blob:next-preview",
        previewUrl: "blob:next-preview",
      },
      previousPreviewObjectUrl: "blob:existing-preview",
    });

    expect(
      changeAvatarSelection({
        current: existingSelection,
        file: null,
        initialAvatarUrl: "https://example.com/original.png",
        createPreviewUrl,
        revokePreviewUrl,
      }),
    ).toEqual({
      kind: "clear",
      previousPreviewObjectUrl: "blob:existing-preview",
      selection: {
        file: null,
        objectKey: null,
        previewObjectUrl: null,
        previewUrl: "https://example.com/original.png",
      },
    });
    expect(revokePreviewUrl).toHaveBeenCalledWith("blob:existing-preview");
  });
});
