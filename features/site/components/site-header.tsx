import Link from "next/link";
import { Suspense } from "react";
import { LogIn, UserPlus } from "lucide-react";

import { PublicAuthControls } from "@/features/auth/components/public-auth-controls";

export function SiteHeader() {
  return (
    <header className="container mx-auto flex w-full items-center justify-between px-5 py-5 sm:px-8 lg:px-12 sticky top-0 bg-[rgb(233,233,233)] z-50">
      <Link
        className="font-mono text-xs font-extrabold tracking-[0.18em]"
        href="/"
      >
        YlTt's 2025
      </Link>
      <nav
        aria-label="公开页面"
        className="flex items-center gap-3 text-xs text-[#222222] sm:gap-4"
      >
        <Link
          className="hidden text-[#222222] transition-colors hover:bg-[#FFF083] sm:inline"
          href="/photography"
        >
          摄影
        </Link>
        <Link
          className="hidden transition-colors hover:bg-[#FFF083] sm:inline"
          href="/videos"
        >
          短片
        </Link>
        <Link
          className="hidden transition-colors hover:bg-[#FFF083] sm:inline"
          href="/stories"
        >
          故事
        </Link>
        <Suspense fallback={<AuthControlsFallback />}>
          <PublicAuthControls surface="light" />
        </Suspense>
      </nav>
    </header>
  );
}

function AuthControlsFallback() {
  return (
    <div className="flex items-center gap-2">
      <Link
        className="inline-flex h-7 items-center gap-1 border border-[#d2d2d2] px-2.5 text-[#222222] transition-colors hover:bg-[#FFF083]"
        href="/login"
      >
        <LogIn size={18} aria-hidden="true" data-icon="inline-start" />
        登录
      </Link>
      <Link
        className="inline-flex h-7 items-center gap-1 border border-[#d2d2d2] px-2.5 text-[#222222] transition-colors hover:bg-[#FFF083]"
        href="/register"
      >
        <UserPlus size={18} aria-hidden="true" data-icon="inline-start" />
        注册
      </Link>
    </div>
  );
}
