"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  addCommentAction,
  deleteCommentAction,
  updateCommentAction,
} from "@/features/comments/server/actions";
import type {
  AddCommentState,
  PublicComment,
} from "@/features/comments/server/comment-service";
import { PublicProfileDialog } from "@/features/profile/components/public-profile-dialog";
import { useCurrentUserStore } from "@/features/auth/components/current-user-provider";

const initialState: AddCommentState = {};

export function CommentsSection({
  contentId,
  comments,
}: {
  contentId: string;
  comments: PublicComment[];
}) {
  const currentUser = useCurrentUserStore((state) => state.currentUser);
  const isSignedIn = Boolean(currentUser);
  const currentUserId = currentUser?.id ?? null;
  const [state, action, isPending] = useActionState(
    addCommentAction,
    initialState,
  );
  const router = useRouter();
  const [isMutating, startMutation] = useTransition();
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [showAddResult, setShowAddResult] = useState(true);

  useEffect(() => {
    if (!showAddResult) return;
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [showAddResult, state.error, state.success]);

  function handleAddComment(formData: FormData) {
    setShowAddResult(true);
    setMutationError(null);
    action(formData);
  }

  async function handleUpdateComment(formData: FormData) {
    startMutation(async () => {
      const result = await updateCommentAction(formData);
      setShowAddResult(false);
      setMutationError(result.error ?? null);
      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success(result.success);
        router.refresh();
      }
    });
  }

  async function handleDeleteComment(formData: FormData) {
    startMutation(async () => {
      const result = await deleteCommentAction(formData);
      setShowAddResult(false);
      setMutationError(result.error ?? null);
      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success(result.success);
        router.refresh();
      }
    });
  }

  return (
    <section
      className="mt-16 border-t border-[#d9d9d4] pt-8"
      aria-labelledby="comments-title"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[0.7rem] text-[#222222]">评论区</p>
          <h2
            className="mt-2 font-[family-name:var(--font-editorial)] text-3xl"
            id="comments-title"
          >
            评论
          </h2>
        </div>
        <p className="font-mono text-[0.65rem] text-[#222222]">
          {comments.length} 条评论
        </p>
      </div>

      {isSignedIn ? (
        <form action={action} className="mt-6 grid gap-3">
          <input name="contentId" type="hidden" value={contentId} />
          <Textarea
            aria-label="评论内容"
            name="body"
            placeholder="留下你的感受"
            required
            maxLength={2000}
          />
          {state.error ? (
            <p className="text-sm text-red-300" role="alert">
              发表评论失败，请稍后重试。
            </p>
          ) : null}
          {state.success && showAddResult ? (
            <p className="text-sm text-[#222222]">{state.success}</p>
          ) : null}
          <Button
            className="justify-self-end bg-black text-white"
            disabled={isPending || isMutating}
            type="submit"
            variant="outline"
          >
            {isPending ? "发布中..." : "发表评论"}
          </Button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-[#222222]">
          <Link
            className="text-[#222222] underline underline-offset-4 decoration-[#222222]"
            href="/login"
          >
            登录
          </Link>{" "}
          后参与评论。
        </p>
      )}
      <div className="mt-6 divide-y divide-[#d9d9d4] border-y border-[#d9d9d4]">
        {comments.length ? (
          comments.map((comment) => (
            <article className="py-4" key={comment.id}>
              <div className="mb-3 flex items-center gap-2">
                {comment.author ? (
                  <PublicProfileDialog profile={comment.author} />
                ) : (
                  <span className="text-sm text-[#222222]">匿名用户</span>
                )}
              </div>
              <p className="text-sm leading-7 text-[#222222]">{comment.body}</p>
              <time
                className="mt-2 block font-mono text-[0.65rem] text-[#222222]"
                dateTime={comment.createdAt}
              >
                {formatDate(comment.createdAt)}
              </time>
              {currentUserId === comment.authorId ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <form
                    action={handleUpdateComment}
                    className="flex min-w-0 gap-2"
                  >
                    <input name="commentId" type="hidden" value={comment.id} />
                    <Textarea
                      aria-label={`编辑评论 ${comment.id}`}
                      className="min-h-9"
                      defaultValue={comment.body}
                      name="body"
                      required
                      maxLength={2000}
                    />
                    <Button disabled={isPending || isMutating} size="sm" type="submit" variant="ghost">
                      {isMutating ? "保存中..." : "保存"}
                    </Button>
                  </form>
                  <form
                    action={handleDeleteComment}
                    onSubmit={(event) => {
                      if (!window.confirm("确认删除这条评论吗？"))
                        event.preventDefault();
                    }}
                  >
                    <input name="commentId" type="hidden" value={comment.id} />
                    <Button disabled={isPending || isMutating} size="sm" type="submit" variant="ghost">
                      {isMutating ? "删除中..." : "删除"}
                    </Button>
                  </form>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <p className="py-6 text-sm text-[#222222]">还没有评论。</p>
        )}
      </div>
      {mutationError ? (
        <p className="mt-4 text-sm text-red-300" role="alert">
          评论操作失败，请稍后重试。
        </p>
      ) : null}
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
