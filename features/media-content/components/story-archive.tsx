import Link from "next/link";

import type {
  PublicStoryArchive,
  PublicStoryItem,
} from "@/features/content/server/public-media-content-service";

export function StoryArchive({ archive }: { archive: PublicStoryArchive }) {
  return (
    <main className="min-h-dvh bg-[rgb(233,233,233)] text-[#222222]">
      <section className="container mx-auto w-full px-5 pb-20 pt-12 sm:px-8 lg:px-12 lg:pt-20">
        <div className="grid gap-8 border-b border-[#d2d2d2] pb-10 lg:grid-cols-[1fr_22rem] lg:items-end">
          <div>
            <p className="font-mono text-[0.7rem] text-[#222222]">
              STORIES / PRIVATE NOTES
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-editorial)] text-5xl leading-[1.02] sm:text-7xl">
              把相遇写成故事
            </h1>
          </div>
          <p className="max-w-sm text-sm leading-7 text-[#222222]">
            关于恋爱、时间和一起走过的地方。正文以安全 Markdown 保存与展示。
          </p>
        </div>
        {archive.items.length ? (
          <div className="mt-8 divide-y divide-[#d2d2d2] border-y border-[#d2d2d2] bg-[rgb(248,248,248)]">
            {archive.items.map((item, index) => (
              <StoryCard index={index} item={item} key={item.id} />
            ))}
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center border-b border-[#d2d2d2] bg-[rgb(248,248,248)] py-12 text-center">
            <div>
              <p className="font-[family-name:var(--font-editorial)] text-3xl">
                等待一段故事。
              </p>
              <p className="mt-3 text-sm text-[#222222]">
                管理员发布故事后，它会出现在这里。
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function StoryCard({ item, index }: { item: PublicStoryItem; index: number }) {
  return (
    <article>
      <Link
        className="grid gap-4 py-6 transition-colors hover:bg-[#FFF083] sm:grid-cols-[5rem_1fr_auto] sm:items-center sm:px-4"
        href={`/stories/${item.slug}`}
      >
        <p className="font-mono text-xs text-[#222222]">
          {String(index + 1).padStart(2, "0")}
        </p>
        <div>
          <p className="font-mono text-[0.65rem] text-[#222222]">
              {formatDate(item.occurredAt ?? item.publishedAt)}
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-editorial)] text-3xl leading-tight">
            {item.title}
          </h2>
          {item.location ? <p className="mt-2 text-xs text-[#222222]">{formatLocation(item.location)}</p> : null}
          {item.excerpt ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#222222]">
              {item.excerpt}
            </p>
          ) : null}
        </div>
        <p className="font-mono text-[0.65rem] text-[#222222]">READ / OPEN</p>
      </Link>
    </article>
  );
}

function formatLocation(location: NonNullable<PublicStoryItem["location"]>) {
  return "label" in location ? `${location.label} / ${location.city}` : `${location.city} / ${location.region}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
