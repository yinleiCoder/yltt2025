import Link from "next/link";
import type { ReactNode } from "react";

import type { PublicPhotographyItem } from "@/features/content/server/public-photography-service";
import { PhotoLightbox } from "@/features/media/components/photo-lightbox";

export function PhotographyDetail({
  photo,
  comments,
}: {
  photo: PublicPhotographyItem;
  comments: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-[rgb(233,233,233)] text-[#222222]">
      <article className="container mx-auto w-full bg-[rgb(248,248,248)] px-5 pb-20 pt-8 sm:px-8 lg:px-12 lg:pt-12">
        <Link
          className="font-mono text-[0.7rem] text-[#222222] transition-colors hover:bg-[#FFF083] hover:text-[#222222]"
          href="/photography"
        >
          ← BACK TO PHOTOGRAPHY
        </Link>
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
          <figure className="min-w-0 border border-[#d9d9d4] bg-transparent rounded-md overflow-hidden">
            <div className="overflow-hidden bg-[#242424]">
              {photo.imageUrl ? (
                <PhotoLightbox
                  alt={photo.media.altText ?? photo.title}
                  className="h-auto max-h-[78dvh] w-full object-cover"
                  src={photo.imageUrl}
                />
              ) : (
                <div className="grid aspect-[3/2] place-items-center font-mono text-xs text-[#989898]">
                  MEDIA / PENDING
                </div>
              )}
            </div>
            {photo.media.altText ? (
              <figcaption className="px-1 pb-1 pt-4 text-xs leading-5 text-[#222222]">
                {photo.media.altText}
              </figcaption>
            ) : null}
          </figure>

          <div>
            <p className="font-mono text-[0.7rem] text-[#222222]">
              PHOTOGRAPH / {formatDate(photo.publishedAt)}
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-editorial)] text-5xl leading-[1.02] sm:text-6xl">
              {photo.title}
            </h1>
            {photo.excerpt ? (
              <p className="mt-6 text-sm leading-7 text-[#222222]">
                {photo.excerpt}
              </p>
            ) : null}

            <section
              className="mt-10 border-t border-[#d9d9d4] pt-5"
              aria-labelledby="photo-index-title"
            >
              <h2
                className="font-mono text-[0.7rem] text-[#222222]"
                id="photo-index-title"
              >
                IMAGE INDEX
              </h2>
              <dl className="mt-4 divide-y divide-[#d9d9d4] border-y border-[#d9d9d4] font-mono text-xs">
                <IndexRow
                  label="APERTURE"
                  value={
                    photo.media.aperture ? `f/${photo.media.aperture}` : null
                  }
                />
                <IndexRow label="EXPOSURE" value={photo.media.shutterSpeed} />
                <IndexRow
                  label="ISO"
                  value={photo.media.iso ? String(photo.media.iso) : null}
                />
                <IndexRow
                  label="FOCAL LENGTH"
                  value={
                    photo.media.focalLengthMm
                      ? `${photo.media.focalLengthMm}mm`
                      : null
                  }
                />
                <IndexRow
                  label="CAMERA"
                  value={
                    [photo.media.cameraMake, photo.media.cameraModel]
                      .filter(Boolean)
                      .join(" ") || null
                  }
                />
                <IndexRow label="LENS" value={photo.media.lens} />
                <IndexRow
                  label="CAPTURED"
                  value={
                    photo.media.capturedAt
                      ? formatDate(photo.media.capturedAt)
                      : null
                  }
                />
                <IndexRow label="LOCATION" value={formatLocation(photo)} />
              </dl>
            </section>
          </div>
        </div>
        {comments}
      </article>
    </main>
  );
}

function IndexRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-4 py-3">
      <dt className="text-[#222222]">{label}</dt>
      <dd className="min-w-0 truncate text-[#222222]">{value ?? "—"}</dd>
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
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
