import {
  Aperture,
  Clapperboard,
  FileText,
  GalleryHorizontalEnd,
} from "lucide-react";
import Link from "next/link";
import {
  type HomepageArchive,
  type HomepageArchiveItem,
} from "@/features/content/server/featured-content-service";

import { HomeArchiveMotion } from "./home-archive-motion";

type ArchiveHomeProps = {
  archive: HomepageArchive;
};

const cardLayouts = [
  "lg:col-span-7 lg:row-span-2",
  "lg:col-span-5",
  "lg:col-span-4",
  "lg:col-span-4 lg:row-span-2",
  "lg:col-span-4",
];

export function ArchiveHome({ archive }: ArchiveHomeProps) {
  const heroItem = archive.items.find((item) => item.media?.previewUrl) ?? archive.items[0];
  const archiveItems = heroItem
    ? archive.items.filter((item) => item.id !== heroItem.id)
    : archive.items;

  return (
    <main className="min-h-dvh bg-[rgb(233,233,233)] text-[#222222]" id="home-archive">
      <HomeArchiveMotion />
      <section className="container mx-auto grid w-full gap-10 px-5 pb-18 pt-10 sm:px-8 lg:grid-cols-12 lg:gap-14 lg:px-12 lg:pb-24 lg:pt-16">
        <div className="flex flex-col justify-between lg:col-span-5">
          <div>
            <p className="font-mono text-[0.7rem] leading-5 text-[#222222]">YLTT2025 / 私人影像档案</p>
            <h1
              className="mt-6 max-w-xl font-[family-name:var(--font-editorial)] text-5xl leading-[1.02] text-pretty sm:text-6xl lg:text-7xl"
              data-home-title
            >
              光落下时，故事开始留影
            </h1>
            <p className="mt-7 max-w-md text-sm leading-7 text-[#222222]">
              摄影、短片与生活故事被收进同一组接触表。每一格保留发生的时间、光线与地点。
            </p>
          </div>
          <div className="mt-12 flex items-center gap-3 text-xs text-[#222222] lg:mt-20">
            <span className="h-px w-10 bg-[#222222]" />
            <span>持续整理中</span>
          </div>
        </div>
        <div className="lg:col-span-7">
          {heroItem ? (
            <HeroPlate item={heroItem} />
          ) : (
            <EmptyHero hasMediaConfiguration={archive.isMediaConfigured} />
          )}
        </div>
      </section>
      <ArchiveSection items={archiveItems} />
    </main>
  );
}

function HeroPlate({ item }: { item: HomepageArchiveItem }) {
  const media = item.media;

  return (
    <article className="border border-[#d2d2d2] bg-[rgb(248,248,248)] p-2 sm:p-3" data-home-hero-media>
      <div className="relative aspect-[4/5] overflow-hidden bg-[#232323] sm:aspect-[16/11]">
        {media?.previewUrl ? (
          <img
            alt={media.type === "photo" ? media.altText ?? item.title : `${item.title} 的视频封面`}
            className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.025]"
            decoding="async"
            fetchPriority="high"
            height={media.height ?? 900}
            src={media.previewUrl}
            width={media.width ?? 1200}
          />
        ) : (
          <PlatePlaceholder kind={item.kind} />
        )}
        <p className="absolute bottom-0 left-0 bg-[#FFF083] px-3 py-2 font-mono text-[0.65rem] text-[#222222]">
          {formatKind(item.kind)} / 精选
        </p>
      </div>
      <div className="grid gap-6 px-2 pb-2 pt-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <h2 className="font-[family-name:var(--font-editorial)] text-3xl leading-tight sm:text-4xl">{item.title}</h2>
          {item.excerpt ? <p className="mt-3 max-w-xl text-sm leading-6 text-[#222222]">{item.excerpt}</p> : null}
        </div>
        <ArchiveIndex item={item} />
      </div>
    </article>
  );
}

function EmptyHero({ hasMediaConfiguration }: { hasMediaConfiguration: boolean }) {
  return (
    <div className="flex min-h-[28rem] flex-col justify-between border border-dashed border-[#bcbcbc] bg-[rgb(248,248,248)] p-6 sm:p-8" data-home-hero-media>
      <GalleryHorizontalEnd className="size-7 text-[#222222]" strokeWidth={1.25} />
      <div>
        <h2 className="font-[family-name:var(--font-editorial)] text-4xl leading-tight">第一张精选作品会在这里显影。</h2>
        <p className="mt-4 max-w-md text-sm leading-7 text-[#222222]">
          {hasMediaConfiguration
            ? "使用管理员后台上传并发布作品后，它会自动进入首页档案。"
            : "配置媒体读取域名并在管理员后台发布作品后，首页会自动建立接触表。"}
        </p>
      </div>
    </div>
  );
}

