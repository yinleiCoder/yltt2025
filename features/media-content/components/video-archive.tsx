import Link from "next/link";

import type { PublicVideoArchive, PublicVideoItem } from "@/features/content/server/public-media-content-service";

export function VideoArchive({ archive }: { archive: PublicVideoArchive }) {
  return (
    <main className="min-h-dvh bg-[rgb(233,233,233)] text-[#222222]">
      <section className="container mx-auto w-full px-5 pb-20 pt-12 sm:px-8 lg:px-12 lg:pt-20">
        <div className="grid gap-8 border-b border-[#d2d2d2] pb-10 lg:grid-cols-[1fr_22rem] lg:items-end">
          <div>
            <p className="font-mono text-[0.7rem] text-[#222222]">MOTION / SHORT FILMS</p>
            <h1 className="mt-4 font-[family-name:var(--font-editorial)] text-5xl leading-[1.02] sm:text-7xl">让画面继续移动</h1>
          </div>
          <p className="max-w-sm text-sm leading-7 text-[#222222]">支持 MP4。每段短片保留时长与播放状态。</p>
        </div>

        {archive.items.length ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {archive.items.map((item, index) => <VideoCard index={index} item={item} key={item.id} />)}
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center border-b border-[#d2d2d2] bg-[rgb(248,248,248)] py-12 text-center">
            <div>
              <p className="font-[family-name:var(--font-editorial)] text-3xl">等待下一段移动影像。</p>
              <p className="mt-3 text-sm text-[#222222]">管理员发布短片后，它会出现在这里。</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function VideoCard({ item, index }: { item: PublicVideoItem; index: number }) {
  return (
      <article className="group border border-[#d9d9d4] bg-[rgb(248,248,248)]">
      <Link className="block" href={`/videos/${item.slug}`}>
        <div className="relative aspect-video overflow-hidden bg-[#242424]">
          {item.posterUrl ? <img alt={`${item.title} 的视频封面`} className="h-full w-full object-cover opacity-90 transition-all duration-700 group-hover:scale-[1.025] group-hover:opacity-100" decoding="async" height={item.videoDetails.height ?? 1080} loading={index < 3 ? "eager" : "lazy"} src={item.posterUrl} width={item.videoDetails.width ?? 1920} /> : <div className="grid h-full place-items-center font-mono text-xs text-[#989898]">MOTION / PENDING</div>}
          <span className="absolute bottom-0 left-0 bg-[#FFF083] px-3 py-2 font-mono text-[0.65rem] text-[#222222]">{String(index + 1).padStart(2, "0")}</span>
        </div>
        <div className="flex items-end justify-between gap-4 px-4 py-4">
          <div><p className="font-mono text-[0.65rem] text-[#222222]">{formatDate(item.publishedAt)}</p><h2 className="mt-2 font-[family-name:var(--font-editorial)] text-2xl leading-tight">{item.title}</h2>{item.location ? <p className="mt-2 text-xs text-[#222222]">{formatLocation(item.location)}</p> : null}</div>
          <p className="font-mono text-[0.65rem] text-[#222222]">{item.videoDetails.durationSeconds ? formatDuration(item.videoDetails.durationSeconds) : "OPEN"}</p>
        </div>
      </Link>
    </article>
  );
}

function formatDate(value: string) { return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)); }
function formatDuration(value: number) { return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`; }
function formatLocation(location: NonNullable<PublicVideoItem["location"]>) { return "label" in location ? `${location.label} / ${location.city}` : `${location.city} / ${location.region}`; }
