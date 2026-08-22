import { NewContentForm } from "@/features/admin/components/new-content-form";

export default function NewContentPage() {
  return <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><header className="border-b pb-6"><p className="text-sm text-muted-foreground">内容管理</p><h1 className="mt-1 text-2xl font-semibold">新建内容</h1></header><NewContentForm /></main>;
}
