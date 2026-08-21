import { hasPublicSupabaseEnvironment } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PublicComment = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export type AddCommentState = {
  error?: string;
  success?: string;
};

export async function listPublicComments(contentId: string): Promise<PublicComment[]> {
  if (!hasPublicSupabaseEnvironment()) return [];

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id, author_id, body, created_at")
    .eq("content_id", contentId)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(`Could not load comments: ${error.message}`);

  return (data ?? []).map((comment) => ({
    id: comment.id as string,
    authorId: comment.author_id as string,
    body: comment.body as string,
    createdAt: comment.created_at as string,
  }));
}
