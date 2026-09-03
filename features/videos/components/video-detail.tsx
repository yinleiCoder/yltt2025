import Link from "next/link";
import type { ReactNode } from "react";

import type { PublicVideoItem } from "@/features/content/server/public-media-content-service";
import { VideoPlayer } from "@/features/media/components/video-player";

export function VideoDetail({
  video,
  comments,
}: {
  video: PublicVideoItem;
  comments: ReactNode;
}) {
  const metadata = [
    video.videoDetails.durationSeconds
      ? formatDuration(video.videoDetails.durationSeconds)
      : null,
    video.videoDetails.width && video.videoDetails.height
      ? `${video.videoDetails.width} × ${video.videoDetails.height}`
      : null,
    formatCodec(video.videoDetails.codec),
  ].filter((value): value is string => Boolean(value));

  return (
    <main className="min-h-dvh bg-[rgb(233,233,233)] text-[#222222]">
      <article className="container mx-auto w-full bg-[rgb(248,248,248)] px-5 pb-20 pt-8 sm:px-8 lg:px-12 lg:pt-12">
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
            {video.location ? <p className="mt-5 font-mono text-xs text-[#222222]">地点 / {formatLocation(video.location)}</p> : null}
            {metadata.length ? (
              <section className="mt-10 border-y border-[#d9d9d4] py-3">
                <h2 className="font-mono text-xs text-[#222222]">视频信息</h2>
                <p className="mt-2 font-mono text-xs text-[#222222]">
                  {metadata.join(" · ")}
                </p>
              </section>
            ) : null}
          </div>
        </div>
        {comments}
      </article>
    </main>
  );
}

function formatLocation(location: NonNullable<PublicVideoItem["location"]>) {
  return "label" in location ? `${location.label} / ${location.city}` : `${location.city} / ${location.region}`;
}

function formatCodec(codec: string | null | undefined) {
  return codec ? codec.toUpperCase() : null;
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
