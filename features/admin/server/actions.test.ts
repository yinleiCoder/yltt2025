import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  AdministratorRequiredError: class AdministratorRequiredError extends Error {},
  AdminRoleChangeError: class AdminRoleChangeError extends Error {
    kind: "last-administrator" | "other";

    constructor(kind: "last-administrator" | "other") {
      super(kind);
      this.kind = kind;
    }
  },
  AdminCommentNotFoundError: class AdminCommentNotFoundError extends Error {},
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
  changeAdminUserRole: vi.fn(),
  revalidatePath: vi.fn(),
  setAdminCommentStatus: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/features/admin/server/admin-management-service", () => ({
  AdminCommentNotFoundError: mocks.AdminCommentNotFoundError,
  AdminRoleChangeError: mocks.AdminRoleChangeError,
  changeAdminUserRole: mocks.changeAdminUserRole,
  setAdminCommentStatus: mocks.setAdminCommentStatus,
}));

vi.mock("@/features/auth/server/auth-service", () => ({
  AdministratorRequiredError: mocks.AdministratorRequiredError,
  AuthenticationRequiredError: mocks.AuthenticationRequiredError,
}));

import {
  changeUserRoleAction,
  updateCommentStatusAction,
} from "./actions";

function roleFormData(targetId = "8d8ddcb4-2b9e-4345-a221-3aec465fc341", nextRole = "admin") {
  const formData = new FormData();
  formData.set("targetId", targetId);
  formData.set("nextRole", nextRole);
  return formData;
}

function commentFormData(commentId = "de5df43e-e259-4a63-8a61-c7f0a0c6d43c", status = "hidden") {
  const formData = new FormData();
  formData.set("commentId", commentId);
  formData.set("status", status);
  return formData;
}

describe("admin mutation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a stable Chinese error for an invalid role target before calling the service", async () => {
    await expect(changeUserRoleAction({}, roleFormData("not-a-uuid"))).resolves.toEqual({
      error: "请检查用户角色设置。",
    });

    expect(mocks.changeAdminUserRole).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("returns a stable Chinese error when the role RPC rejects the request", async () => {
    mocks.changeAdminUserRole.mockRejectedValue(new Error("permission denied for function admin_change_user_role"));

    await expect(changeUserRoleAction({}, roleFormData())).resolves.toEqual({
      error: "修改用户角色失败，请稍后重试。",
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("returns a login-expired message for a role action without revalidation", async () => {
    mocks.changeAdminUserRole.mockRejectedValue(new mocks.AuthenticationRequiredError());

    await expect(changeUserRoleAction({}, roleFormData())).resolves.toEqual({
      error: "请先登录后再操作。",
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("returns an administrator-only message for a role action without revalidation", async () => {
    mocks.changeAdminUserRole.mockRejectedValue(new mocks.AdministratorRequiredError());

    await expect(changeUserRoleAction({}, roleFormData())).resolves.toEqual({
      error: "仅管理员可以执行此操作。",
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("returns a clear Chinese error when the final administrator cannot be demoted", async () => {
    mocks.changeAdminUserRole.mockRejectedValue(new mocks.AdminRoleChangeError("last-administrator"));

    await expect(changeUserRoleAction({}, roleFormData("8d8ddcb4-2b9e-4345-a221-3aec465fc341", "user"))).resolves.toEqual({
      error: "系统至少需保留一位管理员。",
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates admin user and audit pages only after a role change succeeds", async () => {
    mocks.changeAdminUserRole.mockResolvedValue(undefined);

    await expect(changeUserRoleAction({}, roleFormData())).resolves.toEqual({
      success: "用户角色已更新。",
    });

    expect(mocks.changeAdminUserRole).toHaveBeenCalledWith(
      "8d8ddcb4-2b9e-4345-a221-3aec465fc341",
      "admin",
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/users");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/audit");
  });

  it("returns a stable Chinese error for invalid comment status before calling the service", async () => {
    await expect(updateCommentStatusAction({}, commentFormData("not-a-uuid", "deleted"))).resolves.toEqual({
      error: "请检查评论审核设置。",
    });

    expect(mocks.setAdminCommentStatus).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not expose a comment update failure and revalidates only after success", async () => {
    mocks.setAdminCommentStatus.mockRejectedValueOnce(new Error("permission denied for table comments"));

    await expect(updateCommentStatusAction({}, commentFormData())).resolves.toEqual({
      error: "更新评论状态失败，请稍后重试。",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();

    mocks.setAdminCommentStatus.mockResolvedValueOnce(undefined);
    await expect(updateCommentStatusAction({}, commentFormData())).resolves.toEqual({
      success: "评论状态已更新。",
    });

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/comments");
  });

  it("returns a not-found message without revalidating when the comment no longer exists", async () => {
    mocks.setAdminCommentStatus.mockRejectedValue(new mocks.AdminCommentNotFoundError());

    await expect(updateCommentStatusAction({}, commentFormData())).resolves.toEqual({
      error: "未找到该评论。",
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("returns a login-expired message for a comment action without revalidation", async () => {
    mocks.setAdminCommentStatus.mockRejectedValue(new mocks.AuthenticationRequiredError());

    await expect(updateCommentStatusAction({}, commentFormData())).resolves.toEqual({
      error: "请先登录后再操作。",
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("returns an administrator-only message for a comment action without revalidation", async () => {
    mocks.setAdminCommentStatus.mockRejectedValue(new mocks.AdministratorRequiredError());

    await expect(updateCommentStatusAction({}, commentFormData())).resolves.toEqual({
      error: "仅管理员可以执行此操作。",
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
