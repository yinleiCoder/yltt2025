import { NextResponse, type NextRequest } from "next/server";

import { resolveAuthRedirectPath } from "@/features/auth/domain/redirect-path";
import { getAuthErrorRedirectPath } from "@/features/auth/domain/auth-feedback";
import { getPublicEnvironment } from "@/lib/env";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = resolveAuthRedirectPath(request.nextUrl.searchParams.get("next"));
  const response = NextResponse.redirect(new URL(next, request.url));
  const authError = request.nextUrl.searchParams.get("error_code")
    ?? request.nextUrl.searchParams.get("error");

  if (authError) {
    return NextResponse.redirect(
      new URL(getAuthErrorRedirectPath(authError, next), request.url),
    );
  }

  if (!code) {
    return response;
  }

  const environment = getPublicEnvironment();
  const supabase = createServerClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(getAuthErrorRedirectPath("callback", next), request.url),
    );
  }

  return response;
}
