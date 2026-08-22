import { requireAdministrator } from "@/features/auth/server/auth-service";
import type { UserRole } from "@/features/rbac/domain/role-policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export class AdminRoleChangeError extends Error {
  constructor(
    public readonly kind: "last-administrator" | "other",
    message: string,
  ) {
    super(message);
    this.name = "AdminRoleChangeError";
  }
}

export class AdminCommentNotFoundError extends Error {
  constructor() {
    super("未找到该评论。");
    this.name = "AdminCommentNotFoundError";
  }
}

export async function listAdminUsers() {
  await requireAdministrator();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, avatar_url, display_name, role, created_at, public_gender, public_real_name, public_phone, public_address, real_name, phone, address, gender",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`无法加载用户资料：${error.message}`);
  }

  return (data ?? []).map((profile) => ({
    id: profile.id as string,
    avatarUrl: profile.avatar_url as string | null,
    displayName: profile.display_name as string | null,
    role: profile.role as UserRole,
    createdAt: profile.created_at as string,
    publicProfile: {
      gender: profile.public_gender as boolean,
      realName: profile.public_real_name as boolean,
      phone: profile.public_phone as boolean,
      address: profile.public_address as boolean,
    },
    details: {
      realName: profile.real_name as string | null,
      phone: profile.phone as string | null,
      address: profile.address as string | null,
      gender: profile.gender as "male" | "female" | "other" | "unknown" | null,
    },
  }));
}

export async function changeAdminUserRole(targetId: string, nextRole: UserRole) {
  await requireAdministrator();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_change_user_role", {
    target_profile_id: targetId,
    next_role: nextRole,
  });

  if (error) {
    if (/last administrator/i.test(error.message)) {
      throw new AdminRoleChangeError("last-administrator", "无法降级最后一位管理员。");
    }

    throw new AdminRoleChangeError("other", "修改用户角色失败。");
  }
}

export async function listAdminComments() {
  await requireAdministrator();
  const supabase = await createServerSupabaseClient();
  const { data: comments, error: commentsError } = await supabase
    .from("comments")
    .select("id, body, status, author_id, content_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (commentsError) {
    throw new Error(`无法加载评论：${commentsError.message}`);
  }

  if (!comments?.length) {
    return [];
  }

  const authorIds = [...new Set(comments.map((comment) => comment.author_id as string))];
  const contentIds = [...new Set(comments.map((comment) => comment.content_id as string))];

  const [profilesResult, contentResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, avatar_url, display_name")
      .in("id", authorIds),
    supabase.from("content_items").select("id, title").in("id", contentIds),
  ]);

  if (profilesResult.error) {
    throw new Error(`无法加载评论作者：${profilesResult.error.message}`);
  }

  if (contentResult.error) {
    throw new Error(`无法加载评论关联内容：${contentResult.error.message}`);
  }

  const authors = new Map(
    (profilesResult.data ?? []).map((profile) => [
      profile.id as string,
      {
        avatarUrl: profile.avatar_url as string | null,
        displayName: profile.display_name as string | null,
      },
    ]),
  );
  const contentTitles = new Map(
    (contentResult.data ?? []).map((content) => [content.id as string, content.title as string]),
  );

  return comments.map((comment) => ({
    id: comment.id as string,
    body: comment.body as string,
    status: comment.status as "visible" | "hidden",
    authorId: comment.author_id as string,
    contentId: comment.content_id as string,
    createdAt: comment.created_at as string,
    author: authors.get(comment.author_id as string) ?? {
      avatarUrl: null,
      displayName: null,
    },
    contentTitle: contentTitles.get(comment.content_id as string) ?? "内容已不存在",
  }));
}

export async function setAdminCommentStatus(
  commentId: string,
  status: "visible" | "hidden",
) {
  await requireAdministrator();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("comments")
    .update({ status })
    .eq("id", commentId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("更新评论状态失败。");
  }

  if (!data) {
    throw new AdminCommentNotFoundError();
  }
}

export async function listRoleAuditLogs() {
  await requireAdministrator();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("role_audit_logs")
    .select("id, actor_id, target_id, previous_role, next_role, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error("无法加载审计日志。");
  }

  return (data ?? []).map((entry) => ({
    id: entry.id as string,
    actorId: entry.actor_id as string,
    targetId: entry.target_id as string,
    previousRole: entry.previous_role as UserRole,
    nextRole: entry.next_role as UserRole,
    createdAt: entry.created_at as string,
  }));
}
