import { cache } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CurrentProfile = {
  id: string;
  displayName: string | null;
  role: "user" | "admin";
};

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required.");
    this.name = "AuthenticationRequiredError";
  }
}

export class AdministratorRequiredError extends Error {
  constructor() {
    super("Administrator access is required.");
    this.name = "AdministratorRequiredError";
  }
}

export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load the current profile: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id as string,
    displayName: data.display_name as string | null,
    role: data.role as CurrentProfile["role"],
  };
});

export async function requireCurrentProfile(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    throw new AuthenticationRequiredError();
  }

  return profile;
}

export async function requireAdministrator(): Promise<CurrentProfile> {
  const profile = await requireCurrentProfile();

  if (profile.role !== "admin") {
    throw new AdministratorRequiredError();
  }

  return profile;
}
