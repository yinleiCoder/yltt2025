import {
  toPublicLocation,
  type LocationVisibility,
  type PublicLocation,
} from "./location-privacy";
import { firstRelatedRecord, type RelatedRecord } from "./related-record";

type ContentKind = "photo" | "video" | "story";

export type FeaturedContentRow = {
  id: string;
  kind: ContentKind;
  slug: string;
  title: string;
  excerpt: string | null;
  coverObjectKey: string | null;
  publishedAt: string;
  locationVisibility: LocationVisibility;
  locationLabel: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  photoDetails: RelatedRecord<{
    objectKey: string;
    altText: string | null;
    aperture: number | null;
    shutterSpeed: string | null;
    iso: number | null;
    focalLengthMm: number | null;
    width: number | null;
    height: number | null;
  }>;
  videoDetails: RelatedRecord<{
    objectKey: string;
    posterObjectKey: string | null;
    durationSeconds: number | null;
    width: number | null;
    height: number | null;
  }>;
};

export type FeaturedArchiveItem = {
  id: string;
  kind: ContentKind;
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string;
  location: PublicLocation;
  media:
    | {
        type: "photo";
        objectKey: string;
        altText: string | null;
        aperture: number | null;
        shutterSpeed: string | null;
        iso: number | null;
        focalLengthMm: number | null;
        width: number | null;
        height: number | null;
      }
    | {
        type: "video";
        objectKey: string;
        posterObjectKey: string | null;
        durationSeconds: number | null;
        width: number | null;
        height: number | null;
      }
    | null;
};

export function toFeaturedArchiveItems(
  rows: FeaturedContentRow[],
): FeaturedArchiveItem[] {
  const items: FeaturedArchiveItem[] = [];

  for (const row of rows) {
    const baseItem = {
      id: row.id,
      kind: row.kind,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      publishedAt: row.publishedAt,
      location: toSafePublicLocation(row),
    };

    if (row.kind === "story") {
      items.push({ ...baseItem, media: null });
      continue;
    }

    if (row.kind === "photo") {
      const photo = firstRelatedRecord(row.photoDetails);
      if (!photo) continue;

      items.push({
        ...baseItem,
        media: {
          type: "photo" as const,
          objectKey: photo.objectKey,
          altText: photo.altText,
          aperture: photo.aperture,
          shutterSpeed: photo.shutterSpeed,
          iso: photo.iso,
          focalLengthMm: photo.focalLengthMm,
          width: photo.width,
          height: photo.height,
        },
      });
      continue;
    }

    const video = firstRelatedRecord(row.videoDetails);
    if (!video) continue;

    items.push({
      ...baseItem,
      media: {
        type: "video" as const,
        objectKey: video.objectKey,
        posterObjectKey: video.posterObjectKey ?? toImageObjectKey(row.coverObjectKey),
        durationSeconds: video.durationSeconds,
        width: video.width,
        height: video.height,
      },
    });
  }

  return items;
}

const imageObjectExtensions = [".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"];

function toImageObjectKey(objectKey: string | null): string | null {
  if (!objectKey) return null;

  const normalizedKey = objectKey.toLowerCase();
  return imageObjectExtensions.some((extension) => normalizedKey.endsWith(extension))
    ? objectKey
    : null;
}

function toSafePublicLocation(row: FeaturedContentRow): PublicLocation {
  if (row.locationVisibility === "hidden") {
    return null;
  }

  if (row.locationVisibility === "city") {
    if (!row.city || !row.region) return null;

    return toPublicLocation({
      label: row.locationLabel ?? "",
      city: row.city,
      region: row.region,
      latitude: row.latitude ?? 0,
      longitude: row.longitude ?? 0,
      visibility: "city",
    });
  }

  if (
    !row.locationLabel ||
    !row.city ||
    !row.region ||
    row.latitude === null ||
    row.longitude === null
  ) {
    return null;
  }

  return toPublicLocation({
    label: row.locationLabel,
    city: row.city,
    region: row.region,
    latitude: row.latitude,
    longitude: row.longitude,
    visibility: "precise",
  });
}
