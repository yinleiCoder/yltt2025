import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CommentsSkeleton } from "@/components/feedback/comments-skeleton";
import { StreamedComments } from "@/features/comments/components/streamed-comments";
import { getPublicStoryBySlug } from "@/features/content/server/public-media-content-service";
import { StoryDetail } from "@/features/media-content/components/story-detail";

type StoryPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = await getPublicStoryBySlug(slug);
  return story ? { title: story.title, description: story.excerpt ?? "YlTt2025 故事档案。" } : { title: "故事未找到" };
}

export default async function StoryDetailPage({ params }: StoryPageProps) {
  const { slug } = await params;
  const story = await getPublicStoryBySlug(slug);
  if (!story) notFound();
  return <StoryDetail comments={<Suspense fallback={<CommentsSkeleton />}><StreamedComments contentId={story.id} /></Suspense>} story={story} />;
}
