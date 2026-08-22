import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("streamed public comments", () => {
  it("keeps detail content independent from the comment query", async () => {
    const [photoPage, storyPage, videoPage, photoDetail, streamedComments] = await Promise.all([
      readFile(resolve(process.cwd(), "app/(site)/photography/[slug]/page.tsx"), "utf8"),
      readFile(resolve(process.cwd(), "app/(site)/stories/[slug]/page.tsx"), "utf8"),
      readFile(resolve(process.cwd(), "app/(site)/videos/[slug]/page.tsx"), "utf8"),
      readFile(resolve(process.cwd(), "features/photography/components/photography-detail.tsx"), "utf8"),
      readFile(resolve(process.cwd(), "features/comments/components/streamed-comments.tsx"), "utf8"),
    ]);

    expect(photoPage).toContain("<Suspense fallback={<CommentsSkeleton />}");
    expect(storyPage).toContain("<Suspense fallback={<CommentsSkeleton />}");
    expect(videoPage).toContain("<Suspense fallback={<CommentsSkeleton />}");
    expect(photoDetail).not.toContain("comments: PublicComment[]");
    expect(streamedComments).toContain("await listPublicComments(contentId)");
  });
});
