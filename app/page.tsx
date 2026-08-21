import { ArchiveHome } from "@/features/home/components/archive-home";
import { getHomepageArchive } from "@/features/content/server/featured-content-service";

export default async function Home() {
  const archive = await getHomepageArchive();

  return <ArchiveHome archive={archive} />;
}
