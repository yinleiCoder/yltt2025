"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AuthenticationRequiredError,
  requireCurrentProfile,
} from "@/features/auth/server/auth-service";
import {
  AvatarObjectKeyError,
  parseOwnedAvatarObjectKey,
} from "@/features/media/domain/upload-policy";
import { createPublicMediaUrl } from "@/features/media/domain/public-media-url";
import { deleteOssObject } from "@/features/media/server/oss-service";
import { revalidateCommentPages } from "@/features/comments/server/revalidate-comment-pages";
import { parseProfileDraft } from "@/features/profile/domain/profile-schema";
import { getPublicMediaBaseUrl } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ProfileMutationState = {
  error?: string;
  success?: string;
};

export async function updateProfileAction(
  _previousState: ProfileMutationState,
  formData: FormData,
): Promise<ProfileMutationState> {
  let uploadedAvatarObjectKey: string | null | undefined = null;

  try {
    const currentProfile = await requireCurrentProfile();
    const draft = parseProfileDraft(readProfileDraft(formData));
    const avatarObjectKey = resolveAvatarObjectKey(formData.get("avatarObjectKey"), currentProfile.id);
    uploadedAvatarObjectKey = avatarObjectKey;
    const avatarUrl = resolveAvatarUrl(avatarObjectKey);
    const previousAvatarObjectKey = parseAvatarObjectKeyFromUrl(currentProfile.avatarUrl, currentProfile.id);
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        display_name: draft.displayName,
        real_name: draft.realName,
        phone: draft.phone,
        address: draft.address,
        gender: draft.gender,
        public_gender: draft.publicGender,
        public_real_name: draft.publicRealName,
        public_phone: draft.publicPhone,
        public_address: draft.publicAddress,
        public_email: draft.publicEmail ?? false,
        ...(avatarUrl === undefined ? {} : { avatar_url: avatarUrl }),
      })
      .eq("id", currentProfile.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      await tryDeleteAvatarObject(uploadedAvatarObjectKey);
      uploadedAvatarObjectKey = null;
      if (error) throw error;
      return { error: "未找到需要更新的个人资料。" };
    }

    const cleanupFailed =
      previousAvatarObjectKey !== null &&
      avatarObjectKey !== undefined &&
      previousAvatarObjectKey !== avatarObjectKey &&
      !(await tryDeleteAvatarObject(previousAvatarObjectKey));
    uploadedAvatarObjectKey = null;

    revalidatePath("/profile");
    revalidatePath("/", "layout");
    revalidateCommentPages();
    return {
      success: cleanupFailed
        ? "个人资料已保存，但旧头像清理失败。"
        : "个人资料已保存。",
    };
  } catch (error) {
    await tryDeleteAvatarObject(uploadedAvatarObjectKey);

    if (error instanceof AuthenticationRequiredError) {
      return { error: "请先登录后再保存个人资料。" };
    }

    if (error instanceof z.ZodError) {
      return { error: "请检查个人资料填写内容。" };
    }

    if (error instanceof AvatarObjectKeyError) {
      return { error: "头像引用无效。" };
    }

    return { error: profileMutationErrorMessage(error) };
  }
}

function profileMutationErrorMessage(error: unknown): string {
  if (isSupabaseErrorCode(error, "42703", "PGRST204")) {
    return "个人资料数据库结构未更新，请联系管理员。";
  }

  if (isSupabaseErrorCode(error, "42501")) {
    return "个人资料保存权限未配置，请联系管理员。";
  }

  if (isSupabaseErrorCode(error, "23514")) {
    return "请检查个人资料填写内容。";
  }

  return "无法保存个人资料，请稍后重试。";
}

function isSupabaseErrorCode(error: unknown, ...codes: string[]): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    codes.includes(error.code)
  );
}

function readProfileDraft(formData: FormData) {
  return {
    displayName: formData.get("displayName"),
    realName: formData.get("realName"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    gender: nullableValue(formData.get("gender")),
    publicGender: formData.get("publicGender") === "on",
    publicRealName: formData.get("publicRealName") === "on",
    publicPhone: formData.get("publicPhone") === "on",
    publicAddress: formData.get("publicAddress") === "on",
    publicEmail: formData.get("publicEmail") === "on",
  };
}

function nullableValue(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

function resolveAvatarObjectKey(value: FormDataEntryValue | null, profileId: string): string | null | undefined {
  if (value === null) return undefined;
  if (value === "") return null;

  return parseOwnedAvatarObjectKey(value, profileId);
}

function resolveAvatarUrl(objectKey: string | null | undefined): string | null | undefined {
  if (objectKey === undefined) return undefined;
  if (objectKey === null) return null;

  const baseUrl = getPublicMediaBaseUrl();

  if (!baseUrl) {
    throw new Error("Public media URL is not configured.");
  }

  return createPublicMediaUrl({ baseUrl, objectKey });
}

function parseAvatarObjectKeyFromUrl(value: string | null, profileId: string): string | null {
  if (!value) return null;

  try {
    const pathnameSegments = new URL(value).pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
    const avatarSegmentIndex = pathnameSegments.indexOf("avatars");
    if (avatarSegmentIndex === -1) return null;

    return parseOwnedAvatarObjectKey(
      pathnameSegments.slice(avatarSegmentIndex).join("/"),
      profileId,
    );
  } catch {
    return null;
  }
}

async function tryDeleteAvatarObject(objectKey: string | null | undefined): Promise<boolean> {
  if (!objectKey) return true;

  try {
    await deleteOssObject(objectKey);
    return true;
  } catch {
    return false;
  }
}
