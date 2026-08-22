import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicPhotoBySlug } from "@/features/content/server/public-photography-service";
import { listPublicComments } from "@/features/comments/server/comment-service";
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
  const comments = await listPublicComments(photo.id);

  return <PhotographyDetail comments={comments} photo={photo} />;
}
