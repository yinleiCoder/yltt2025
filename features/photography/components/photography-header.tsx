import Link from "next/link";
import { Suspense } from "react";

import { PublicAuthControls } from "@/features/auth/components/public-auth-controls";

export function PhotographyHeader() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between border-b border-[#303030] px-5 py-5 sm:px-8 lg:px-12">
      <Link className="font-mono text-xs font-medium tracking-[0.18em]" href="/">
        YLTT2025
      </Link>
      <nav aria-label="公开页面" className="flex items-center gap-4 text-xs text-[#a8a8a8]">
        <Link className="text-[#f7f7f7] transition-colors hover:text-white" href="/photography">
          摄影
        </Link>
        <Link className="transition-colors hover:text-white" href="/videos">短片</Link>
        <Link className="transition-colors hover:text-white" href="/stories">故事</Link>
        <Link className="transition-colors hover:text-white" href="/#archive">
          档案
        </Link>
        <Suspense fallback={<Link className="border border-[#3b3b3b] px-2.5 py-1.5 text-[#f7f7f7] transition-colors hover:border-white" href="/login">登录</Link>}>
          <PublicAuthControls />
        </Suspense>
      </nav>
    </header>
  );
}
