import { LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/server/actions";

const navigation = [
  ["Overview", "/admin"],
  ["Content", "/admin/content/new"],
  ["Users", "/admin/users"],
  ["Comments", "/admin/comments"],
  ["Audit", "/admin/audit"],
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-6xl px-6 py-8">
      <header className="border-b pb-6">
        <div className="flex items-center justify-between gap-4">
          <Link className="text-sm font-medium" href="/">YlTt2025</Link>
          <form action={signOutAction}>
            <Button size="sm" type="submit" variant="ghost">
              <LogOut aria-hidden="true" data-icon="inline-start" />
              退出
            </Button>
          </form>
        </div>
        <nav className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {navigation.map(([label, href]) => <Link className="hover:text-foreground" href={href} key={href}>{label}</Link>)}
        </nav>
      </header>
      {children}
    </div>
  );
}
