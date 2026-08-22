import { LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/server/actions";
import {
  AdminDesktopNavigation,
  AdminMobileNavigation,
} from "./admin-navigation";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="admin-surface min-h-dvh bg-muted/30 md:flex">
      <aside className="hidden w-60 shrink-0 border-r bg-background md:block">
        <div className="sticky top-0 flex h-dvh flex-col px-3 py-5">
          <Link className="px-2.5 text-sm font-semibold" href="/">
            YlTt2025
          </Link>
          <p className="mt-1 px-2.5 text-xs text-muted-foreground">后台管理</p>
          <div className="mt-8">
            <AdminDesktopNavigation />
          </div>
          <form action={signOutAction} className="mt-auto">
            <Button className="w-full justify-start" type="submit" variant="ghost">
              <LogOut aria-hidden="true" data-icon="inline-start" />
              退出登录
            </Button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <AdminMobileNavigation />
            <Link className="text-sm font-semibold" href="/">YlTt2025</Link>
          </div>
          <form action={signOutAction}>
            <Button size="sm" type="submit" variant="ghost">
              <LogOut aria-hidden="true" data-icon="inline-start" />
              退出登录
            </Button>
          </form>
        </header>
        {children}
      </div>
    </div>
  );
}
