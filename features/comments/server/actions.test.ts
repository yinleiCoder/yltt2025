import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentProfile: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/features/auth/server/auth-service", () => ({
  requireCurrentProfile: mocks.requireCurrentProfile,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { addCommentAction, deleteCommentAction, updateCommentAction } from "./actions";

describe("addCommentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentProfile.mockResolvedValue({ id: "profile-1" });
  });

  it("returns a Simplified Chinese success message after publishing a comment", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    const formData = new FormData();
    formData.set("contentId", "b7e7b1d8-77c2-4d24-bf7d-5f989750a661");
    formData.set("body", "很喜欢这一帧。 ");

    await expect(addCommentAction({}, formData)).resolves.toEqual({ success: "评论已发布。" });
  });

  it("does not expose a database error while publishing", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: { message: "relation profiles is not accessible" } }),
      }),
    });

    await expect(addCommentAction({}, commentFormData())).resolves.toEqual({
      error: "发表评论失败，请稍后重试。",
    });
  });

  it("returns a stable Chinese error for an invalid comment id", async () => {
    const formData = new FormData();
    formData.set("commentId", "not-a-uuid");
    formData.set("body", "更新后的评论");

    await expect(updateCommentAction(formData)).resolves.toEqual({
      error: "编辑评论失败，请稍后重试。",
    });
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("reports an unavailable comment without revealing ownership details", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue(updateQuery({ data: null, error: null })),
      }),
    });

    await expect(updateCommentAction(commentMutationFormData())).resolves.toEqual({
      error: "未找到评论或无权操作。",
    });
  });

  it("returns Chinese success after updating a comment", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue(updateQuery({ data: { id: "comment-1" }, error: null })),
      }),
    });

    await expect(updateCommentAction(commentMutationFormData())).resolves.toEqual({
      success: "评论已更新。",
    });
  });

  it("does not expose a database error while deleting", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue(deleteQuery({ data: null, error: { message: "permission denied for comments" } })),
      }),
    });

    await expect(deleteCommentAction(commentIdFormData())).resolves.toEqual({
      error: "删除评论失败，请稍后重试。",
    });
  });

  it("returns Chinese success after deleting a comment", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue(deleteQuery({ data: { id: "comment-1" }, error: null })),
      }),
    });

    await expect(deleteCommentAction(commentIdFormData())).resolves.toEqual({
      success: "评论已删除。",
    });
  });
});

function commentFormData() {
  const formData = new FormData();
  formData.set("contentId", "b7e7b1d8-77c2-4d24-bf7d-5f989750a661");
  formData.set("body", "很喜欢这一帧。 ");
  return formData;
}

function commentMutationFormData() {
  const formData = commentIdFormData();
  formData.set("body", "更新后的评论");
  return formData;
}

function commentIdFormData() {
  const formData = new FormData();
  formData.set("commentId", "a7e7b1d8-77c2-4d24-bf7d-5f989750a661");
  return formData;
}

function updateQuery(result: { data: { id: string } | null; error: { message: string } | null }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ maybeSingle });
  const byAuthor = vi.fn().mockReturnValue({ select });
  const byId = vi.fn().mockReturnValue({ eq: byAuthor });
  return { eq: byId };
}

function deleteQuery(result: { data: { id: string } | null; error: { message: string } | null }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ maybeSingle });
  const byAuthor = vi.fn().mockReturnValue({ select });
  const byId = vi.fn().mockReturnValue({ eq: byAuthor });
  return { eq: byId };
}
