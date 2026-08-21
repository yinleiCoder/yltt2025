import { Button } from "@/components/ui/button";
import { changeUserRoleAction } from "@/features/admin/server/actions";
import { listAdminUsers } from "@/features/admin/server/admin-management-service";

export default async function AdminUsersPage() {
  const users = await listAdminUsers();
  return <main className="py-8"><h1 className="text-2xl font-semibold">Users</h1><div className="mt-6 divide-y border-y">{users.map((user) => <div className="flex items-center justify-between gap-4 py-4" key={user.id}><div><p className="font-medium">{user.displayName ?? "Unnamed user"}</p><p className="text-sm text-muted-foreground">{user.role}</p></div><form action={changeUserRoleAction}><input name="targetId" type="hidden" value={user.id} /><input name="nextRole" type="hidden" value={user.role === "admin" ? "user" : "admin"} /><Button size="sm" type="submit" variant="outline">Make {user.role === "admin" ? "user" : "admin"}</Button></form></div>)}</div></main>;
}
