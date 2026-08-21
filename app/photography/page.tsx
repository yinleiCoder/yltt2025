import type { Metadata } from "next";

import { PhotographyArchive } from "@/features/photography/components/photography-archive";
import { getPublicPhotography } from "@/features/content/server/public-photography-service";

export const metadata: Metadata = {
  title: "摄影",
  description: "YlTt2025 的摄影接触表与拍摄参数档案。",
};

export default async function PhotographyPage() {
  const archive = await getPublicPhotography();
  return <PhotographyArchive archive={archive} />;
}
