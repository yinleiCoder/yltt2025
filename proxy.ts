import type { NextRequest } from "next/server";

import { shouldRefreshSupabaseSession } from "@/features/auth/domain/session-refresh-policy";
import { hasPublicSupabaseEnvironment } from "@/lib/env";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (!shouldRefreshSupabaseSession(hasPublicSupabaseEnvironment())) {
    return;
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
