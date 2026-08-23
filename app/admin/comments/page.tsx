import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminCommentStatusForm } from "@/features/admin/components/admin-comment-status-form";
import { listAdminComments } from "@/features/admin/server/admin-management-service";

function initials(displayName: string | null) {
  return displayName?.trim().slice(0, 1) || "评";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export default async function AdminCommentsPage() {
  const comments = await listAdminComments();
  return (
      <main className="container mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="border-b pb-6">
        <p className="text-sm text-muted-foreground">评论内容与可见状态</p>
        <h1 className="mt-1 text-2xl font-semibold">评论审核</h1>
      </header>
      <div className="mt-6 border">
        <Table className="min-w-[54rem]">
          <TableHeader>
            <TableRow>
              <TableHead>评论者</TableHead>
              <TableHead>评论内容</TableHead>
              <TableHead>关联内容</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comments.length ? comments.map((comment) => (
              <TableRow key={comment.id}>
                <TableCell>
                  <div className="flex min-w-36 items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarImage alt="" src={comment.author.avatarUrl ?? undefined} />
                      <AvatarFallback>{initials(comment.author.displayName)}</AvatarFallback>
                    </Avatar>
                    <span className="max-w-28 truncate font-medium">{comment.author.displayName ?? "已注销用户"}</span>
                  </div>
                </TableCell>
                <TableCell className="min-w-72 whitespace-normal">
                  <p className="line-clamp-2">{comment.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(comment.createdAt)}</p>
                </TableCell>
                <TableCell className="max-w-44 truncate">{comment.contentTitle}</TableCell>
                <TableCell><Badge variant={comment.status === "visible" ? "secondary" : "outline"}>{comment.status === "visible" ? "可见" : "已隐藏"}</Badge></TableCell>
                <TableCell className="text-right">
                  <AdminCommentStatusForm
                    commentId={comment.id}
                    status={comment.status === "visible" ? "hidden" : "visible"}
                  />
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell className="h-28 text-center text-muted-foreground" colSpan={5}>暂无评论。</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
