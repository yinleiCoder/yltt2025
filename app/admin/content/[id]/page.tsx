import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ContentForm } from "@/features/admin/components/content-form";
import { DeleteContentForm } from "@/features/admin/components/delete-content-form";
import { updateContentAction } from "@/features/content/server/actions";
import { getAdminContentItem } from "@/features/content/server/content-admin-service";

type AdminContentDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminContentDetailPage({ params }: AdminContentDetailProps) {
  const { id } = await params;
  const item = await getAdminContentItem(id);
  if (!item) notFound();

  return (
    <main className="py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{item.kind.toUpperCase()} / {item.slug}</p>
          <h1 className="mt-2 text-3xl font-semibold">{item.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href="#edit" />} variant="outline">Edit</Button>
          <Button nativeButton={false} render={<Link href="/admin/content/new" />} variant="outline">New item</Button>
          <DeleteContentForm id={item.id} />
        </div>
      </div>

      <dl className="mt-8 grid gap-px border-y sm:grid-cols-2">
        <DetailRow label="Status" value={item.publishedAt ? `Published ${formatDate(item.publishedAt)}` : "Draft"} />
        <DetailRow label="Featured" value={item.isFeatured ? "Yes" : "No"} />
        <DetailRow label="Location visibility" value={item.locationVisibility} />
        <DetailRow label="Location" value={formatLocation(item)} />
        <DetailRow label="Media object" value={item.photo?.objectKey ?? item.video?.objectKey ?? item.coverObjectKey} />
        {item.photo ? <>
          <DetailRow label="Camera" value={[item.photo.cameraMake, item.photo.cameraModel].filter(Boolean).join(" ")} />
          <DetailRow label="Lens" value={item.photo.lens} />
          <DetailRow label="Aperture / ISO" value={[item.photo.aperture ? `f/${item.photo.aperture}` : null, item.photo.iso ? `ISO ${item.photo.iso}` : null].filter(Boolean).join(" / ")} />
        </> : null}
        {item.video ? <DetailRow label="Video" value={[item.video.codec, item.video.durationSeconds ? `${item.video.durationSeconds}s` : null].filter(Boolean).join(" / ")} /> : null}
      </dl>

      {item.excerpt ? <section className="border-b py-8"><h2 className="text-sm font-medium text-muted-foreground">Excerpt</h2><p className="mt-3 max-w-2xl leading-7">{item.excerpt}</p></section> : null}
      {item.markdownBody ? <section className="border-b py-8"><h2 className="text-sm font-medium text-muted-foreground">Markdown body</h2><pre className="mt-3 max-w-3xl overflow-x-auto whitespace-pre-wrap text-sm leading-7">{item.markdownBody}</pre></section> : null}

      <section className="border-t pt-8" id="edit">
        <h2 className="text-sm font-medium text-muted-foreground">Edit content</h2>
        <ContentForm action={updateContentAction} initialValues={item} mode="edit" />
      </section>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return <div className="border-b p-4 last:border-b-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-2 break-words text-sm">{value || "—"}</dd></div>;
}

function formatLocation(item: Awaited<ReturnType<typeof getAdminContentItem>>) {
  if (!item || item.locationVisibility === "hidden") return "Hidden";
  if (item.locationVisibility === "city") return [item.city, item.region].filter(Boolean).join(" / ");
  return [item.locationLabel, item.city, item.region, item.latitude, item.longitude].filter((value) => value !== null && value !== undefined).join(" / ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
