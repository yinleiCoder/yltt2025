import type { AdminContentDraft } from "@/features/content/domain/content-draft";
import { requireAdministrator } from "@/features/auth/server/auth-service";
import { deleteOssObject } from "@/features/media/server/oss-service";
import { createPublicMediaUrl } from "@/features/media/domain/public-media-url";
import { getPublicMediaBaseUrl } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const contentIdPattern = /^[0-9a-f-]{36}$/i;

export type AdminContentListItem = {
  id: string;
  title: string;
  slug: string;
  kind: "photo" | "video" | "story";
  publishedAt: string | null;
  occurredAt: string | null;
  updatedAt: string;
};

export async function getAdminContentItems(): Promise<AdminContentListItem[]> {
  await requireAdministrator();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("id, title, slug, kind, published_at, occurred_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw new Error("加载内容列表失败。");

  return (data ?? []).map((item) => ({
    id: item.id as string,
    title: item.title as string,
    slug: item.slug as string,
    kind: item.kind as AdminContentListItem["kind"],
    publishedAt: item.published_at as string | null,
    occurredAt: item.occurred_at as string | null,
    updatedAt: item.updated_at as string,
  }));
}

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
  occurredAt: string | null;
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
    width: number | null;
    height: number | null;
    codec: string;
  } | null;
  storyImages: { objectKey: string; sortOrder: number; imageUrl: string | null }[];
};

export async function createAdminContentItem(draft: AdminContentDraft) {
  const administrator = await requireAdministrator();
  const supabase = await createServerSupabaseClient();
  const generatedSlug = crypto.randomUUID();
  const { data: item, error: itemError } = await supabase
    .from("content_items")
    .insert({
      kind: draft.kind,
      title: draft.title,
      slug: generatedSlug,
      excerpt: draft.excerpt || null,
      markdown_body: draft.markdownBody || null,
      cover_object_key: draft.objectKey || null,
      is_featured: draft.isFeatured,
      published_at: draft.publishNow ? new Date().toISOString() : null,
      occurred_at: draft.kind === "story" ? draft.occurredAt ?? null : null,
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
    if (draft.kind === "story") for (const objectKey of draft.storyImageObjectKeys) await tryDeleteOssObject(objectKey);
    throw new Error("创建内容失败。");
  }

  if (draft.kind === "story") {
    if (draft.storyImageObjectKeys.length) {
      const { error } = await supabase.from("story_images").insert(draft.storyImageObjectKeys.map((objectKey, sortOrder) => ({ content_id: item.id, object_key: objectKey, sort_order: sortOrder })));
      if (error) {
        await supabase.from("content_items").delete().eq("id", item.id);
        for (const objectKey of draft.storyImageObjectKeys) await tryDeleteOssObject(objectKey);
        throw new Error("创建故事图片失败。");
      }
    }
    return { id: item.id as string, slug: generatedSlug };
  }

  const objectKey = draft.objectKey;
  if (!objectKey) {
    throw new Error("媒体内容缺少媒体对象标识。");
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
        duration_seconds: draft.durationSeconds ?? null,
        width: draft.width ?? null,
        height: draft.height ?? null,
      });

  if (detailsResult.error) {
    await supabase.from("content_items").delete().eq("id", item.id);
    await tryDeleteOssObject(objectKey);
    throw new Error("创建媒体详情失败。");
  }

  return { id: item.id as string, slug: generatedSlug };
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
      occurred_at,
      location_visibility,
      location_label,
      city,
      region,
      latitude,
      longitude,
      photo_details (object_key, camera_make, camera_model, lens, aperture, shutter_speed, iso, focal_length_mm, captured_at),
      video_details (object_key, duration_seconds, width, height, codec),
      story_images (object_key, sort_order)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error("加载内容失败。");
  if (!data) return null;

  const photo = Array.isArray(data.photo_details) ? data.photo_details[0] : data.photo_details;
  const video = Array.isArray(data.video_details) ? data.video_details[0] : data.video_details;
  const storyImages = Array.isArray(data.story_images) ? data.story_images : [];
  const mediaBaseUrl = getPublicMediaBaseUrl();

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
    occurredAt: data.occurred_at as string | null,
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
      width: video.width as number | null,
      height: video.height as number | null,
      codec: video.codec as string,
    } : null,
    storyImages: storyImages.map((image) => ({
      objectKey: image.object_key as string,
      sortOrder: Number(image.sort_order),
      imageUrl: mediaBaseUrl ? createPublicMediaUrl({ baseUrl: mediaBaseUrl, objectKey: image.object_key as string, imageWidth: 800 }) : null,
    })),
  };
}

