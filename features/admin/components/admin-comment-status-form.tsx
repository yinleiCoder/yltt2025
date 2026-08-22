"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  type AdminMutationState,
  updateCommentStatusAction,
} from "@/features/admin/server/actions";

const initialState: AdminMutationState = {};

type AdminCommentStatusFormProps = {
  commentId: string;
  status: "visible" | "hidden";
};

export function AdminCommentStatusForm({
  commentId,
  status,
}: AdminCommentStatusFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateCommentStatusAction,
    initialState,
  );
  const actionLabel = status === "hidden" ? "隐藏" : "恢复";

  return (
    <form className="flex flex-col items-end gap-1" action={formAction}>
      <input name="commentId" type="hidden" value={commentId} />
      <input name="status" type="hidden" value={status} />
      <Button className="whitespace-nowrap" disabled={isPending} size="sm" type="submit" variant="outline">
        {isPending ? "处理中..." : actionLabel}
      </Button>
      {state.error ? <p className="text-xs text-destructive" role="alert">{state.error}</p> : null}
      {state.success ? <p aria-live="polite" className="text-xs text-muted-foreground">{state.success}</p> : null}
    </form>
  );
}
