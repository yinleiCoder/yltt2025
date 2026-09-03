import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CommentsSkeleton } from "@/components/feedback/comments-skeleton";
import { StreamedComments } from "@/features/comments/components/streamed-comments";
import { getPublicVideoBySlug } from "@/features/content/server/public-media-content-service";
import { VideoDetail } from "@/features/videos/components/video-detail";

type VideoPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: VideoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const video = await getPublicVideoBySlug(slug);
  return video ? { title: video.title, description: video.excerpt ?? "YlTt2025 短片档案。" } : { title: "短片未找到" };
}

export default async function VideoDetailPage({ params }: VideoPageProps) {
  const { slug } = await params;
  const video = await getPublicVideoBySlug(slug);
  if (!video) notFound();
  return <VideoDetail comments={<Suspense fallback={<CommentsSkeleton />}><StreamedComments contentId={video.id} /></Suspense>} video={video} />;
}