export async function updateAdminContentItem(id: string, draft: AdminContentDraft) {
  await requireAdministrator();
  if (!contentIdPattern.test(id)) throw new Error("内容标识无效。");

  const supabase = await createServerSupabaseClient();
  const existing = await getAdminContentItem(id);
  if (!existing) throw new Error("未找到该内容。");
  if (existing.kind !== draft.kind) {
    throw new Error("内容创建后不能更改类型。");
  }

  const publishedAt = draft.publishNow
    ? existing.publishedAt ?? new Date().toISOString()
    : null;
  const nextObjectKey = draft.kind === "story" ? null : draft.objectKey ?? null;

  const { error: itemError } = await supabase
    .from("content_items")
    .update({
      title: draft.title,
      slug: existing.slug,
      excerpt: draft.excerpt || null,
      markdown_body: draft.markdownBody || null,
      cover_object_key: nextObjectKey,
      is_featured: draft.isFeatured,
      published_at: publishedAt,
      occurred_at: draft.kind === "story" ? draft.occurredAt ?? null : null,
      location_visibility: draft.locationVisibility,
      location_label: draft.locationVisibility === "precise" ? draft.locationLabel ?? null : null,
      city: draft.locationVisibility === "hidden" ? null : draft.city ?? null,
      region: draft.locationVisibility === "hidden" ? null : draft.region ?? null,
      latitude: draft.locationVisibility === "precise" ? draft.latitude ?? null : null,
      longitude: draft.locationVisibility === "precise" ? draft.longitude ?? null : null,
    })
    .eq("id", id);

  if (itemError) {
    throw new Error("更新内容失败。");
  }

  try {
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
      if (error) throw new Error("更新摄影详情失败。");
    }

    if (draft.kind === "video") {
      const replacingVideo = draft.objectKey !== existing.video?.objectKey;
      const { error } = await supabase.from("video_details").upsert({
        content_id: id,
        object_key: draft.objectKey,
        codec: "h264/aac",
        duration_seconds: replacingVideo ? draft.durationSeconds ?? null : existing.video?.durationSeconds ?? null,
        width: replacingVideo ? draft.width ?? null : existing.video?.width ?? null,
        height: replacingVideo ? draft.height ?? null : existing.video?.height ?? null,
      }, { onConflict: "content_id" });
      if (error) throw new Error("更新视频详情失败。");
    }

    let cleanupWarning: string | undefined;
    if (draft.kind === "story") {
      const previousKeys = new Set(existing.storyImages.map((image) => image.objectKey));
      const { error } = await supabase.from("story_images").delete().eq("content_id", id);
      if (error) throw new Error("更新故事图片失败。");
      if (draft.storyImageObjectKeys.length) {
        const { error: insertError } = await supabase.from("story_images").insert(draft.storyImageObjectKeys.map((objectKey, sortOrder) => ({ content_id: id, object_key: objectKey, sort_order: sortOrder })));
        if (insertError) throw new Error("更新故事图片失败。");
      }
      const nextKeys = new Set(draft.storyImageObjectKeys);
      for (const objectKey of previousKeys) if (!nextKeys.has(objectKey)) cleanupWarning = await tryDeleteOssObject(objectKey) ?? cleanupWarning;
    }

    const previousObjectKey = existing.photo?.objectKey ?? existing.video?.objectKey ?? existing.coverObjectKey;
    cleanupWarning = previousObjectKey && previousObjectKey !== nextObjectKey
      ? await tryDeleteOssObject(previousObjectKey)
      : cleanupWarning;

    return { cleanupWarning, previousSlug: existing.slug, slug: existing.slug };
  } catch (error) {
    await restoreContentUpdate(supabase, existing);
    throw error;
  }
}

async function restoreContentUpdate(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, existing: AdminContentItem) {
  await supabase.from("content_items").update({
    title: existing.title,
    slug: existing.slug,
    excerpt: existing.excerpt,
    markdown_body: existing.markdownBody,
    cover_object_key: existing.coverObjectKey,
    is_featured: existing.isFeatured,
    published_at: existing.publishedAt,
    occurred_at: existing.occurredAt,
    location_visibility: existing.locationVisibility,
    location_label: existing.locationLabel,
    city: existing.city,
    region: existing.region,
    latitude: existing.latitude,
    longitude: existing.longitude,
  }).eq("id", existing.id);

  if (existing.kind === "photo" && existing.photo) {
    await supabase.from("photo_details").upsert({
      content_id: existing.id,
      object_key: existing.photo.objectKey,
      camera_make: existing.photo.cameraMake,
      camera_model: existing.photo.cameraModel,
      lens: existing.photo.lens,
      aperture: existing.photo.aperture,
      shutter_speed: existing.photo.shutterSpeed,
      iso: existing.photo.iso,
      focal_length_mm: existing.photo.focalLengthMm,
      captured_at: existing.photo.capturedAt,
    }, { onConflict: "content_id" });
  }

  if (existing.kind === "video" && existing.video) {
    await supabase.from("video_details").upsert({
      content_id: existing.id,
      object_key: existing.video.objectKey,
      codec: existing.video.codec,
      duration_seconds: existing.video.durationSeconds,
      width: existing.video.width,
      height: existing.video.height,
    }, { onConflict: "content_id" });
  }

  if (existing.kind === "story") {
    await supabase.from("story_images").delete().eq("content_id", existing.id);
    if (existing.storyImages.length) {
      await supabase.from("story_images").insert(existing.storyImages.map(({ objectKey, sortOrder }) => ({ content_id: existing.id, object_key: objectKey, sort_order: sortOrder })));
    }
  }
}

export async function deleteAdminContentItem(id: string) {
  await requireAdministrator();
  if (!contentIdPattern.test(id)) throw new Error("内容标识无效。");

  const supabase = await createServerSupabaseClient();
  const existing = await getAdminContentItem(id);
  if (!existing) throw new Error("未找到该内容。");

  const { error } = await supabase.from("content_items").delete().eq("id", id);
  if (error) throw new Error("删除内容失败。");

  const objectKeys = new Set(
    [existing.coverObjectKey, existing.photo?.objectKey, existing.video?.objectKey, ...existing.storyImages.map((image) => image.objectKey)]
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
  } catch {
    return "内容已保存，但原媒体文件清理失败。";
  }
  return undefined;
}
