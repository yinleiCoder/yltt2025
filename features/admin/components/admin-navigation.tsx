"use client";

import {
  ClipboardList,
  FilePenLine,
  LayoutDashboard,
  Menu,
  MessageSquareMore,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/admin", label: "概览", icon: LayoutDashboard },
  { href: "/admin/content", label: "内容管理", icon: FilePenLine },
  { href: "/admin/users", label: "用户管理", icon: UsersRound },
  { href: "/admin/comments", label: "评论审核", icon: MessageSquareMore },
  { href: "/admin/audit", label: "审计日志", icon: ClipboardList },
] as const;

function isNavigationItemActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname.startsWith(href.replace("/new", ""));
}

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="后台导航" className="flex flex-col gap-1">
      {navigation.map(({ href, icon: Icon, label }) => {
        const active = isNavigationItemActive(pathname, href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-2 rounded-md px-2.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              active && "bg-muted font-medium text-foreground",
            )}
            href={href}
            key={href}
            onClick={onNavigate}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminDesktopNavigation() {
  return <NavigationLinks />;
}

export function AdminMobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger
        aria-label="打开后台导航"
        render={<Button size="icon-sm" variant="ghost" />}
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent className="admin-surface w-[min(18rem,calc(100vw-2rem))]" showCloseButton={false} side="left">
        <SheetHeader className="flex-row items-center justify-between border-b p-4">
          <SheetTitle>后台管理</SheetTitle>
          <SheetClose aria-label="关闭后台导航" render={<Button size="icon-sm" variant="ghost" />}>
            <X aria-hidden="true" />
          </SheetClose>
        </SheetHeader>
        <div className="p-3">
          <NavigationLinks onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
