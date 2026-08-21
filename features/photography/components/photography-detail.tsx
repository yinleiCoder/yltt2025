import Link from "next/link";

import type { PublicPhotographyItem } from "@/features/content/server/public-photography-service";
import type { PublicComment } from "@/features/comments/server/comment-service";
import { CommentsSection } from "@/features/comments/components/comments-section";

import { PhotographyHeader } from "./photography-header";

export function PhotographyDetail({ photo, comments, isSignedIn, currentUserId }: { photo: PublicPhotographyItem; comments: PublicComment[]; isSignedIn: boolean; currentUserId: string | null }) {
  return (
    <main className="min-h-dvh bg-[#111111] text-[#f7f7f7]">
      <PhotographyHeader />
      <article className="mx-auto w-full max-w-7xl px-5 pb-20 pt-8 sm:px-8 lg:px-12 lg:pt-12">
        <Link className="font-mono text-[0.7rem] text-[#a8a8a8] transition-colors hover:text-white" href="/photography">
          ← BACK TO PHOTOGRAPHY
        </Link>
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
          <figure className="min-w-0 border border-[#3a3a3a] bg-[#171717] p-2 sm:p-3">
            <div className="overflow-hidden bg-[#242424]">
              {photo.imageUrl ? (
                <img
                  alt={photo.media.altText ?? photo.title}
                  className="h-auto max-h-[78dvh] w-full object-contain"
                  decoding="async"
                  height={photo.media.height ?? 1600}
                  src={photo.imageUrl}
                  width={photo.media.width ?? 2400}
                />
              ) : (
                <div className="grid aspect-[4/3] place-items-center font-mono text-xs text-[#989898]">MEDIA / PENDING</div>
              )}
            </div>
            {photo.media.altText ? <figcaption className="px-1 pb-1 pt-4 text-xs leading-5 text-[#929292]">{photo.media.altText}</figcaption> : null}
          </figure>

          <div>
            <p className="font-mono text-[0.7rem] text-[#979797]">PHOTOGRAPH / {formatDate(photo.publishedAt)}</p>
            <h1 className="mt-4 font-[family-name:var(--font-editorial)] text-5xl leading-[1.02] sm:text-6xl">{photo.title}</h1>
            {photo.excerpt ? <p className="mt-6 text-sm leading-7 text-[#b2b2b2]">{photo.excerpt}</p> : null}

            <section className="mt-10 border-t border-[#303030] pt-5" aria-labelledby="photo-index-title">
              <h2 className="font-mono text-[0.7rem] text-[#979797]" id="photo-index-title">IMAGE INDEX</h2>
              <dl className="mt-4 divide-y divide-[#303030] border-y border-[#303030] font-mono text-xs">
                <IndexRow label="APERTURE" value={photo.media.aperture ? `f/${photo.media.aperture}` : null} />
                <IndexRow label="EXPOSURE" value={photo.media.shutterSpeed} />
                <IndexRow label="ISO" value={photo.media.iso ? String(photo.media.iso) : null} />
                <IndexRow label="FOCAL LENGTH" value={photo.media.focalLengthMm ? `${photo.media.focalLengthMm}mm` : null} />
                <IndexRow label="CAMERA" value={[photo.media.cameraMake, photo.media.cameraModel].filter(Boolean).join(" ") || null} />
                <IndexRow label="LENS" value={photo.media.lens} />
                <IndexRow label="CAPTURED" value={photo.media.capturedAt ? formatDate(photo.media.capturedAt) : null} />
                <IndexRow label="LOCATION" value={formatLocation(photo)} />
              </dl>
            </section>
          </div>
        </div>
        <CommentsSection comments={comments} contentId={photo.id} currentUserId={currentUserId} isSignedIn={isSignedIn} />
      </article>
    </main>
  );
}

function IndexRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-4 py-3">
      <dt className="text-[#777777]">{label}</dt>
      <dd className="min-w-0 truncate text-[#d0d0d0]">{value ?? "—"}</dd>
    </div>
  );
}

function formatLocation(photo: PublicPhotographyItem) {
  if (!photo.location) return "HIDDEN";
  if ("label" in photo.location) {
    return `${photo.location.label} / ${photo.location.city}`;
  }
  return `${photo.location.city} / ${photo.location.region}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