function ArchiveSection({ items }: { items: HomepageArchiveItem[] }) {
  return (
    <section id="archive">
      <div className="container mx-auto w-full px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="flex flex-col justify-between gap-4 border-b border-[#d2d2d2] pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[0.7rem] text-[#222222]">影像接触表</p>
            <h2 className="mt-3 font-[family-name:var(--font-editorial)] text-4xl leading-tight sm:text-5xl">精选档案</h2>
          </div>
          <p className="max-w-xs text-sm leading-6 text-[#222222]">每一个画幅都由后台的精选标记驱动，并保留相应的影像索引。</p>
        </div>
        {items.length ? (
          <div className="mt-8 grid auto-rows-[16rem] gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:auto-rows-[13rem]">
            {items.map((item, index) => (
              <ArchiveCard className={cardLayouts[index % cardLayouts.length]} item={item} key={item.id} />
            ))}
          </div>
        ) : (
          <div className="grid min-h-52 place-items-center border-b border-[#d2d2d2] bg-[rgb(248,248,248)] py-10 text-center">
            <div>
              <p className="font-[family-name:var(--font-editorial)] text-2xl">等待下一格画面。</p>
              <p className="mt-3 text-sm text-[#222222]">已发布的精选摄影、短片和故事会出现在这里。</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ArchiveCard({ className, item }: { className: string; item: HomepageArchiveItem }) {
  const media = item.media;

  return (
    <article className={`group relative min-w-0 overflow-hidden border border-[#d2d2d2] bg-[rgb(248,248,248)] ${className}`} data-archive-card>
      {media?.previewUrl ? (
        <img
          alt={media.type === "photo" ? media.altText ?? item.title : `${item.title} 的视频封面`}
          className="absolute inset-0 h-full w-full object-cover opacity-85 transition-all duration-700 group-hover:scale-[1.025] group-hover:opacity-100"
          decoding="async"
          height={media.height ?? 720}
          loading="lazy"
          src={media.previewUrl}
          width={media.width ?? 960}
        />
      ) : (
        <PlatePlaceholder kind={item.kind} />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(8,8,8,0.92),rgba(8,8,8,0))] px-4 pb-4 pt-14">
        <p className="font-mono text-[0.65rem] text-[#c4c4c4]">{formatKind(item.kind)} / {formatDate(item.publishedAt)}</p>
        <h3 className="mt-2 font-[family-name:var(--font-editorial)] text-2xl leading-tight">{item.title}</h3>
        <div className="mt-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArchiveIndex compact item={item} />
        </div>
      </div>
    </article>
  );
}

function PlatePlaceholder({ kind }: { kind: HomepageArchiveItem["kind"] }) {
  const Icon = kind === "photo" ? Aperture : kind === "video" ? Clapperboard : FileText;

  return (
    <div className="absolute inset-0 grid place-items-center bg-[#242424] text-[#a6a6a6]">
      <Icon aria-hidden="true" className="size-7" strokeWidth={1.2} />
    </div>
  );
}

function ArchiveIndex({ compact = false, item }: { compact?: boolean; item: HomepageArchiveItem }) {
  const rows = getIndexRows(item, compact);
  const valueClassName = compact ? "text-[#f8f8f8]" : "text-[#222222]";

  return (
    <dl className={`font-mono text-[0.65rem] leading-5 ${valueClassName}`} data-home-hero-index={!compact || undefined}>
      {rows.map((row) => (
        <div className="flex gap-2" key={row.label}>
          <dt className={compact ? "text-[#f8f8f8]" : "text-[#222222]"}>{row.label}</dt>
          <dd className="min-w-0 truncate">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function getIndexRows(item: HomepageArchiveItem, compact: boolean) {
  const rows = [{ label: "日期", value: formatDate(item.publishedAt) }];
  const location = formatLocation(item);
  if (location) rows.push({ label: "地点", value: location });

  if (item.media?.type === "photo") {
    const photoRows = [
      item.media.aperture ? { label: "镜头", value: `f/${item.media.aperture}` } : null,
      item.media.shutterSpeed ? { label: "曝光", value: item.media.shutterSpeed } : null,
      item.media.iso ? { label: "感光度", value: String(item.media.iso) } : null,
    ].filter((row): row is { label: string; value: string } => Boolean(row));

    rows.push(...(compact ? photoRows.slice(0, 1) : photoRows));
  }

  return compact ? rows.slice(0, 2) : rows;
}

function formatKind(kind: HomepageArchiveItem["kind"]) {
  return kind === "photo" ? "摄影" : kind === "video" ? "短片" : "故事";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", year: "numeric" }).format(new Date(value));
}

function formatLocation(item: HomepageArchiveItem) {
  if (!item.location) return null;
  if ("label" in item.location) return item.location.label;
  return [item.location.city, item.location.region].filter(Boolean).join(" / ");
}
