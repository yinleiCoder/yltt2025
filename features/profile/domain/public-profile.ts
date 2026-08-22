import type { ProfileGender } from "./profile-schema";

export const MAX_PUBLIC_PROFILE_IDS = 100;

export function normalizePublicProfileIds(ids: string[]): string[] {
  if (ids.length > MAX_PUBLIC_PROFILE_IDS) {
    throw new RangeError(
      `At most ${MAX_PUBLIC_PROFILE_IDS} public profiles can be requested at once.`,
    );
  }

  return [...new Set(ids)];
}

export type PublicProfile = {
  id: string;
  avatarUrl: string | null;
  displayName: string | null;
  age?: number;
  email?: string;
  gender?: ProfileGender;
  realName?: string;
  phone?: string;
  address?: string;
};

export type CommentProfile = PublicProfile & {
  canViewFullProfile: boolean;
};

export type PublicProfileSource = {
  id: string;
  avatarUrl: string | null;
  displayName: string | null;
  gender: ProfileGender | null;
  realName: string | null;
  phone: string | null;
  address: string | null;
  birthDate: string | null;
  age: number | null;
  email?: string | null;
  publicGender: boolean;
  publicRealName: boolean;
  publicPhone: boolean;
  publicAddress: boolean;
  publicBirthDate: boolean;
  publicEmail?: boolean;
} & Record<string, unknown>;

export type PublicProfileRow = {
  id: string;
  avatar_url: string | null;
  display_name: string | null;
  email?: string | null;
  gender: ProfileGender | null;
  real_name: string | null;
  phone: string | null;
  address: string | null;
  age: number | null;
};

function publicText(enabled: boolean, value: string | null): string | undefined {
  if (!enabled) return undefined;

  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function projectPublicProfile(profile: PublicProfileSource): PublicProfile {
  const gender = profile.publicGender ? profile.gender ?? undefined : undefined;
  const realName = publicText(profile.publicRealName, profile.realName);
  const phone = publicText(profile.publicPhone, profile.phone);
  const address = publicText(profile.publicAddress, profile.address);
  const age =
    profile.publicBirthDate &&
    typeof profile.age === "number" &&
    Number.isInteger(profile.age) &&
    profile.age >= 0
      ? profile.age
      : undefined;
  const email = publicText(profile.publicEmail ?? false, profile.email ?? null);

  return {
    id: profile.id,
    avatarUrl: profile.avatarUrl,
    displayName: profile.displayName,
    ...(gender ? { gender } : {}),
    ...(realName ? { realName } : {}),
    ...(phone ? { phone } : {}),
    ...(address ? { address } : {}),
    ...(age !== undefined ? { age } : {}),
    ...(email ? { email } : {}),
  };
}

export function toPublicProfile(profile: PublicProfileRow): PublicProfile {
  return {
    id: profile.id,
    avatarUrl: profile.avatar_url,
    displayName: profile.display_name,
    ...(profile.email?.trim() ? { email: profile.email.trim() } : {}),
    ...(profile.gender ? { gender: profile.gender } : {}),
    ...(profile.real_name?.trim() ? { realName: profile.real_name.trim() } : {}),
    ...(profile.phone?.trim() ? { phone: profile.phone.trim() } : {}),
    ...(profile.address?.trim() ? { address: profile.address.trim() } : {}),
    ...(typeof profile.age === "number" && Number.isInteger(profile.age) && profile.age >= 0
      ? { age: profile.age }
      : {}),
  };
}
