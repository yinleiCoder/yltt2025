import { NewContentForm } from "@/features/admin/components/new-content-form";

export default async function NewContentPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const params = await searchParams;
  const kind = params.kind === "story" || params.kind === "video" ? params.kind : "photo";
  const title = kind === "story" ? "新建故事" : kind === "video" ? "新建短片" : "新建摄影";
  return <main className="container mx-auto min-w-0 w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><header className="border-b pb-6"><p className="text-sm text-muted-foreground">内容管理</p><h1 className="mt-1 text-2xl font-semibold">{title}</h1></header><NewContentForm kind={kind} /></main>;
}
