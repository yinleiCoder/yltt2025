"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AdminCommentNotFoundError,
  AdminRoleChangeError,
  changeAdminUserRole,
  setAdminCommentStatus,
} from "@/features/admin/server/admin-management-service";
import {
  AdministratorRequiredError,
  AuthenticationRequiredError,
} from "@/features/auth/server/auth-service";

const uuidSchema = z.string().uuid();
const roleSchema = z.enum(["user", "admin"]);
const commentStatusSchema = z.enum(["visible", "hidden"]);

export type AdminMutationState = {
  error?: string;
  success?: string;
};

export async function changeUserRoleAction(
  _previousState: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    const targetId = uuidSchema.parse(formData.get("targetId"));
    const nextRole = roleSchema.parse(formData.get("nextRole"));
    await changeAdminUserRole(targetId, nextRole);
    revalidatePath("/admin/users");
    revalidatePath("/admin/audit");
    return { success: "用户角色已更新。" };
  } catch (error) {
    const authorizationState = authorizationErrorState(error);
    if (authorizationState) return authorizationState;

    if (error instanceof z.ZodError) {
      return { error: "请检查用户角色设置。" };
    }

    if (isLastAdministratorError(error)) {
      return { error: "系统至少需保留一位管理员。" };
    }

    return { error: "修改用户角色失败，请稍后重试。" };
  }
}

export async function updateCommentStatusAction(
  _previousState: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    const commentId = uuidSchema.parse(formData.get("commentId"));
    const status = commentStatusSchema.parse(formData.get("status"));
    await setAdminCommentStatus(commentId, status);
    revalidatePath("/admin/comments");
    return { success: "评论状态已更新。" };
  } catch (error) {
    const authorizationState = authorizationErrorState(error);
    if (authorizationState) return authorizationState;

    if (error instanceof z.ZodError) {
      return { error: "请检查评论审核设置。" };
    }

    if (error instanceof AdminCommentNotFoundError) {
      return { error: "未找到该评论。" };
    }

    return { error: "更新评论状态失败，请稍后重试。" };
  }
}

function isLastAdministratorError(error: unknown): boolean {
  return error instanceof AdminRoleChangeError && error.kind === "last-administrator";
}

function authorizationErrorState(error: unknown): AdminMutationState | null {
  if (error instanceof AuthenticationRequiredError) {
    return { error: "请先登录后再操作。" };
  }

  if (error instanceof AdministratorRequiredError) {
    return { error: "仅管理员可以执行此操作。" };
  }

  return null;
}
