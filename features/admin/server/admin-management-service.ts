import { requireAdministrator } from "@/features/auth/server/auth-service";
import type { UserRole } from "@/features/rbac/domain/role-policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function listAdminUsers() {
  await requireAdministrator();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load users: ${error.message}`);
  }

  return (data ?? []).map((profile) => ({
    id: profile.id as string,
    displayName: profile.display_name as string | null,
    role: profile.role as UserRole,
    createdAt: profile.created_at as string,
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
    throw new Error(`Could not change role: ${error.message}`);
  }
}

export async function listAdminComments() {
  await requireAdministrator();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id, body, status, author_id, content_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Could not load comments: ${error.message}`);
  }

  return (data ?? []).map((comment) => ({
    id: comment.id as string,
    body: comment.body as string,
    status: comment.status as "visible" | "hidden",
    authorId: comment.author_id as string,
    contentId: comment.content_id as string,
    createdAt: comment.created_at as string,
  }));
}

export async function setAdminCommentStatus(
  commentId: string,
  status: "visible" | "hidden",
) {
  await requireAdministrator();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("comments")
    .update({ status })
    .eq("id", commentId);

  if (error) {
    throw new Error(`Could not update comment: ${error.message}`);
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
    throw new Error(`Could not load role audit logs: ${error.message}`);
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
