import type { Metadata } from "next";

import { getPublicStories } from "@/features/content/server/public-media-content-service";
import { StoryArchive } from "@/features/stories/components/story-archive";

export const metadata: Metadata = {
  title: "故事",
  description: "YlTt2025 的恋爱故事档案。",
};

export default async function StoriesPage() {
  return <StoryArchive archive={await getPublicStories()} />;
}
