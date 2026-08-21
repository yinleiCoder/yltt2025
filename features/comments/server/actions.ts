"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireCurrentProfile } from "@/features/auth/server/auth-service";
import { parseCommentBody, parseCommentDraft } from "@/features/comments/domain/comment-draft";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const commentIdSchema = z.string().uuid();

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

    revalidatePath("/photography/[slug]", "page");
    revalidatePath("/videos/[slug]", "page");
    revalidatePath("/stories/[slug]", "page");
    return { success: "Comment published." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not publish comment." };
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
    if (!data) return { error: "Comment was not found or does not belong to you." };
    revalidateCommentPages();
    return { success: "Comment updated." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update comment." };
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
    if (!data) return { error: "Comment was not found or does not belong to you." };
    revalidateCommentPages();
    return { success: "Comment deleted." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete comment." };
  }
}

function revalidateCommentPages() {
  revalidatePath("/photography/[slug]", "page");
  revalidatePath("/videos/[slug]", "page");
  revalidatePath("/stories/[slug]", "page");
}
