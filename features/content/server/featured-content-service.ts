import {
  toFeaturedArchiveItems,
  type FeaturedArchiveItem,
  type FeaturedContentRow,
} from "@/features/content/domain/featured-archive";
import { firstRelatedRecord, type RelatedRecord } from "@/features/content/domain/related-record";
import { createPublicMediaUrl } from "@/features/media/domain/public-media-url";
import {
  getPublicMediaBaseUrl,
  hasPublicSupabaseEnvironment,
} from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type FeaturedContentRecord = {
  id: string;
  kind: FeaturedContentRow["kind"];
  slug: string;
  title: string;
  excerpt: string | null;
  cover_object_key: string | null;
  published_at: string;
  location_visibility: FeaturedContentRow["locationVisibility"];
  location_label: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_details: RelatedRecord<{
    object_key: string;
    alt_text: string | null;
    aperture: number | null;
    shutter_speed: string | null;
    iso: number | null;
    focal_length_mm: number | null;
    width: number | null;
    height: number | null;
  }> | null;
  video_details: RelatedRecord<{
    object_key: string;
    poster_object_key: string | null;
    duration_seconds: number | null;
    width: number | null;
    height: number | null;
  }> | null;
};

export type HomepageArchiveItem = FeaturedArchiveItem & {
  media:
    | (Exclude<FeaturedArchiveItem["media"], null> & {
        previewUrl: string | null;
      })
    | null;
};

export type HomepageArchive = {
  items: HomepageArchiveItem[];
  isMediaConfigured: boolean;
};

export async function getHomepageArchive(): Promise<HomepageArchive> {
  const mediaBaseUrl = getPublicMediaBaseUrl();

  if (!hasPublicSupabaseEnvironment()) {
    return { items: [], isMediaConfigured: Boolean(mediaBaseUrl) };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("content_items")
    .select(
      `
        id,
        kind,
        slug,
        title,
        excerpt,
        cover_object_key,
        published_at,
        location_visibility,
        location_label,
        city,
        region,
        latitude,
        longitude,
        photo_details (
          object_key,
          alt_text,
          aperture,
          shutter_speed,
          iso,
          focal_length_mm,
          width,
          height
        ),
        video_details (
          object_key,
          poster_object_key,
          duration_seconds,
          width,
          height
        )
      `,
    )
    .eq("is_featured", true)
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(12);

  if (error) {
    throw new Error(`Could not load the featured archive: ${error.message}`);
  }

  const items = toFeaturedArchiveItems(
    (data ?? []).map((record) => toFeaturedContentRow(record as FeaturedContentRecord)),
  );

  return {
    items: items.map((item) => addPreviewUrl(item, mediaBaseUrl)),
    isMediaConfigured: Boolean(mediaBaseUrl),
  };
}

function toFeaturedContentRow(record: FeaturedContentRecord): FeaturedContentRow {
  return {
    id: record.id,
    kind: record.kind,
    slug: record.slug,
    title: record.title,
    excerpt: record.excerpt,
    coverObjectKey: record.cover_object_key,
    publishedAt: record.published_at,
    locationVisibility: record.location_visibility,
    locationLabel: record.location_label,
    city: record.city,
    region: record.region,
    latitude: record.latitude,
    longitude: record.longitude,
    photoDetails: toPhotoDetails(record.photo_details),
    videoDetails: toVideoDetails(record.video_details),
  };
}

function toPhotoDetails(
  record: FeaturedContentRecord["photo_details"],
): FeaturedContentRow["photoDetails"] {
  if (!record) return null;

  const photo = firstRelatedRecord(record);
  if (!photo) return null;

  return {
    objectKey: photo.object_key,
    altText: photo.alt_text,
    aperture: photo.aperture,
    shutterSpeed: photo.shutter_speed,
    iso: photo.iso,
    focalLengthMm: photo.focal_length_mm,
    width: photo.width,
    height: photo.height,
  };
}

function toVideoDetails(
  record: FeaturedContentRecord["video_details"],
): FeaturedContentRow["videoDetails"] {
  if (!record) return null;

  const video = firstRelatedRecord(record);
  if (!video) return null;

  return {
    objectKey: video.object_key,
    posterObjectKey: video.poster_object_key,
    durationSeconds: video.duration_seconds,
    width: video.width,
    height: video.height,
  };
}

function addPreviewUrl(
  item: FeaturedArchiveItem,
  mediaBaseUrl: string | null,
): HomepageArchiveItem {
  if (!item.media || !mediaBaseUrl) {
    return { ...item, media: item.media ? { ...item.media, previewUrl: null } : null };
  }

  const previewObjectKey = item.media.type === "photo"
    ? item.media.objectKey
    : item.media.posterObjectKey;

  return {
    ...item,
    media: {
      ...item.media,
      previewUrl: previewObjectKey
        ? createPublicMediaUrl({
            baseUrl: mediaBaseUrl,
            objectKey: previewObjectKey,
            imageWidth: 1440,
          })
        : null,
    },
  };
}
