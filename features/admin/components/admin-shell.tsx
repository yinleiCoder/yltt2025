import Link from "next/link";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOutAction } from "@/features/auth/server/actions";
import { AdminSignOutButton } from "@/features/admin/components/admin-sign-out-button";
import type { CurrentProfile } from "@/features/auth/server/auth-service";
import {
  AdminDesktopNavigation,
  AdminMobileNavigation,
} from "./admin-navigation";

function AdminAccountSummary({
  profile,
  compact = false,
}: {
  profile: CurrentProfile;
  compact?: boolean;
}) {
  const displayName = profile.displayName?.trim() || "管理员";

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar className="size-8">
        <AvatarImage alt={`${displayName}的头像`} src={profile.avatarUrl ?? undefined} />
        <AvatarFallback>{displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className={compact ? "max-w-20 truncate text-sm font-medium" : "truncate text-sm font-medium"}>
        {displayName}
      </span>
    </div>
  );
}

export function AdminShell({
  children,
  profile,
}: {
  children: ReactNode;
  profile: CurrentProfile;
}) {
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
          <div className="mt-auto space-y-3 px-2.5">
            <AdminAccountSummary profile={profile} />
            <form action={signOutAction}>
              <AdminSignOutButton />
            </form>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <AdminMobileNavigation />
            <Link className="text-sm font-semibold" href="/">YlTt2025</Link>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <AdminAccountSummary compact profile={profile} />
            <form action={signOutAction}>
              <AdminSignOutButton compact />
            </form>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
