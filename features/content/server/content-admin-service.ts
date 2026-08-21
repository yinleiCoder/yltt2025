import type { AdminContentDraft } from "@/features/content/domain/content-draft";
import { requireAdministrator } from "@/features/auth/server/auth-service";
import { deleteOssObject } from "@/features/media/server/oss-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const contentIdPattern = /^[0-9a-f-]{36}$/i;

export type AdminContentItem = {
  id: string;
  kind: "photo" | "video" | "story";
  title: string;
  slug: string;
  excerpt: string | null;
  markdownBody: string | null;
  coverObjectKey: string | null;
  isFeatured: boolean;
  publishedAt: string | null;
  locationVisibility: "precise" | "city" | "hidden";
  locationLabel: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  photo: {
    objectKey: string;
    cameraMake: string | null;
    cameraModel: string | null;
    lens: string | null;
    aperture: number | null;
    shutterSpeed: string | null;
    iso: number | null;
    focalLengthMm: number | null;
    capturedAt: string | null;
  } | null;
  video: {
    objectKey: string;
    durationSeconds: number | null;
    codec: string;
  } | null;
};

export async function createAdminContentItem(draft: AdminContentDraft) {
  const administrator = await requireAdministrator();
  const supabase = await createServerSupabaseClient();
  const { data: item, error: itemError } = await supabase
    .from("content_items")
    .insert({
      kind: draft.kind,
      title: draft.title,
      slug: draft.slug,
      excerpt: draft.excerpt || null,
      markdown_body: draft.markdownBody || null,
      cover_object_key: draft.objectKey || null,
      is_featured: draft.isFeatured,
      published_at: draft.publishNow ? new Date().toISOString() : null,
      location_visibility: draft.locationVisibility,
      location_label: draft.locationVisibility === "precise" ? draft.locationLabel ?? null : null,
      city: draft.locationVisibility === "hidden" ? null : draft.city ?? null,
      region: draft.locationVisibility === "hidden" ? null : draft.region ?? null,
      latitude: draft.locationVisibility === "precise" ? draft.latitude ?? null : null,
      longitude: draft.locationVisibility === "precise" ? draft.longitude ?? null : null,
      created_by: administrator.id,
    })
    .select("id")
    .single();

  if (itemError || !item) {
    throw new Error(`Could not create content: ${itemError?.message ?? "unknown error"}`);
  }

  if (draft.kind === "story") {
    return item.id as string;
  }

  const objectKey = draft.objectKey;
  if (!objectKey) {
    throw new Error("Media content requires an object key.");
  }

  const detailsResult = draft.kind === "photo"
    ? await supabase.from("photo_details").insert({
        content_id: item.id,
        object_key: objectKey,
        aperture: draft.aperture ?? null,
        shutter_speed: draft.shutterSpeed ?? null,
        iso: draft.iso ?? null,
        focal_length_mm: draft.focalLengthMm ?? null,
        camera_make: draft.cameraMake ?? null,
        camera_model: draft.cameraModel ?? null,
        lens: draft.lens ?? null,
        captured_at: draft.capturedAt ?? null,
      })
    : await supabase.from("video_details").insert({
        content_id: item.id,
        object_key: objectKey,
        codec: "h264/aac",
      });

  if (detailsResult.error) {
    await supabase.from("content_items").delete().eq("id", item.id);
    await tryDeleteOssObject(objectKey);
    throw new Error(`Could not create media details: ${detailsResult.error.message}`);
  }

  return item.id as string;
}

export async function getAdminContentItem(id: string): Promise<AdminContentItem | null> {
  await requireAdministrator();
  if (!contentIdPattern.test(id)) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("content_items")
    .select(`
      id,
      kind,
      title,
      slug,
      excerpt,
      markdown_body,
      cover_object_key,
      is_featured,
      published_at,
      location_visibility,
      location_label,
      city,
      region,
      latitude,
      longitude,
      photo_details (object_key, camera_make, camera_model, lens, aperture, shutter_speed, iso, focal_length_mm, captured_at),
      video_details (object_key, duration_seconds, codec)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Could not load content item: ${error.message}`);
  if (!data) return null;

  const photo = Array.isArray(data.photo_details) ? data.photo_details[0] : data.photo_details;
  const video = Array.isArray(data.video_details) ? data.video_details[0] : data.video_details;

  return {
    id: data.id as string,
    kind: data.kind as "photo" | "video" | "story",
    title: data.title as string,
    slug: data.slug as string,
    excerpt: data.excerpt as string | null,
    markdownBody: data.markdown_body as string | null,
    coverObjectKey: data.cover_object_key as string | null,
    isFeatured: Boolean(data.is_featured),
    publishedAt: data.published_at as string | null,
    locationVisibility: data.location_visibility as "precise" | "city" | "hidden",
    locationLabel: data.location_label as string | null,
    city: data.city as string | null,
    region: data.region as string | null,
    latitude: data.latitude as number | null,
    longitude: data.longitude as number | null,
    photo: photo ? {
      objectKey: photo.object_key as string,
      cameraMake: photo.camera_make as string | null,
      cameraModel: photo.camera_model as string | null,
      lens: photo.lens as string | null,
      aperture: photo.aperture as number | null,
      shutterSpeed: photo.shutter_speed as string | null,
      iso: photo.iso as number | null,
      focalLengthMm: photo.focal_length_mm as number | null,
      capturedAt: photo.captured_at as string | null,
    } : null,
    video: video ? {
      objectKey: video.object_key as string,
      durationSeconds: video.duration_seconds as number | null,
      codec: video.codec as string,
    } : null,
  };
}

