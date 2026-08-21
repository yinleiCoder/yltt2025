import { requireAdministrator } from "@/features/auth/server/auth-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminDashboardData = {
  contentCount: number;
  commentCount: number;
  userCount: number;
  recentContent: Array<{
    id: string;
    title: string;
    kind: string;
    publishedAt: string | null;
  }>;
};

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  await requireAdministrator();
  const supabase = await createServerSupabaseClient();

  const [contentResult, commentResult, profileResult, recentContentResult] =
    await Promise.all([
      supabase.from("content_items").select("id", { count: "exact", head: true }),
      supabase.from("comments").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("content_items")
        .select("id, title, kind, published_at")
        .order("updated_at", { ascending: false })
        .limit(8),
    ]);

  const failedResult = [
    contentResult,
    commentResult,
    profileResult,
    recentContentResult,
  ].find((result) => result.error);

  if (failedResult?.error) {
    throw new Error(`Could not load the admin dashboard: ${failedResult.error.message}`);
  }

  return {
    contentCount: contentResult.count ?? 0,
    commentCount: commentResult.count ?? 0,
    userCount: profileResult.count ?? 0,
    recentContent: (recentContentResult.data ?? []).map((item) => ({
      id: item.id as string,
      title: item.title as string,
      kind: item.kind as string,
      publishedAt: item.published_at as string | null,
    })),
  };
}
