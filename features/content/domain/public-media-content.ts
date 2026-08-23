export type PublicVideoMedia = {
  objectKey: string;
  posterObjectKey: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
};

export type PublicVideoRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string;
  videoDetails: PublicVideoMedia;
};

export type PublicVideo = PublicVideoRow;

export type PublicStoryRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string;
  markdownBody: string;
  images: { objectKey: string; imageUrl: string | null }[];
};

export type PublicStory = PublicStoryRow;

export function toPublicVideo(row: PublicVideoRow): PublicVideo {
  return row;
}

export function toPublicStory(row: PublicStoryRow): PublicStory {
  return row;
}
