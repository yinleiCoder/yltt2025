import { redirect } from "next/navigation";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AdministratorRequiredError,
  AuthenticationRequiredError,
} from "@/features/auth/server/auth-service";
import { getAdminDashboardData } from "@/features/admin/server/admin-service";

const contentKindLabels: Record<string, string> = {
  photo: "摄影",
  story: "故事",
  video: "短片",
};

function formatDate(date: string | null) {
  return date ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(date)) : "未发布";
}

export default async function AdminPage() {
  try {
    const dashboard = await getAdminDashboardData();

    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
          <div>
            <p className="text-sm text-muted-foreground">YlTt2025</p>
            <h1 className="mt-1 text-2xl font-semibold">概览</h1>
          </div>
          <Button nativeButton={false} render={<Link href="/" />} variant="outline">查看网站</Button>
        </header>
        <section aria-label="站点数据" className="grid border-b sm:grid-cols-3">
          {[
            ["内容总数", dashboard.contentCount],
            ["评论总数", dashboard.commentCount],
            ["注册用户", dashboard.userCount],
          ].map(([label, value]) => (
            <div className="border-b py-6 last:border-b-0 sm:border-r sm:px-6 sm:last:border-r-0" key={String(label)}>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
              {label === "注册用户" ? <AvatarGroup className="mt-3"><>{dashboard.userAvatars.slice(0, 5).map((user, index) => <Avatar key={`${user.displayName}-${index}`}><AvatarImage alt="" src={user.avatarUrl ?? undefined} /><AvatarFallback>{user.displayName?.slice(0, 1) ?? "用"}</AvatarFallback></Avatar>)}</>{dashboard.userCount > 5 ? <AvatarGroupCount>+{dashboard.userCount - 5}</AvatarGroupCount> : null}</AvatarGroup> : null}
            </div>
          ))}
        </section>
        <section className="py-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">最近更新</h2>
            <Button nativeButton={false} render={<Link href="/admin/content/new" />}>新建内容</Button>
          </div>
          <div className="mt-4 border">
            <Table className="min-w-[42rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>标题</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>发布状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.recentContent.length ? dashboard.recentContent.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-80 truncate font-medium">{item.title}</TableCell>
                    <TableCell>{contentKindLabels[item.kind] ?? "其他内容"}</TableCell>
                    <TableCell>
                      <Badge variant={item.publishedAt ? "secondary" : "outline"}>
                        {item.publishedAt ? `已发布 · ${formatDate(item.publishedAt)}` : "草稿"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button nativeButton={false} render={<Link href={`/admin/content/${item.id}`} />} size="sm" variant="ghost">编辑</Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell className="h-28 text-center text-muted-foreground" colSpan={4}>尚未创建内容。</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </main>
    );
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/login?next=/admin");
    }

    if (error instanceof AdministratorRequiredError) {
      redirect("/");
    }

    throw error;
  }
}
