import { LogIn, UserPlus } from "lucide-react";
import Link from "next/link";

import { getCurrentProfile } from "@/features/auth/server/auth-service";
import { ProfileMenu } from "@/features/auth/components/profile-menu";
import { cn } from "@/lib/utils";

const controlClassName = "inline-flex h-7 items-center justify-center gap-1 border px-2.5 text-[0.8rem] font-medium transition-colors";

export async function PublicAuthControls({ surface = "light" }: { surface?: "dark" | "light" } = {}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <div className="flex items-center gap-2">
        <Link className={cn(controlClassName, surface === "dark" ? "border-background/25 text-background hover:border-background" : "border-border text-foreground hover:border-foreground")} href="/login">
          <LogIn size={18} aria-hidden="true" data-icon="inline-start" />
          登录
        </Link>
        <Link className={cn(controlClassName, surface === "dark" ? "border-background/25 text-background hover:border-background" : "border-border text-foreground hover:border-foreground")} href="/register">
          <UserPlus size={18} aria-hidden="true" data-icon="inline-start" />
          注册
        </Link>
      </div>
    );
  }

  return <ProfileMenu profile={profile} surface={surface} />;
}
