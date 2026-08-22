import Link from "next/link";

import type { PublicVideoItem } from "@/features/content/server/public-media-content-service";
import type { PublicComment } from "@/features/comments/server/comment-service";
import { CommentsSection } from "@/features/comments/components/comments-section";
import { VideoPlayer } from "@/features/media/components/video-player";

export function VideoDetail({
  video,
  comments,
}: {
  video: PublicVideoItem;
  comments: PublicComment[];
}) {
  return (
    <main className="min-h-dvh bg-[rgb(233,233,233)] text-[#222222]">
      <article className="mx-auto w-full max-w-7xl bg-[rgb(248,248,248)] px-5 pb-20 pt-8 sm:px-8 lg:px-12 lg:pt-12">
        <Link
          className="font-mono text-[0.7rem] text-[#222222] transition-colors hover:bg-[#FFF083] hover:text-[#222222]"
          href="/videos"
        >
          ← BACK TO SHORT FILMS
        </Link>
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
          <div className="bg-transparent">
            <VideoPlayer
              poster={video.posterUrl}
              src={video.videoUrl}
              title={video.title}
            />
          </div>
          <div>
            <p className="font-mono text-[0.7rem] text-[#222222]">
              MOTION / {formatDate(video.publishedAt)}
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-editorial)] text-5xl leading-[1.02] sm:text-6xl">
              {video.title}
            </h1>
            {video.excerpt ? (
              <p className="mt-6 text-sm leading-7 text-[#222222]">
                {video.excerpt}
              </p>
            ) : null}
            <dl className="mt-10 divide-y divide-[#d9d9d4] border-y border-[#d9d9d4] font-mono text-xs">
              <IndexRow
                label="DURATION"
                value={
                  video.videoDetails.durationSeconds
                    ? formatDuration(video.videoDetails.durationSeconds)
                    : null
                }
              />
              <IndexRow label="FORMAT" value="H.264 / AAC MP4" />
              <IndexRow
                label="FRAME"
                value={
                  video.videoDetails.width && video.videoDetails.height
                    ? `${video.videoDetails.width} × ${video.videoDetails.height}`
                    : null
                }
              />
            </dl>
          </div>
        </div>
        <CommentsSection
          comments={comments}
          contentId={video.id}
        />
      </article>
    </main>
  );
}

function IndexRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-4 py-3">
      <dt className="text-[#222222]">{label}</dt>
      <dd className="text-[#222222]">{value ?? "—"}</dd>
    </div>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
function formatDuration(value: number) {
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
