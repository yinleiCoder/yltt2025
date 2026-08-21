import { listRoleAuditLogs } from "@/features/admin/server/admin-management-service";

export default async function AdminAuditPage() {
  const entries = await listRoleAuditLogs();
  return <main className="py-8"><h1 className="text-2xl font-semibold">Role audit</h1><div className="mt-6 divide-y border-y">{entries.map((entry) => <div className="py-4 text-sm" key={entry.id}><p className="font-medium">{entry.previousRole} to {entry.nextRole}</p><p className="mt-1 text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</p></div>)}</div></main>;
}
