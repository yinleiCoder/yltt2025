import { LogIn, LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";

import { getCurrentProfile } from "@/features/auth/server/auth-service";
import { signOutAction } from "@/features/auth/server/actions";

const controlClassName =
  "inline-flex h-7 items-center justify-center gap-1 border border-[#3b3b3b] px-2.5 text-[0.8rem] font-medium text-[#f7f7f7] transition-colors hover:border-white";

export async function PublicAuthControls() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <Link className={controlClassName} href="/login">
        <LogIn aria-hidden="true" />
        登录
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {profile.role === "admin" ? (
        <Link className={controlClassName} href="/admin">
          <ShieldCheck aria-hidden="true" />
          后台
        </Link>
      ) : (
        <span className="inline-flex h-7 items-center gap-1 px-1 text-[0.8rem] text-[#b8b8b8]">
          <UserRound aria-hidden="true" />
          已登录
        </span>
      )}
      <form action={signOutAction}>
        <button className={controlClassName} type="submit">
          <LogOut aria-hidden="true" />
          退出
        </button>
      </form>
    </div>
  );
}
