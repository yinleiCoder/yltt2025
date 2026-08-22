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
import { AdminUserDetailsDialog } from "@/features/admin/components/admin-user-details-dialog";
import { AdminUserRoleForm } from "@/features/admin/components/admin-user-role-form";
import { listAdminUsers } from "@/features/admin/server/admin-management-service";

function initials(displayName: string | null) {
  return displayName?.trim().slice(0, 1) || "用";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(date));
}

function publicFields(user: Awaited<ReturnType<typeof listAdminUsers>>[number]) {
  const labels = [
    user.publicProfile.gender && "性别",
    user.publicProfile.realName && "姓名",
    user.publicProfile.phone && "电话",
    user.publicProfile.address && "住址",
  ].filter(Boolean);

  return labels.length ? labels.join("、") : "未公开";
}

export default async function AdminUsersPage() {
  const users = await listAdminUsers();
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="border-b pb-6">
        <p className="text-sm text-muted-foreground">成员与权限</p>
        <h1 className="mt-1 text-2xl font-semibold">用户管理</h1>
      </header>
      <div className="mt-6 border">
        <Table className="min-w-[50rem]">
          <TableHeader>
            <TableRow>
              <TableHead>用户</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>注册时间</TableHead>
              <TableHead>公开资料</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length ? users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex min-w-44 items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarImage alt="" src={user.avatarUrl ?? undefined} />
                      <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    <span className="max-w-36 truncate font-medium">{user.displayName ?? "未设置昵称"}</span>
                  </div>
                </TableCell>
                <TableCell><Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role === "admin" ? "管理员" : "普通用户"}</Badge></TableCell>
                <TableCell>{formatDate(user.createdAt)}</TableCell>
                <TableCell className="max-w-48 truncate text-muted-foreground">{publicFields(user)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-start justify-end gap-2">
                    <AdminUserDetailsDialog details={user.details} displayName={user.displayName} />
                    <AdminUserRoleForm
                      nextRole={user.role === "admin" ? "user" : "admin"}
                      targetId={user.id}
                    />
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell className="h-28 text-center text-muted-foreground" colSpan={5}>暂无用户。</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
