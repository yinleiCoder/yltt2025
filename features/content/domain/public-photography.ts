import { toPublicLocation, type LocationVisibility, type PublicLocation } from "./location-privacy";

export type PublicPhotoMedia = {
  objectKey: string;
  altText: string | null;
  cameraMake: string | null;
  cameraModel: string | null;
  lens: string | null;
  aperture: number | null;
  shutterSpeed: string | null;
  iso: number | null;
  focalLengthMm: number | null;
  capturedAt: string | null;
  width: number | null;
  height: number | null;
};

export type PublicPhotoRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string;
  locationVisibility: LocationVisibility;
  locationLabel: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  photoDetails: PublicPhotoMedia;
};

export type PublicPhoto = Omit<PublicPhotoRow, "locationVisibility" | "locationLabel" | "city" | "region" | "latitude" | "longitude" | "photoDetails"> & {
  location: PublicLocation;
  media: PublicPhotoMedia;
};

export function toPublicPhoto(row: PublicPhotoRow): PublicPhoto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    publishedAt: row.publishedAt,
    location: toSafeLocation(row),
    media: row.photoDetails,
  };
}

function toSafeLocation(row: PublicPhotoRow): PublicLocation {
  if (row.locationVisibility === "hidden") return null;

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
