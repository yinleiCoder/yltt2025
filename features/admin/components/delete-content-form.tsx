"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteContentAction } from "@/features/content/server/actions";

export function DeleteContentForm({ id }: { id: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <form ref={formRef} action={deleteContentAction}>
        <input name="id" type="hidden" value={id} />
        <DeleteContentButton />
      </form>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除内容？</AlertDialogTitle>
          <AlertDialogDescription>
            这会删除内容及其评论，并尝试清理已上传的媒体文件。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => formRef.current?.requestSubmit()}
          >
            确认删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteContentButton() {
  const { pending } = useFormStatus();

  return (
    <AlertDialogTrigger
      disabled={pending}
      render={<Button size="sm" type="button" variant="destructive" />}
    >
      {pending ? "正在删除..." : "删除内容"}
    </AlertDialogTrigger>
  );
}
