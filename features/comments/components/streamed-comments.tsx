import { CommentsSection } from "@/features/comments/components/comments-section";
import { listPublicComments } from "@/features/comments/server/comment-service";

export async function StreamedComments({ contentId }: { contentId: string }) {
  const comments = await listPublicComments(contentId);
  return <CommentsSection comments={comments} contentId={contentId} />;
}
