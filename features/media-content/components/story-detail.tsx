import Link from "next/link";

import type { PublicStoryItem } from "@/features/content/server/public-media-content-service";
import type { PublicComment } from "@/features/comments/server/comment-service";
import { CommentsSection } from "@/features/comments/components/comments-section";
import { StoryMarkdown } from "@/features/content/components/story-markdown";

export function StoryDetail({
  story,
  comments,
}: {
  story: PublicStoryItem;
  comments: PublicComment[];
}) {
  return (
    <main className="min-h-dvh bg-[rgb(233,233,233)] text-[#222222]">
      <article className="mx-auto w-full max-w-7xl bg-[rgb(248,248,248)] px-5 pb-20 pt-8 sm:px-8 lg:px-12 lg:pt-12">
        <div className="mx-auto max-w-4xl">
          <Link
            className="font-mono text-[0.7rem] text-[#222222] transition-colors hover:bg-[#FFF083] hover:text-[#222222]"
            href="/stories"
          >
            ← BACK TO STORIES
          </Link>
          <header className="mt-12 border-b border-[#d2d2d2] pb-8">
            <p className="font-mono text-[0.7rem] text-[#222222]">
              STORY / {formatDate(story.publishedAt)}
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-editorial)] text-5xl leading-[1.02] sm:text-7xl">
              {story.title}
            </h1>
            {story.excerpt ? (
              <p className="mt-6 max-w-2xl text-sm leading-7 text-[#222222]">
                {story.excerpt}
              </p>
            ) : null}
          </header>
          <StoryMarkdown
            className="typeset typeset-docs mt-10 max-w-[37em] text-[#222222]"
            emptyMessage="还没有正文。"
            markdown={story.markdownBody}
            unstyled
          />
          <CommentsSection comments={comments} contentId={story.id} />
        </div>
      </article>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
