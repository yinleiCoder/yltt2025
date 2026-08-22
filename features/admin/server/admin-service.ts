import { requireAdministrator } from "@/features/auth/server/auth-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminDashboardData = {
  contentCount: number;
  commentCount: number;
  userCount: number;
  userAvatars: Array<{ avatarUrl: string | null; displayName: string | null }>;
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
  const recentUsersResult = await (async () => {
    try {
      return await supabase.from("profiles").select("avatar_url, display_name").order("created_at", { ascending: false }).limit(8);
    } catch {
      return { data: [], error: null };
    }
  })();

  const failedResult = [
    contentResult,
    commentResult,
    profileResult,
    recentContentResult,
  ].find((result) => result.error);

  if (failedResult?.error) {
    throw new Error(`无法加载后台概览：${failedResult.error.message}`);
  }

  return {
    contentCount: contentResult.count ?? 0,
    commentCount: commentResult.count ?? 0,
    userCount: profileResult.count ?? 0,
    userAvatars: (recentUsersResult.data ?? []).map((user) => ({ avatarUrl: user.avatar_url as string | null, displayName: user.display_name as string | null })),
    recentContent: (recentContentResult.data ?? []).map((item) => ({
      id: item.id as string,
      title: item.title as string,
      kind: item.kind as string,
      publishedAt: item.published_at as string | null,
    })),
  };
}
