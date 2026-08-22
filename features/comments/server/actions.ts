"use server";

import { z } from "zod";

import { requireCurrentProfile } from "@/features/auth/server/auth-service";
import { parseCommentBody, parseCommentDraft } from "@/features/comments/domain/comment-draft";
import { revalidateCommentPages } from "@/features/comments/server/revalidate-comment-pages";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const commentIdSchema = z.string().uuid();

const commentActionMessages = {
  publishFailed: "发表评论失败，请稍后重试。",
  updateFailed: "编辑评论失败，请稍后重试。",
  deleteFailed: "删除评论失败，请稍后重试。",
  unavailable: "未找到评论或无权操作。",
  published: "评论已发布。",
  updated: "评论已更新。",
  deleted: "评论已删除。",
} as const;

export type CommentMutationState = {
  error?: string;
  success?: string;
};

export async function addCommentAction(
  _previousState: { error?: string; success?: string },
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  try {
    const profile = await requireCurrentProfile();
    const draft = parseCommentDraft({
      contentId: formData.get("contentId"),
      body: formData.get("body"),
    });
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("comments").insert({
      content_id: draft.contentId,
      author_id: profile.id,
      body: draft.body,
      status: "visible",
    });

    if (error) throw new Error(error.message);

    revalidateCommentPages();
    return { success: commentActionMessages.published };
  } catch {
    return { error: commentActionMessages.publishFailed };
  }
}
export async function updateCommentAction(formData: FormData): Promise<CommentMutationState> {
  try {
    const profile = await requireCurrentProfile();
    const commentId = commentIdSchema.parse(formData.get("commentId"));
    const body = parseCommentBody(formData.get("body"));
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("comments")
      .update({ body })
      .eq("id", commentId)
      .eq("author_id", profile.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { error: commentActionMessages.unavailable };
    revalidateCommentPages();
    return { success: commentActionMessages.updated };
  } catch {
    return { error: commentActionMessages.updateFailed };
  }
}

export async function deleteCommentAction(formData: FormData): Promise<CommentMutationState> {
  try {
    const profile = await requireCurrentProfile();
    const commentId = commentIdSchema.parse(formData.get("commentId"));
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("author_id", profile.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { error: commentActionMessages.unavailable };
    revalidateCommentPages();
    return { success: commentActionMessages.deleted };
  } catch {
    return { error: commentActionMessages.deleteFailed };
  }
}