export async function updateAdminContentItem(id: string, draft: AdminContentDraft) {
  await requireAdministrator();
  if (!contentIdPattern.test(id)) throw new Error("Invalid content id.");

  const supabase = await createServerSupabaseClient();
  const existing = await getAdminContentItem(id);
  if (!existing) throw new Error("Content item was not found.");
  if (existing.kind !== draft.kind) {
    throw new Error("The content kind cannot be changed after creation.");
  }

  const publishedAt = draft.publishNow
    ? existing.publishedAt ?? new Date().toISOString()
    : null;
  const nextObjectKey = draft.kind === "story" ? null : draft.objectKey ?? null;

  const { error: itemError } = await supabase
    .from("content_items")
    .update({
      title: draft.title,
      slug: draft.slug,
      excerpt: draft.excerpt || null,
      markdown_body: draft.markdownBody || null,
      cover_object_key: nextObjectKey,
      is_featured: draft.isFeatured,
      published_at: publishedAt,
      location_visibility: draft.locationVisibility,
      location_label: draft.locationVisibility === "precise" ? draft.locationLabel ?? null : null,
      city: draft.locationVisibility === "hidden" ? null : draft.city ?? null,
      region: draft.locationVisibility === "hidden" ? null : draft.region ?? null,
      latitude: draft.locationVisibility === "precise" ? draft.latitude ?? null : null,
      longitude: draft.locationVisibility === "precise" ? draft.longitude ?? null : null,
    })
    .eq("id", id);

  if (itemError) {
    throw new Error(`Could not update content: ${itemError.message}`);
  }

  if (draft.kind === "photo") {
    const { error } = await supabase.from("photo_details").upsert({
      content_id: id,
      object_key: draft.objectKey,
      aperture: draft.aperture ?? null,
      shutter_speed: draft.shutterSpeed ?? null,
      iso: draft.iso ?? null,
      focal_length_mm: draft.focalLengthMm ?? null,
      camera_make: draft.cameraMake ?? null,
      camera_model: draft.cameraModel ?? null,
      lens: draft.lens ?? null,
      captured_at: draft.capturedAt ?? null,
    }, { onConflict: "content_id" });
    if (error) throw new Error(`Could not update photo details: ${error.message}`);
  }

  if (draft.kind === "video") {
    const { error } = await supabase.from("video_details").upsert({
      content_id: id,
      object_key: draft.objectKey,
      codec: "h264/aac",
    }, { onConflict: "content_id" });
    if (error) throw new Error(`Could not update video details: ${error.message}`);
  }

  const previousObjectKey = existing.photo?.objectKey ?? existing.video?.objectKey ?? existing.coverObjectKey;
  const cleanupWarning = previousObjectKey && previousObjectKey !== nextObjectKey
    ? await tryDeleteOssObject(previousObjectKey)
    : undefined;

  return { cleanupWarning, previousSlug: existing.slug };
}

export async function deleteAdminContentItem(id: string) {
  await requireAdministrator();
  if (!contentIdPattern.test(id)) throw new Error("Invalid content id.");

  const supabase = await createServerSupabaseClient();
  const existing = await getAdminContentItem(id);
  if (!existing) throw new Error("Content item was not found.");

  const { error } = await supabase.from("content_items").delete().eq("id", id);
  if (error) throw new Error(`Could not delete content: ${error.message}`);

  const objectKeys = new Set(
    [existing.coverObjectKey, existing.photo?.objectKey, existing.video?.objectKey]
      .filter((value): value is string => Boolean(value)),
  );
  const warnings: string[] = [];
  for (const objectKey of objectKeys) {
    const warning = await tryDeleteOssObject(objectKey);
    if (warning) warnings.push(warning);
  }

  return { warnings };
}

async function tryDeleteOssObject(objectKey: string): Promise<string | undefined> {
  try {
    await deleteOssObject(objectKey);
  } catch (error) {
    return `Database saved, but OSS object cleanup failed for ${objectKey}: ${error instanceof Error ? error.message : "unknown error"}`;
  }
  return undefined;
}
