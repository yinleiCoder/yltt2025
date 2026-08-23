import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteContentForm } from "@/features/admin/components/delete-content-form";
import { getAdminContentItems } from "@/features/content/server/content-admin-service";

const contentKindLabels = { photo: "摄影", story: "故事", video: "短片" } as const;

export default async function AdminContentPage() {
  const items = await getAdminContentItems();

  return (
      <main className="container mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <p className="text-sm text-muted-foreground">后台管理</p>
          <h1 className="mt-1 text-2xl font-semibold">内容管理</h1>
        </div>
        <div className="flex flex-wrap gap-2"><Button nativeButton={false} render={<Link href="/admin/content/new" />}>新建内容</Button><Button nativeButton={false} render={<Link href="/admin/content/new?kind=story" />} variant="outline">新建故事</Button></div>
      </header>
      <section aria-labelledby="content-list-title" className="py-8">
        <h2 className="sr-only" id="content-list-title">所有内容</h2>
        <div className="border">
          <Table className="min-w-[52rem]">
            <TableHeader><TableRow><TableHead>标题</TableHead><TableHead>类型</TableHead><TableHead>故事发生日期</TableHead><TableHead>更新时间</TableHead><TableHead>发布状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.length ? items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-80 truncate font-medium">{item.title}</TableCell>
                  <TableCell>{contentKindLabels[item.kind]}</TableCell>
                  <TableCell>{item.kind === "story" ? formatDate(item.occurredAt) : "—"}</TableCell>
                  <TableCell>{formatDate(item.updatedAt)}</TableCell>
                  <TableCell><Badge variant={item.publishedAt ? "secondary" : "outline"}>{item.publishedAt ? `已发布 · ${formatDate(item.publishedAt)}` : "草稿"}</Badge></TableCell>
                  <TableCell><div className="flex justify-end gap-2"><Button nativeButton={false} render={<Link href={`/admin/content/${item.id}`} />} size="sm" variant="ghost">编辑</Button><DeleteContentForm id={item.id} /></div></TableCell>
                </TableRow>
              )) : <TableRow><TableCell className="h-28 text-center text-muted-foreground" colSpan={6}>尚未创建内容。</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </section>
    </main>
  );
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(value)) : "—";
}
