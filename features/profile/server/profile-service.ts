import "server-only";

import {
  requireAdministrator,
  requireCurrentProfile,
} from "@/features/auth/server/auth-service";
import {
  normalizePublicProfileIds,
  toPublicProfile,
  type PublicProfile,
  type PublicProfileRow,
} from "@/features/profile/domain/public-profile";
import type { ProfileGender } from "@/features/profile/domain/profile-schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CurrentProfileDetails = {
  id: string;
  avatarUrl: string | null;
  displayName: string | null;
  email?: string | null;
  realName: string | null;
  phone: string | null;
  address: string | null;
  gender: ProfileGender | null;
  publicGender: boolean;
  publicRealName: boolean;
  publicPhone: boolean;
  publicAddress: boolean;
  publicEmail?: boolean;
};

export async function getCurrentProfileDetails(): Promise<CurrentProfileDetails> {
  const currentProfile = await requireCurrentProfile();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, avatar_url, display_name, email, real_name, phone, address, gender, public_gender, public_real_name, public_phone, public_address, public_email",
    )
    .eq("id", currentProfile.id)
    .single();

  if (error || !data) {
    throw new Error(`Could not load the current profile details: ${error?.message ?? "Profile not found"}`);
  }

  const { data: authData } = await supabase.auth.getUser();

  return {
    id: data.id as string,
    avatarUrl: data.avatar_url as string | null,
    displayName: data.display_name as string | null,
    email: (data.email as string | null) ?? authData.user?.email ?? null,
    realName: data.real_name as string | null,
    phone: data.phone as string | null,
    address: data.address as string | null,
    gender: data.gender as ProfileGender | null,
    publicGender: data.public_gender as boolean,
    publicRealName: data.public_real_name as boolean,
    publicPhone: data.public_phone as boolean,
    publicAddress: data.public_address as boolean,
    publicEmail: data.public_email as boolean,
  };
}

export async function listPublicProfiles(ids: string[]): Promise<PublicProfile[]> {
  if (ids.length === 0) return [];

  const requestedProfileIds = normalizePublicProfileIds(ids);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_public_profiles", {
      requested_profile_ids: requestedProfileIds,
  });

  if (error) {
    throw new Error(`Could not load public profiles: ${error.message}`);
  }

  const profiles = (data ?? []) as PublicProfileRow[];
  return profiles.map(toPublicProfile);
}

export async function listAdministratorProfileDetails(
  ids: string[],
): Promise<CurrentProfileDetails[]> {
  await requireAdministrator();

  if (ids.length === 0) return [];

  const requestedProfileIds = normalizePublicProfileIds(ids);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, avatar_url, display_name, real_name, phone, address, gender, public_gender, public_real_name, public_phone, public_address",
    )
    .in("id", requestedProfileIds);

  if (error) {
    throw new Error(`Could not load administrator profile details: ${error.message}`);
  }

  return (data ?? []).map((profile) => ({
    id: profile.id as string,
    avatarUrl: profile.avatar_url as string | null,
    displayName: profile.display_name as string | null,
    realName: profile.real_name as string | null,
    phone: profile.phone as string | null,
    address: profile.address as string | null,
    gender: profile.gender as ProfileGender | null,
    publicGender: profile.public_gender as boolean,
    publicRealName: profile.public_real_name as boolean,
    publicPhone: profile.public_phone as boolean,
    publicAddress: profile.public_address as boolean,
  }));
}
