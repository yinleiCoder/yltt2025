"use client";

import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/features/auth/server/actions";
import type { CurrentProfile } from "@/features/auth/server/auth-service";
import { cn } from "@/lib/utils";

function getProfileInitial(displayName: string | null): string {
  return displayName?.trim().slice(0, 1).toUpperCase() || "用";
}

export function ProfileMenu({
  profile,
  surface = "light",
}: {
  profile: CurrentProfile;
  surface?: "dark" | "light";
}) {
  const displayName = profile.displayName?.trim() || "用户";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="打开账户菜单"
        render={<button type="button" />}
        className={cn(
          "rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          surface === "dark" ? "focus-visible:ring-offset-foreground" : "focus-visible:ring-offset-background",
        )}
        data-icon="account"
      >
        <Avatar className={cn("border-border bg-muted text-foreground", surface === "dark" && "border-background/30 bg-foreground text-background")}>
          {profile.avatarUrl ? (
            <AvatarImage alt={`${displayName}的头像`} src={profile.avatarUrl} />
          ) : null}
          <AvatarFallback className={cn("bg-secondary font-medium text-secondary-foreground", surface === "dark" && "bg-muted-foreground text-background")}>
            {getProfileInitial(profile.displayName)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-44 border border-border bg-popover shadow-none text-popover-foreground"
      >
        <div className="truncate px-1.5 py-1 text-xs font-medium text-muted-foreground">{displayName}</div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem nativeButton={false} render={<Link href="/profile" />}>
            <UserRound data-icon="inline-start" />
            个人中心
          </DropdownMenuItem>
          {profile.role === "admin" ? (
            <DropdownMenuItem nativeButton={false} render={<Link href="/admin" />}>
              <ShieldCheck data-icon="inline-start" />
              管理后台
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <form action={signOutAction}>
            <DropdownMenuItem
              nativeButton
              render={<button type="submit" />}
              variant="destructive"
              className="w-full"
            >
              <LogOut data-icon="inline-start" />
              退出登录
            </DropdownMenuItem>
          </form>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
