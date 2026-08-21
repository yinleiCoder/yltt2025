"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addCommentAction, deleteCommentAction, updateCommentAction } from "@/features/comments/server/actions";
import type { AddCommentState, PublicComment } from "@/features/comments/server/comment-service";

const initialState: AddCommentState = {};

export function CommentsSection({
  contentId,
  comments,
  isSignedIn,
  currentUserId,
}: {
  contentId: string;
  comments: PublicComment[];
  isSignedIn: boolean;
  currentUserId: string | null;
}) {
  const [state, action, isPending] = useActionState(addCommentAction, initialState);
  const router = useRouter();
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [showAddResult, setShowAddResult] = useState(true);

  function handleAddComment(formData: FormData) {
    setShowAddResult(true);
    setMutationError(null);
    action(formData);
  }

  async function handleUpdateComment(formData: FormData) {
    const result = await updateCommentAction(formData);
    setShowAddResult(false);
    setMutationError(result.error ?? null);
    router.refresh();
  }

  async function handleDeleteComment(formData: FormData) {
    const result = await deleteCommentAction(formData);
    setShowAddResult(false);
    setMutationError(result.error ?? null);
    router.refresh();
  }

  return (
    <section className="mt-16 border-t border-[#303030] pt-8" aria-labelledby="comments-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[0.7rem] text-[#979797]">RESPONSES</p>
          <h2 className="mt-2 font-[family-name:var(--font-editorial)] text-3xl" id="comments-title">评论</h2>
        </div>
        <p className="font-mono text-[0.65rem] text-[#777777]">{comments.length} NOTES</p>
      </div>

      <div className="mt-6 divide-y divide-[#303030] border-y border-[#303030]">
        {comments.length ? comments.map((comment) => (
          <article className="py-4" key={comment.id}>
            <p className="text-sm leading-7 text-[#d0d0d0]">{comment.body}</p>
            <time className="mt-2 block font-mono text-[0.65rem] text-[#777777]" dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
            {currentUserId === comment.authorId ? <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <form action={handleUpdateComment} className="flex min-w-0 gap-2">
                <input name="commentId" type="hidden" value={comment.id} />
                <Textarea aria-label={`编辑评论 ${comment.id}`} className="min-h-9" defaultValue={comment.body} name="body" required maxLength={2000} />
                <Button size="sm" type="submit" variant="ghost">保存</Button>
              </form>
              <form action={handleDeleteComment} onSubmit={(event) => { if (!window.confirm("确认删除这条评论吗？")) event.preventDefault(); }}><input name="commentId" type="hidden" value={comment.id} /><Button size="sm" type="submit" variant="ghost">删除</Button></form>
            </div> : null}
          </article>
        )) : <p className="py-6 text-sm text-[#929292]">还没有评论。</p>}
      </div>
      {mutationError ? <p className="mt-4 text-sm text-red-300" role="alert">{mutationError}</p> : null}

      {isSignedIn ? (
        <form action={action} className="mt-6 grid gap-3">
          <input name="contentId" type="hidden" value={contentId} />
          <Textarea aria-label="评论内容" name="body" placeholder="留下你的感受" required maxLength={2000} />
          {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
          {state.success && showAddResult ? <p className="text-sm text-[#bdbdbd]">{state.success}</p> : null}
          <Button className="justify-self-start" disabled={isPending} type="submit" variant="outline">{isPending ? "Publishing" : "发表评论"}</Button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-[#929292]">
          <Link className="text-[#f7f7f7] underline underline-offset-4" href="/login">登录</Link> 后参与评论。
        </p>
      )}
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
