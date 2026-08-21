"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  changeAdminUserRole,
  setAdminCommentStatus,
} from "@/features/admin/server/admin-management-service";

const uuidSchema = z.string().uuid();
const roleSchema = z.enum(["user", "admin"]);
const commentStatusSchema = z.enum(["visible", "hidden"]);

export async function changeUserRoleAction(formData: FormData) {
  const targetId = uuidSchema.parse(formData.get("targetId"));
  const nextRole = roleSchema.parse(formData.get("nextRole"));
  await changeAdminUserRole(targetId, nextRole);
  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
}

export async function updateCommentStatusAction(formData: FormData) {
  const commentId = uuidSchema.parse(formData.get("commentId"));
  const status = commentStatusSchema.parse(formData.get("status"));
  await setAdminCommentStatus(commentId, status);
  revalidatePath("/admin/comments");
}
