import {
  toPublicStory,
  toPublicVideo,
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
  video_details: RelatedRecord<{
    object_key: string;
    poster_object_key: string | null;
    duration_seconds: number | null;
    width: number | null;
    height: number | null;
  }> | null;
};

type StoryRecord = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  markdown_body: string | null;
  published_at: string;
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
  video_details (
    object_key,
    poster_object_key,
    duration_seconds,
    width,
    height
  )
`;

const storySelect = "id, slug, title, excerpt, markdown_body, published_at";

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
  if (!hasPublicSupabaseEnvironment()) return { items: [] };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("content_items")
    .select(storySelect)
    .eq("kind", "story")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(48);

  if (error) throw new Error(`Could not load stories: ${error.message}`);
  return { items: toStoryItems(data as StoryRecord[] | null) };
}

export async function getPublicStoryBySlug(slug: string): Promise<PublicStoryItem | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !hasPublicSupabaseEnvironment()) return null;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("content_items")
    .select(storySelect)
    .eq("kind", "story")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (error) throw new Error(`Could not load story detail: ${error.message}`);
  return data ? toStoryItems([data as StoryRecord])[0] ?? null : null;
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
      videoDetails: {
        objectKey: details.object_key,
        posterObjectKey: details.poster_object_key,
        durationSeconds: details.duration_seconds,
        width: details.width,
        height: details.height,
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

function toStoryItems(records: StoryRecord[] | null): PublicStoryItem[] {
  return (records ?? []).map((record) => {
    const row: PublicStoryRow = {
      id: record.id,
      slug: record.slug,
      title: record.title,
      excerpt: record.excerpt,
      publishedAt: record.published_at,
      markdownBody: record.markdown_body ?? "",
    };
    return toPublicStory(row);
  });
}
