import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getPublicPhotoBySlug } from "@/features/content/server/public-photography-service";
import { CommentsSkeleton } from "@/components/feedback/comments-skeleton";
import { StreamedComments } from "@/features/comments/components/streamed-comments";
import { PhotographyDetail } from "@/features/photography/components/photography-detail";

type PhotoPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PhotoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const photo = await getPublicPhotoBySlug(slug);
  if (!photo) return { title: "摄影未找到" };

  return {
    title: photo.title,
    description: photo.excerpt ?? "YlTt2025 摄影档案。",
  };
}

export default async function PhotographyDetailPage({ params }: PhotoPageProps) {
  const { slug } = await params;
  const photo = await getPublicPhotoBySlug(slug);
  if (!photo) notFound();
  return <PhotographyDetail comments={<Suspense fallback={<CommentsSkeleton />}><StreamedComments contentId={photo.id} /></Suspense>} photo={photo} />;
}
