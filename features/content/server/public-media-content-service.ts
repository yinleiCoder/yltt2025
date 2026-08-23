import {
  toPublicStory,
  toPublicVideo,
  sortPublicStories,
  type PublicStory,
  type PublicStoryRow,
  type PublicVideo,
  type PublicVideoRow,
} from "@/features/content/domain/public-media-content";
import { firstRelatedRecord, type RelatedRecord } from "@/features/content/domain/related-record";
import { createPublicMediaUrl, createVideoPosterUrl } from "@/features/media/domain/public-media-url";
import { getPublicMediaBaseUrl, hasPublicSupabaseEnvironment } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type VideoRecord = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string;
  location_visibility: "precise" | "city" | "hidden";
  location_label: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  video_details: RelatedRecord<{
    object_key: string;
    poster_object_key: string | null;
    duration_seconds: number | null;
    width: number | null;
    height: number | null;
    codec: string | null;
  }> | null;
};

type StoryRecord = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  markdown_body: string | null;
  published_at: string;
  occurred_at: string | null;
  location_visibility: "precise" | "city" | "hidden";
  location_label: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  story_images: RelatedRecord<{ object_key: string; sort_order: number }>;
};

export type PublicVideoItem = PublicVideo & {
  videoUrl: string | null;
  posterUrl: string | null;
};

export type PublicVideoArchive = {
  items: PublicVideoItem[];
  isMediaConfigured: boolean;
};

export type PublicStoryItem = PublicStory;

export type PublicStoryArchive = {
  items: PublicStoryItem[];
};

const videoSelect = `
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
  video_details (
    object_key,
    poster_object_key,
    duration_seconds,
    width,
    height,
    codec
  )
`;

const storySelect = "id, slug, title, excerpt, markdown_body, published_at, occurred_at, location_visibility, location_label, city, region, latitude, longitude, story_images (object_key, sort_order)";

export async function getPublicVideos(): Promise<PublicVideoArchive> {
  const mediaBaseUrl = getPublicMediaBaseUrl();
  if (!hasPublicSupabaseEnvironment()) return { items: [], isMediaConfigured: Boolean(mediaBaseUrl) };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("content_items")
    .select(videoSelect)
    .eq("kind", "video")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(48);

  if (error) throw new Error(`Could not load videos: ${error.message}`);
  return { items: toVideoItems(data as VideoRecord[] | null, mediaBaseUrl), isMediaConfigured: Boolean(mediaBaseUrl) };
}

export async function getPublicVideoBySlug(slug: string): Promise<PublicVideoItem | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  const mediaBaseUrl = getPublicMediaBaseUrl();
  if (!hasPublicSupabaseEnvironment()) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("content_items")
    .select(videoSelect)
    .eq("kind", "video")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (error) throw new Error(`Could not load video detail: ${error.message}`);
  return toVideoItems(data ? [data as VideoRecord] : [], mediaBaseUrl)[0] ?? null;
}

export async function getPublicStories(): Promise<PublicStoryArchive> {
  const mediaBaseUrl = getPublicMediaBaseUrl();
  if (!hasPublicSupabaseEnvironment()) return { items: [] };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("content_items")
    .select(storySelect)
    .eq("kind", "story")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("occurred_at", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false })
    .order("sort_order", { ascending: true, foreignTable: "story_images" })
    .limit(48);

  if (error) throw new Error(`Could not load stories: ${error.message}`);
  return { items: toStoryItems(data as StoryRecord[] | null, mediaBaseUrl) };
}

export async function getPublicStoryBySlug(slug: string): Promise<PublicStoryItem | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !hasPublicSupabaseEnvironment()) return null;
  const mediaBaseUrl = getPublicMediaBaseUrl();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("content_items")
    .select(storySelect)
    .eq("kind", "story")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("sort_order", { ascending: true, foreignTable: "story_images" })
    .maybeSingle();

  if (error) throw new Error(`Could not load story detail: ${error.message}`);
  return data ? toStoryItems([data as StoryRecord], mediaBaseUrl)[0] ?? null : null;
}

function toVideoItems(records: VideoRecord[] | null, mediaBaseUrl: string | null): PublicVideoItem[] {
  return (records ?? []).flatMap((record) => {
    const details = firstRelatedRecord(record.video_details);
    if (!details) return [];

    const row: PublicVideoRow = {
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
      videoDetails: {
        objectKey: details.object_key,
        posterObjectKey: details.poster_object_key,
        durationSeconds: details.duration_seconds,
        width: details.width,
        height: details.height,
        codec: details.codec,
      },
    };

    return [{
      ...toPublicVideo(row),
      videoUrl: mediaBaseUrl ? createPublicMediaUrl({ baseUrl: mediaBaseUrl, objectKey: details.object_key }) : null,
      posterUrl: mediaBaseUrl
        ? details.poster_object_key
          ? createPublicMediaUrl({ baseUrl: mediaBaseUrl, objectKey: details.poster_object_key, imageWidth: 1600 })
          : createVideoPosterUrl({ baseUrl: mediaBaseUrl, objectKey: details.object_key })
        : null,
    }];
  });
}

function toStoryItems(records: StoryRecord[] | null, mediaBaseUrl: string | null): PublicStoryItem[] {
  const rows = (records ?? []).map((record) => {
    return {
      id: record.id,
      slug: record.slug,
      title: record.title,
      excerpt: record.excerpt,
      publishedAt: record.published_at,
      occurredAt: record.occurred_at,
      locationVisibility: record.location_visibility,
      locationLabel: record.location_label,
      city: record.city,
      region: record.region,
      latitude: record.latitude,
      longitude: record.longitude,
      markdownBody: record.markdown_body ?? "",
      images: (Array.isArray(record.story_images) ? record.story_images : record.story_images ? [record.story_images] : [])
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((image) => ({ objectKey: image.object_key, imageUrl: mediaBaseUrl ? createPublicMediaUrl({ baseUrl: mediaBaseUrl, objectKey: image.object_key, imageWidth: 1800 }) : null })),
    } satisfies PublicStoryRow;
  });
  return sortPublicStories(rows).map((row) => toPublicStory(row));
}
