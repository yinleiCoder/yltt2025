import Link from "next/link";

import type { PublicVideoItem } from "@/features/content/server/public-media-content-service";
import type { PublicComment } from "@/features/comments/server/comment-service";
import { CommentsSection } from "@/features/comments/components/comments-section";
import { PhotographyHeader } from "@/features/photography/components/photography-header";

export function VideoDetail({ video, comments, isSignedIn, currentUserId }: { video: PublicVideoItem; comments: PublicComment[]; isSignedIn: boolean; currentUserId: string | null }) {
  return (
    <main className="min-h-dvh bg-[#111111] text-[#f7f7f7]"><PhotographyHeader /><article className="mx-auto w-full max-w-7xl px-5 pb-20 pt-8 sm:px-8 lg:px-12 lg:pt-12">
      <Link className="font-mono text-[0.7rem] text-[#a8a8a8] transition-colors hover:text-white" href="/videos">← BACK TO SHORT FILMS</Link>
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <div className="border border-[#3a3a3a] bg-[#171717] p-2 sm:p-3"><video className="aspect-video h-auto w-full bg-black" controls playsInline poster={video.posterUrl ?? undefined} preload="metadata"><source src={video.videoUrl ?? undefined} type="video/mp4" />Your browser cannot play this video.</video></div>
        <div><p className="font-mono text-[0.7rem] text-[#979797]">MOTION / {formatDate(video.publishedAt)}</p><h1 className="mt-4 font-[family-name:var(--font-editorial)] text-5xl leading-[1.02] sm:text-6xl">{video.title}</h1>{video.excerpt ? <p className="mt-6 text-sm leading-7 text-[#b2b2b2]">{video.excerpt}</p> : null}<dl className="mt-10 divide-y divide-[#303030] border-y border-[#303030] font-mono text-xs"><IndexRow label="DURATION" value={video.videoDetails.durationSeconds ? formatDuration(video.videoDetails.durationSeconds) : null} /><IndexRow label="FORMAT" value="H.264 / AAC MP4" /><IndexRow label="FRAME" value={video.videoDetails.width && video.videoDetails.height ? `${video.videoDetails.width} × ${video.videoDetails.height}` : null} /></dl></div>
      </div><CommentsSection comments={comments} contentId={video.id} currentUserId={currentUserId} isSignedIn={isSignedIn} />
    </article></main>
  );
}

function IndexRow({ label, value }: { label: string; value: string | null }) { return <div className="grid grid-cols-[8rem_1fr] gap-4 py-3"><dt className="text-[#777777]">{label}</dt><dd className="text-[#d0d0d0]">{value ?? "—"}</dd></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)); }
function formatDuration(value: number) { return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`; }
