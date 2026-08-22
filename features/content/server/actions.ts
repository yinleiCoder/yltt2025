"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { parseAdminContentDraft } from "@/features/content/domain/content-draft";
import {
  createAdminContentItem,
  deleteAdminContentItem,
  updateAdminContentItem,
} from "@/features/content/server/content-admin-service";

export type CreateContentState = {
  error?: string;
  success?: string;
  publicPath?: string;
  warning?: string;
};

export type UpdateContentState = CreateContentState;

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const text = optionalText(value);
  return text ? Number(text) : undefined;
}

export async function createContentAction(
  _previousState: CreateContentState,
  formData: FormData,
): Promise<CreateContentState> {
  try {
    const draft = parseAdminContentDraft(readDraftFormData(formData));
    const created = await createAdminContentItem(draft);
    revalidateContentPaths(draft.kind, created.slug);

    return {
      success: draft.publishNow ? "内容已创建并发布。" : "内容已保存为草稿。",
      publicPath: draft.publishNow ? publicPathFor(draft.kind, created.slug) : undefined,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: "请检查内容填写是否完整、格式是否正确。" };
    }

    return { error: "创建内容失败，请稍后重试。" };
  }
}

export async function updateContentAction(
  _previousState: UpdateContentState,
  formData: FormData,
): Promise<UpdateContentState> {
  try {
    const id = String(formData.get("id") ?? "");
    const draft = parseAdminContentDraft(readDraftFormData(formData));
    const result = await updateAdminContentItem(id, draft);
    revalidateContentPaths(draft.kind, result.slug, result.previousSlug);

    return {
      success: draft.publishNow ? "内容已更新并发布。" : "内容已保存为草稿。",
      warning: result.cleanupWarning ? "内容已保存，但原媒体文件清理失败。" : undefined,
      publicPath: draft.publishNow ? publicPathFor(draft.kind, result.slug) : undefined,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: "请检查内容填写是否完整、格式是否正确。" };
    }

    return { error: "保存内容失败，请稍后重试。" };
  }
}

export async function deleteContentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const result = await deleteAdminContentItem(id);

  revalidatePath("/admin");
  revalidatePath("/photography");
  revalidatePath("/videos");
  revalidatePath("/stories");

  if (result.warnings.length) revalidatePath(`/admin/content/${id}`);
  redirect("/admin");
}

function readDraftFormData(formData: FormData) {
  return {
    kind: formData.get("kind"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    excerpt: optionalText(formData.get("excerpt")),
    markdownBody: optionalText(formData.get("markdownBody")),
    isFeatured: formData.get("isFeatured") === "on",
    publishNow: formData.get("publishNow") === "on",
    objectKey: optionalText(formData.get("objectKey")),
    aperture: optionalNumber(formData.get("aperture")),
    shutterSpeed: optionalText(formData.get("shutterSpeed")),
    iso: optionalNumber(formData.get("iso")),
    focalLengthMm: optionalNumber(formData.get("focalLengthMm")),
    cameraMake: optionalText(formData.get("cameraMake")),
    cameraModel: optionalText(formData.get("cameraModel")),
    lens: optionalText(formData.get("lens")),
    capturedAt: optionalText(formData.get("capturedAt")),
    locationVisibility: formData.get("locationVisibility") ?? "hidden",
    locationLabel: optionalText(formData.get("locationLabel")),
    city: optionalText(formData.get("city")),
    region: optionalText(formData.get("region")),
    latitude: optionalNumber(formData.get("latitude")),
    longitude: optionalNumber(formData.get("longitude")),
  };
}

function publicPathFor(kind: "photo" | "video" | "story", slug: string) {
  return `/${kind === "photo" ? "photography" : kind === "video" ? "videos" : "stories"}/${slug}`;
}

function revalidateContentPaths(kind: "photo" | "video" | "story", slug: string, previousSlug?: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/content`);
  revalidatePath("/");
  revalidatePath("/photography");
  revalidatePath("/videos");
  revalidatePath("/stories");
  revalidatePath(publicPathFor(kind, slug));
  if (previousSlug && previousSlug !== slug) revalidatePath(publicPathFor(kind, previousSlug));
}
