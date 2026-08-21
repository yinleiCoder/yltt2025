import Link from "next/link";

import type { PublicPhotographyArchive, PublicPhotographyItem } from "@/features/content/server/public-photography-service";

import { PhotographyHeader } from "./photography-header";

export function PhotographyArchive({ archive }: { archive: PublicPhotographyArchive }) {
  return (
    <main className="min-h-dvh bg-[#111111] text-[#f7f7f7]">
      <PhotographyHeader />
      <section className="mx-auto w-full max-w-7xl px-5 pb-20 pt-12 sm:px-8 lg:px-12 lg:pt-20">
        <div className="grid gap-8 border-b border-[#303030] pb-10 lg:grid-cols-[1fr_22rem] lg:items-end">
          <div>
            <p className="font-mono text-[0.7rem] text-[#979797]">PHOTOGRAPHY / CONTACT SHEETS</p>
            <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-editorial)] text-5xl leading-[1.02] sm:text-7xl">
              把光线收进一页档案。
            </h1>
          </div>
          <p className="max-w-sm text-sm leading-7 text-[#a8a8a8]">
            每一张照片都保留拍摄时的参数索引。地点只按作者选择的隐私等级公开。
          </p>
        </div>

        {archive.items.length ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {archive.items.map((item, index) => (
              <PhotographyCard index={index} item={item} key={item.id} />
            ))}
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center border-b border-[#303030] py-12 text-center">
            <div>
              <p className="font-[family-name:var(--font-editorial)] text-3xl">等待第一张照片显影。</p>
              <p className="mt-3 text-sm text-[#9b9b9b]">
                {archive.isMediaConfigured
                  ? "管理员发布摄影作品后，它会出现在这里。"
                  : "配置媒体读取域名并发布摄影作品后，它会出现在这里。"}
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function PhotographyCard({ item, index }: { item: PublicPhotographyItem; index: number }) {
  return (
    <article className="group min-w-0 border border-[#343434] bg-[#171717]">
      <Link className="block" href={`/photography/${item.slug}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-[#242424]">
          {item.imageUrl ? (
            <img
              alt={item.media.altText ?? item.title}
              className="h-full w-full object-cover opacity-90 transition-[transform,opacity] duration-700 group-hover:scale-[1.025] group-hover:opacity-100"
              decoding="async"
              height={item.media.height ?? 900}
              loading={index < 3 ? "eager" : "lazy"}
              src={item.imageUrl}
              width={item.media.width ?? 1200}
            />
          ) : (
            <div className="grid h-full place-items-center font-mono text-xs text-[#989898]">MEDIA / PENDING</div>
          )}
          <span className="absolute bottom-0 left-0 bg-[#111111]/90 px-3 py-2 font-mono text-[0.65rem] text-[#d6d6d6]">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="font-mono text-[0.65rem] text-[#929292]">{formatDate(item.publishedAt)}</p>
            <h2 className="mt-2 font-[family-name:var(--font-editorial)] text-2xl leading-tight">{item.title}</h2>
          </div>
          <p className="font-mono text-[0.65rem] text-[#a8a8a8]">OPEN / VIEW</p>
        </div>
      </Link>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
