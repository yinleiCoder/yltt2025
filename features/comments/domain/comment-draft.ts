import { z } from "zod";

const commentDraftSchema = z.object({
  contentId: z.string().uuid(),
  body: z.string().trim().min(1, "Comment cannot be empty.").max(2000, "Comment is too long."),
});

export type CommentDraft = z.infer<typeof commentDraftSchema>;

export function parseCommentDraft(input: unknown): CommentDraft {
  return commentDraftSchema.parse(input);
}

const commentBodySchema = z.string().trim().min(1, "Comment cannot be empty.").max(2000, "Comment is too long.");

export function parseCommentBody(input: unknown): string {
  return commentBodySchema.parse(input);
}
