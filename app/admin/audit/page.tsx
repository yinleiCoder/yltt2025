import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listRoleAuditLogs } from "@/features/admin/server/admin-management-service";

function roleLabel(role: "user" | "admin") {
  return role === "admin" ? "管理员" : "普通用户";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export default async function AdminAuditPage() {
  const entries = await listRoleAuditLogs();
  return (
    <main className="container mx-auto min-w-0 w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="border-b pb-6">
        <p className="text-sm text-muted-foreground">角色变更记录</p>
        <h1 className="mt-1 text-2xl font-semibold">审计日志</h1>
      </header>
      <div className="mt-6 border">
        <Table className="min-w-[46rem]">
          <TableHeader>
            <TableRow>
              <TableHead>原角色</TableHead>
              <TableHead>新角色</TableHead>
              <TableHead>操作者</TableHead>
              <TableHead>目标用户</TableHead>
              <TableHead>发生时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length ? entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell><Badge variant="outline">{roleLabel(entry.previousRole)}</Badge></TableCell>
                <TableCell><Badge variant="secondary">{roleLabel(entry.nextRole)}</Badge></TableCell>
                <TableCell className="max-w-36 truncate font-mono text-xs">{entry.actorId}</TableCell>
                <TableCell className="max-w-36 truncate font-mono text-xs">{entry.targetId}</TableCell>
                <TableCell>{formatDate(entry.createdAt)}</TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell className="h-28 text-center text-muted-foreground" colSpan={5}>暂无角色变更记录。</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
