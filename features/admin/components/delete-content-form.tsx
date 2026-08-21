"use client";

import { Button } from "@/components/ui/button";
import { deleteContentAction } from "@/features/content/server/actions";

export function DeleteContentForm({ id }: { id: string }) {
  return (
    <form
      action={deleteContentAction}
      onSubmit={(event) => {
        if (!window.confirm("确认删除这条内容及其评论吗？已上传媒体也会尝试从 OSS 清理。")) {
          event.preventDefault();
        }
      }}
    >
      <input name="id" type="hidden" value={id} />
      <Button size="sm" type="submit" variant="destructive">Delete</Button>
    </form>
  );
}
