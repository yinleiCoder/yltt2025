import type { ReactNode } from "react";

import { SiteHeader } from "@/features/site/components/site-header";
import { CurrentUserProvider } from "@/features/auth/components/current-user-provider";
import { getCurrentProfile } from "@/features/auth/server/auth-service";

export default async function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const currentUser = await getCurrentProfile();
  return (
    <CurrentUserProvider initialUser={currentUser}>
      <div className="min-h-dvh bg-[rgb(233,233,233)] text-[#222222]">
        <SiteHeader />
        {children}
      </div>
    </CurrentUserProvider>
  );
}
