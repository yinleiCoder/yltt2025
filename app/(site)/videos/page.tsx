import type { Metadata } from "next";

import { getPublicVideos } from "@/features/content/server/public-media-content-service";
import { VideoArchive } from "@/features/videos/components/video-archive";

export const metadata: Metadata = {
  title: "短片",
  description: "YlTt2025 的短视频档案。",
};

export default async function VideosPage() {
  return <VideoArchive archive={await getPublicVideos()} />;
}
