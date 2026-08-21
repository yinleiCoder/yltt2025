"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  getAuthErrorMessage,
  parseAuthCredentials,
  type AuthActionState,
} from "@/features/auth/domain/auth-feedback";
import { resolveAuthRedirectPath } from "@/features/auth/domain/redirect-path";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const credentials = parseAuthCredentials(
    formData.get("email"),
    formData.get("password"),
  );
  if ("error" in credentials) return credentials;

  const next = resolveAuthRedirectPath(String(formData.get("next") ?? "/"));
  let authError: unknown;

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword(credentials.value);
    authError = error;
  } catch (error) {
    authError = error;
  }

  if (authError) return { error: getAuthErrorMessage(authError) };
  redirect(next);
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const credentials = parseAuthCredentials(
    formData.get("email"),
    formData.get("password"),
  );
  if ("error" in credentials) return credentials;

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "http://localhost:3000";
  const next = resolveAuthRedirectPath(String(formData.get("next") ?? "/"));
  let authError: unknown;

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signUp({
      ...credentials.value,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    authError = error;
  } catch (error) {
    authError = error;
  }

  if (authError) return { error: getAuthErrorMessage(authError) };
  redirect(`/login?check-email=1&next=${encodeURIComponent(next)}`);
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }

  redirect("/");
}

export async function signInWithGitHubAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "http://localhost:3000";
  const next = resolveAuthRedirectPath(String(formData.get("next") ?? "/"));
  let providerUrl: string | null = null;
  let authError: unknown;

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    providerUrl = data.url;
    authError = error;
  } catch (error) {
    authError = error;
  }

  if (authError || !providerUrl) {
    return { error: getAuthErrorMessage(authError) };
  }

  redirect(providerUrl);
}
