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

function optionalText(value: FormDataEntryValue | null | undefined) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function optionalNumber(value: FormDataEntryValue | null | undefined) {
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
    const id = String(readFormValue(formData, "id") ?? "");
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
  const id = String(readFormValue(formData, "id") ?? "");
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
    kind: readFormValue(formData, "kind"),
    title: readFormValue(formData, "title"),
    slug: readFormValue(formData, "slug"),
    excerpt: optionalText(readFormValue(formData, "excerpt")),
    markdownBody: optionalText(readFormValue(formData, "markdownBody")),
    isFeatured: readFormValue(formData, "isFeatured") === "on",
    publishNow: readFormValue(formData, "publishNow") === "on",
    objectKey: optionalText(readFormValue(formData, "objectKey")),
    storyImageObjectKeys: readFormValues(formData, "storyImageObjectKey").map(String),
    aperture: optionalNumber(readFormValue(formData, "aperture")),
    shutterSpeed: optionalText(readFormValue(formData, "shutterSpeed")),
    iso: optionalNumber(readFormValue(formData, "iso")),
    focalLengthMm: optionalNumber(readFormValue(formData, "focalLengthMm")),
    cameraMake: optionalText(readFormValue(formData, "cameraMake")),
    cameraModel: optionalText(readFormValue(formData, "cameraModel")),
    lens: optionalText(readFormValue(formData, "lens")),
    capturedAt: optionalText(readFormValue(formData, "capturedAt")),
    locationVisibility: readFormValue(formData, "locationVisibility") ?? "hidden",
    locationLabel: optionalText(readFormValue(formData, "locationLabel")),
    city: optionalText(readFormValue(formData, "city")),
    region: optionalText(readFormValue(formData, "region")),
    latitude: optionalNumber(readFormValue(formData, "latitude")),
    longitude: optionalNumber(readFormValue(formData, "longitude")),
  };
}

function readFormValue(formData: FormData, name: string) {
  const direct = formData.get(name);
  if (direct !== null) return direct;

  for (const key of formData.keys()) {
    if (/^_\d+_/.test(key) && key.slice(key.indexOf("_", 1) + 1) === name) {
      return formData.get(key);
    }
  }

  return undefined;
}

function readFormValues(formData: FormData, name: string) {
  const direct = formData.getAll(name);
  if (direct.length) return direct;

  const values: FormDataEntryValue[] = [];
  for (const key of formData.keys()) {
    if (/^_\d+_/.test(key) && key.slice(key.indexOf("_", 1) + 1) === name) {
      values.push(...formData.getAll(key));
    }
  }
  return values;
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
