import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminContentItem: vi.fn(),
  revalidatePath: vi.fn(),
  updateAdminContentItem: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/features/content/server/content-admin-service", () => ({
  createAdminContentItem: mocks.createAdminContentItem,
  updateAdminContentItem: mocks.updateAdminContentItem,
  deleteAdminContentItem: vi.fn(),
}));

import { createContentAction, updateContentAction } from "./actions";

function createStoryFormData() {
  const formData = new FormData();
  formData.set("kind", "story");
  formData.set("title", "夏日晚风");
  formData.set("slug", "summer-breeze");
  formData.set("locationVisibility", "hidden");
  return formData;
}

describe("content actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a stable Chinese validation message without exposing schema text", async () => {
    const formData = createStoryFormData();
    formData.set("slug", "不合法的网址");

    await expect(createContentAction({}, formData)).resolves.toEqual({
      error: "请检查内容填写是否完整、格式是否正确。",
    });

    expect(mocks.createAdminContentItem).not.toHaveBeenCalled();
  });

  it("maps a create service failure to a stable Chinese message", async () => {
    mocks.createAdminContentItem.mockRejectedValue(new Error("Could not create content: duplicate key"));

    await expect(createContentAction({}, createStoryFormData())).resolves.toEqual({
      error: "创建内容失败，请稍后重试。",
    });
  });

  it("maps an update service failure to a stable Chinese message", async () => {
    mocks.updateAdminContentItem.mockRejectedValue(new Error("Invalid content id."));
    const formData = createStoryFormData();
    formData.set("id", "not-a-uuid");

    await expect(updateContentAction({}, formData)).resolves.toEqual({
      error: "保存内容失败，请稍后重试。",
    });
  });
});
