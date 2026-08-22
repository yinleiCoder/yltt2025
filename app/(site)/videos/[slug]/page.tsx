import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { listPublicComments } from "@/features/comments/server/comment-service";
import { getPublicVideoBySlug } from "@/features/content/server/public-media-content-service";
import { VideoDetail } from "@/features/media-content/components/video-detail";

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
  const comments = await listPublicComments(video.id);
  return <VideoDetail comments={comments} video={video} />;
}
