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
    await createAdminContentItem(draft);
    revalidateContentPaths(draft.kind, draft.slug);

    return {
      success: draft.publishNow ? "Content item created and published." : "Content item saved as a draft.",
      publicPath: draft.publishNow ? publicPathFor(draft.kind, draft.slug) : undefined,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message ?? "Check the content fields." };
    }

    return {
      error: error instanceof Error ? error.message : "Could not create content.",
    };
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
    revalidateContentPaths(draft.kind, draft.slug, result.previousSlug);

    return {
      success: draft.publishNow ? "Content item updated and published." : "Content item updated as a draft.",
      warning: result.cleanupWarning,
      publicPath: draft.publishNow ? publicPathFor(draft.kind, draft.slug) : undefined,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message ?? "Check the content fields." };
    }

    return {
      error: error instanceof Error ? error.message : "Could not update content.",
    };
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
