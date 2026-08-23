import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ContentForm } from "@/features/admin/components/content-form";
import { DeleteContentForm } from "@/features/admin/components/delete-content-form";
import { StoryMarkdown } from "@/features/content/components/story-markdown";
import { updateContentAction } from "@/features/content/server/actions";
import { getAdminContentItem } from "@/features/content/server/content-admin-service";

type AdminContentDetailProps = {
  params: Promise<{ id: string }>;
};

const contentKindLabels = {
  photo: "摄影",
  story: "故事",
  video: "短片",
} as const;

export default async function AdminContentDetailPage({ params }: AdminContentDetailProps) {
  const { id } = await params;
  const item = await getAdminContentItem(id);
  if (!item) notFound();

  return (
    <main className="container mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
        <div>
          <p className="text-sm text-muted-foreground">{contentKindLabels[item.kind]} · {item.slug}</p>
          <h1 className="mt-1 text-2xl font-semibold">{item.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href="#edit" />} variant="outline">编辑内容</Button>
          <Button nativeButton={false} render={<Link href="/admin/content/new" />} variant="outline">新建内容</Button>
          <DeleteContentForm id={item.id} />
        </div>
      </div>

      <dl className="mt-8 grid gap-px border-y sm:grid-cols-2">
        <DetailRow label="发布状态" value={item.publishedAt ? `已发布 · ${formatDate(item.publishedAt)}` : "草稿"} />
        {item.kind === "story" ? <DetailRow label="故事发生日期" value={item.occurredAt ? formatDate(item.occurredAt) : null} /> : null}
        <DetailRow label="首页精选" value={item.isFeatured ? "是" : "否"} />
        <DetailRow label="地点公开范围" value={locationVisibilityLabel(item.locationVisibility)} />
        <DetailRow label="地点" value={formatLocation(item)} />
        <DetailRow label="媒体对象" value={item.photo?.objectKey ?? item.video?.objectKey ?? item.coverObjectKey} />
        {item.photo ? <>
          <DetailRow label="相机" value={[item.photo.cameraMake, item.photo.cameraModel].filter(Boolean).join(" ")} />
          <DetailRow label="镜头" value={item.photo.lens} />
          <DetailRow label="光圈 / ISO" value={[item.photo.aperture ? `f/${item.photo.aperture}` : null, item.photo.iso ? `ISO ${item.photo.iso}` : null].filter(Boolean).join(" / ")} />
        </> : null}
        {item.video ? <DetailRow label="视频" value={[item.video.codec, item.video.durationSeconds ? `${item.video.durationSeconds} 秒` : null].filter(Boolean).join(" / ")} /> : null}
      </dl>

      {item.excerpt ? <section className="border-b py-8"><h2 className="text-sm font-medium text-muted-foreground">摘要</h2><p className="mt-3 max-w-2xl leading-7">{item.excerpt}</p></section> : null}
      {item.markdownBody ? <section className="border-b py-8"><h2 className="text-sm font-medium text-muted-foreground">正文预览</h2><div className="prose prose-neutral mt-3 max-w-3xl dark:prose-invert"><StoryMarkdown markdown={item.markdownBody} /></div></section> : null}

      <section className="border-t pt-8" id="edit">
        <h2 className="text-sm font-medium text-muted-foreground">编辑内容</h2>
        <ContentForm action={updateContentAction} initialValues={item} mode="edit" />
      </section>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return <div className="border-b p-4 last:border-b-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-2 break-words text-sm">{value || "—"}</dd></div>;
}

function formatLocation(item: Awaited<ReturnType<typeof getAdminContentItem>>) {
  if (!item || item.locationVisibility === "hidden") return "不公开";
  if (item.locationVisibility === "city") return [item.city, item.region].filter(Boolean).join(" / ");
  return [item.locationLabel, item.city, item.region, item.latitude, item.longitude].filter((value) => value !== null && value !== undefined).join(" / ");
}

function locationVisibilityLabel(value: "precise" | "city" | "hidden") {
  if (value === "precise") return "公开精确地点";
  if (value === "city") return "仅城市和地区";
  return "不公开";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
