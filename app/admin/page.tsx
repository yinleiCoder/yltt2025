import { redirect } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  AdministratorRequiredError,
  AuthenticationRequiredError,
} from "@/features/auth/server/auth-service";
import { getAdminDashboardData } from "@/features/admin/server/admin-service";

export default async function AdminPage() {
  try {
    const dashboard = await getAdminDashboardData();

    return (
      <main className="mx-auto min-h-dvh w-full max-w-6xl px-6 py-10">
        <header className="flex items-start justify-between gap-6 border-b pb-8">
          <div>
            <p className="text-sm text-muted-foreground">YlTt2025</p>
            <h1 className="mt-2 text-3xl font-semibold">Archive administration</h1>
          </div>
          <Button nativeButton={false} render={<Link href="/" />}>View site</Button>
        </header>
        <section className="grid gap-px border-b sm:grid-cols-3">
          {[
            ["Content", dashboard.contentCount],
            ["Comments", dashboard.commentCount],
            ["Users", dashboard.userCount],
          ].map(([label, value]) => (
            <div className="py-8" key={String(label)}>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-4xl font-semibold">{value}</p>
            </div>
          ))}
        </section>
        <section className="py-10">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Recent content</h2>
            <Button nativeButton={false} render={<Link href="/admin/content/new" />}>New item</Button>
          </div>
          <div className="mt-6 divide-y border-y">
            {dashboard.recentContent.length ? dashboard.recentContent.map((item) => (
              <div className="flex items-center justify-between gap-4 py-4" key={item.id}>
                <div><p className="font-medium">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.kind} {item.publishedAt ? "published" : "draft"}</p></div>
                <Button nativeButton={false} render={<Link href={`/admin/content/${item.id}`} />} size="sm" variant="ghost">Open</Button>
              </div>
            )) : <p className="py-8 text-sm text-muted-foreground">No content has been created yet.</p>}
          </div>
        </section>
      </main>
    );
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/login?next=/admin");
    }

    if (error instanceof AdministratorRequiredError) {
      redirect("/");
    }

    throw error;
  }
}
