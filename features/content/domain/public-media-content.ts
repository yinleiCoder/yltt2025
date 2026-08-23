import { toPublicLocation, type LocationVisibility, type PublicLocation } from "./location-privacy";

export type PublicVideoMedia = {
  objectKey: string;
  posterObjectKey: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  codec: string | null;
};

export type PublicVideoRow = {
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
  videoDetails: PublicVideoMedia;
};

export type PublicVideo = Omit<PublicVideoRow, "locationVisibility" | "locationLabel" | "city" | "region" | "latitude" | "longitude"> & { location: PublicLocation };

export type PublicStoryRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string;
  occurredAt: string | null;
  locationVisibility: LocationVisibility;
  locationLabel: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  markdownBody: string;
  images: { objectKey: string; imageUrl: string | null }[];
};

export type PublicStory = Omit<PublicStoryRow, "locationVisibility" | "locationLabel" | "city" | "region" | "latitude" | "longitude"> & { location: PublicLocation };

export function toPublicVideo(row: PublicVideoRow): PublicVideo {
  const { locationVisibility: _visibility, locationLabel: _label, city: _city, region: _region, latitude: _latitude, longitude: _longitude, ...safeRow } = row;
  return { ...safeRow, location: toMediaLocation(row) };
}

export function toPublicStory(row: PublicStoryRow): PublicStory {
  const { locationVisibility: _visibility, locationLabel: _label, city: _city, region: _region, latitude: _latitude, longitude: _longitude, ...safeRow } = row;
  return { ...safeRow, location: toMediaLocation(row) };
}

export function sortPublicStories(rows: PublicStoryRow[]): PublicStoryRow[] {
  return [...rows].sort((left, right) => {
    const leftTime = left.occurredAt ? Date.parse(left.occurredAt) : Number.NEGATIVE_INFINITY;
    const rightTime = right.occurredAt ? Date.parse(right.occurredAt) : Number.NEGATIVE_INFINITY;
    if (leftTime !== rightTime) return rightTime - leftTime;
    return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
  });
}

function toMediaLocation(row: Pick<PublicVideoRow, "locationVisibility" | "locationLabel" | "city" | "region" | "latitude" | "longitude">): PublicLocation {
  if (row.locationVisibility === "hidden" || !row.city || !row.region) return null;
  if (row.locationVisibility === "city") return toPublicLocation({ visibility: "city", label: "", city: row.city, region: row.region, latitude: 0, longitude: 0 });
  if (!row.locationLabel || row.latitude === null || row.longitude === null) return null;
  return toPublicLocation({ visibility: "precise", label: row.locationLabel, city: row.city, region: row.region, latitude: row.latitude, longitude: row.longitude });
}
