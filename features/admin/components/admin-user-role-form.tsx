"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  changeUserRoleAction,
  type AdminMutationState,
} from "@/features/admin/server/actions";

const initialState: AdminMutationState = {};

type AdminUserRoleFormProps = {
  nextRole: "admin" | "user";
  targetId: string;
};

export function AdminUserRoleForm({ nextRole, targetId }: AdminUserRoleFormProps) {
  const [state, formAction, isPending] = useActionState(
    changeUserRoleAction,
    initialState,
  );
  const actionLabel = nextRole === "admin" ? "设为管理员" : "设为普通用户";

  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state.error, state.success]);

  return (
    <form className="flex flex-col items-end gap-1" action={formAction}>
      <input name="targetId" type="hidden" value={targetId} />
      <input name="nextRole" type="hidden" value={nextRole} />
      <Button className="whitespace-nowrap" disabled={isPending} size="sm" type="submit" variant="outline">
        {isPending ? "处理中..." : actionLabel}
      </Button>
      {state.error ? <p className="text-xs text-destructive" role="alert">{state.error}</p> : null}
      {state.success ? <p aria-live="polite" className="text-xs text-muted-foreground">{state.success}</p> : null}
    </form>
  );
}
