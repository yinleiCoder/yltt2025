import { Button } from "@/components/ui/button";
import { updateCommentStatusAction } from "@/features/admin/server/actions";
import { listAdminComments } from "@/features/admin/server/admin-management-service";

export default async function AdminCommentsPage() {
  const comments = await listAdminComments();
  return <main className="py-8"><h1 className="text-2xl font-semibold">Comments</h1><div className="mt-6 divide-y border-y">{comments.map((comment) => <div className="flex items-start justify-between gap-4 py-4" key={comment.id}><div><p>{comment.body}</p><p className="mt-1 text-xs text-muted-foreground">{comment.status} · {new Date(comment.createdAt).toLocaleDateString()}</p></div><form action={updateCommentStatusAction}><input name="commentId" type="hidden" value={comment.id} /><input name="status" type="hidden" value={comment.status === "visible" ? "hidden" : "visible"} /><Button size="sm" type="submit" variant="outline">{comment.status === "visible" ? "Hide" : "Restore"}</Button></form></div>)}</div></main>;
}
