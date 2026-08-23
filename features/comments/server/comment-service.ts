import { hasPublicSupabaseEnvironment } from "@/lib/env";
import {
  getCurrentProfileDetails,
  listAdministratorProfileDetails,
  listPublicProfiles,
} from "@/features/profile/server/profile-service";
import type { CurrentProfileDetails } from "@/features/profile/server/profile-service";
import { getCurrentProfile } from "@/features/auth/server/auth-service";
import type {
  CommentProfile,
  PublicProfile,
} from "@/features/profile/domain/public-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CommentAuthor = CommentProfile;

export type PublicComment = {
  id: string;
  authorId: string;
  author: CommentAuthor | null;
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

  const comments = (data ?? []).map((comment) => ({
    id: comment.id as string,
    authorId: typeof comment.author_id === "string" ? comment.author_id : "",
    body: comment.body as string,
    createdAt: comment.created_at as string,
  }));

  const authorIds = [...new Set(comments.map((comment) => comment.authorId).filter(Boolean))];
  const currentProfile = await getCurrentProfile();

  if (currentProfile?.role === "admin") {
    const profiles = authorIds.length > 0
      ? await listAdministratorProfileDetails(authorIds)
      : [];
    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

    return comments.map((comment) => ({
      ...comment,
      author: toFullCommentAuthor(profilesById.get(comment.authorId)),
    }));
  }

  const hasOwnComment = Boolean(currentProfile && authorIds.includes(currentProfile.id));
  const [profiles, ownProfile] = await Promise.all([
    authorIds.length > 0 ? listPublicProfiles(authorIds) : Promise.resolve([]),
    hasOwnComment ? getCurrentProfileDetails() : Promise.resolve(null),
  ]);
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return comments.map((comment) => ({
    ...comment,
    author: ownProfile?.id === comment.authorId
      ? toFullCommentAuthor(ownProfile)
      : toCommentAuthor(profilesById.get(comment.authorId)),
  }));
}

function toCommentAuthor(profile: PublicProfile | undefined): CommentAuthor | null {
  if (!profile) return null;

  return {
    id: profile.id,
    avatarUrl: profile.avatarUrl,
    displayName: profile.displayName,
    ...(publicText(profile.email) ? { email: publicText(profile.email) } : {}),
    ...(isValidAge(profile.age) ? { age: profile.age } : {}),
    ...(profile.gender ? { gender: profile.gender } : {}),
    ...(publicText(profile.realName) ? { realName: publicText(profile.realName) } : {}),
    ...(publicText(profile.phone) ? { phone: publicText(profile.phone) } : {}),
    ...(publicText(profile.address) ? { address: publicText(profile.address) } : {}),
    canViewFullProfile: false,
  };
}

function toFullCommentAuthor(profile: CurrentProfileDetails | undefined): CommentAuthor | null {
  if (!profile) return null;

  return {
    id: profile.id,
    avatarUrl: profile.avatarUrl,
    displayName: profile.displayName,
    ...(privateText(profile.email) ? { email: privateText(profile.email) } : {}),
    ...(ageFromBirthDate(profile.birthDate) !== undefined
      ? { age: ageFromBirthDate(profile.birthDate) }
      : {}),
    ...(profile.gender ? { gender: profile.gender } : {}),
    ...(privateText(profile.realName) ? { realName: privateText(profile.realName) } : {}),
    ...(privateText(profile.phone) ? { phone: privateText(profile.phone) } : {}),
    ...(privateText(profile.address) ? { address: privateText(profile.address) } : {}),
    canViewFullProfile: true,
  };
}

function publicText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function privateText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function isValidAge(value: number | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function ageFromBirthDate(value: string | null): number | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;

  const birthDate = new Date(`${normalized}T00:00:00Z`);
  const today = new Date();
  if (Number.isNaN(birthDate.getTime()) || birthDate > today) return undefined;

  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const hasBirthdayPassed =
    today.getUTCMonth() > birthDate.getUTCMonth() ||
    (today.getUTCMonth() === birthDate.getUTCMonth() &&
      today.getUTCDate() >= birthDate.getUTCDate());
  if (!hasBirthdayPassed) age -= 1;

  return age >= 0 ? age : undefined;
}
