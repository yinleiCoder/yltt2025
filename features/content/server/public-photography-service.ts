import {
  toPublicPhoto,
  type PublicPhoto,
  type PublicPhotoMedia,
  type PublicPhotoRow,
} from "@/features/content/domain/public-photography";
import { firstRelatedRecord, type RelatedRecord } from "@/features/content/domain/related-record";
import { createPublicMediaUrl } from "@/features/media/domain/public-media-url";
import { getPublicMediaBaseUrl, hasPublicSupabaseEnvironment } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PhotoRecord = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string;
  location_visibility: PublicPhotoRow["locationVisibility"];
  location_label: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_details: RelatedRecord<{
    object_key: string;
    alt_text: string | null;
    camera_make: string | null;
    camera_model: string | null;
    lens: string | null;
    aperture: number | null;
    shutter_speed: string | null;
    iso: number | null;
    focal_length_mm: number | null;
    captured_at: string | null;
    width: number | null;
    height: number | null;
  }> | null;
};

export type PublicPhotographyItem = PublicPhoto & {
  imageUrl: string | null;
};

export type PublicPhotographyArchive = {
  items: PublicPhotographyItem[];
  isMediaConfigured: boolean;
};

const photoSelect = `
  id,
  slug,
  title,
  excerpt,
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
    camera_make,
    camera_model,
    lens,
    aperture,
    shutter_speed,
    iso,
    focal_length_mm,
    captured_at,
    width,
    height
  )
`;

export async function getPublicPhotography(): Promise<PublicPhotographyArchive> {
  const mediaBaseUrl = getPublicMediaBaseUrl();
  if (!hasPublicSupabaseEnvironment()) {
    return { items: [], isMediaConfigured: Boolean(mediaBaseUrl) };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("content_items")
    .select(photoSelect)
    .eq("kind", "photo")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(48);

  if (error) throw new Error(`Could not load photography: ${error.message}`);

  return {
    items: toPublicItems(data as PhotoRecord[] | null, mediaBaseUrl),
    isMediaConfigured: Boolean(mediaBaseUrl),
  };
}

export async function getPublicPhotoBySlug(slug: string): Promise<PublicPhotographyItem | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;

  const mediaBaseUrl = getPublicMediaBaseUrl();
  if (!hasPublicSupabaseEnvironment()) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("content_items")
    .select(photoSelect)
    .eq("kind", "photo")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (error) throw new Error(`Could not load photography detail: ${error.message}`);
  if (!data) return null;

  const items = toPublicItems([data as PhotoRecord], mediaBaseUrl);
  return items[0] ?? null;
}

function toPublicItems(records: PhotoRecord[] | null, mediaBaseUrl: string | null) {
  return (records ?? []).flatMap((record) => {
    const details = firstRelatedRecord(record.photo_details);
    if (!details) return [];

    const row: PublicPhotoRow = {
      id: record.id,
      slug: record.slug,
      title: record.title,
      excerpt: record.excerpt,
      publishedAt: record.published_at,
      locationVisibility: record.location_visibility,
      locationLabel: record.location_label,
      city: record.city,
      region: record.region,
      latitude: record.latitude,
      longitude: record.longitude,
      photoDetails: toPhotoMedia(details),
    };

    return [{
      ...toPublicPhoto(row),
      imageUrl: mediaBaseUrl
        ? createPublicMediaUrl({
            baseUrl: mediaBaseUrl,
            objectKey: details.object_key,
            imageWidth: 1800,
          })
        : null,
    }];
  });
}

function toPhotoMedia(record: NonNullable<PhotoRecord["photo_details"]> extends RelatedRecord<infer T> ? T : never): PublicPhotoMedia {
  return {
    objectKey: record.object_key,
    altText: record.alt_text,
    cameraMake: record.camera_make,
    cameraModel: record.camera_model,
    lens: record.lens,
    aperture: record.aperture,
    shutterSpeed: record.shutter_speed,
    iso: record.iso,
    focalLengthMm: record.focal_length_mm,
    capturedAt: record.captured_at,
    width: record.width,
    height: record.height,
  };
}
