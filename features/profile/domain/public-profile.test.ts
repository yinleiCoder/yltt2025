import { describe, expect, it } from "vitest";

import {
  MAX_PUBLIC_PROFILE_IDS,
  normalizePublicProfileIds,
  projectPublicProfile,
} from "./public-profile";

describe("projectPublicProfile", () => {
  const profile = {
    id: "profile-1",
    avatarUrl: "https://cdn.example.com/avatars/profile-1.jpg",
    displayName: "Mika",
    gender: "female" as const,
    realName: "Mika Tanaka",
    phone: "+81 90 1234 5678",
    address: "Sakyo Ward, Kyoto",
    publicGender: true,
    publicRealName: true,
    publicPhone: false,
    publicAddress: false,
  };

  it("keeps the minimal comment identity and enabled public details", () => {
    expect(projectPublicProfile(profile)).toEqual({
      id: "profile-1",
      avatarUrl: "https://cdn.example.com/avatars/profile-1.jpg",
      displayName: "Mika",
      gender: "female",
      realName: "Mika Tanaka",
    });
  });

  it("does not expose disabled, empty, or unrelated profile fields", () => {
    expect(
      projectPublicProfile({
        ...profile,
        gender: null,
        realName: "",
        publicPhone: true,
        phone: null,
        role: "admin",
        createdAt: "2026-08-21T00:00:00.000Z",
      }),
    ).toEqual({
      id: "profile-1",
      avatarUrl: "https://cdn.example.com/avatars/profile-1.jpg",
      displayName: "Mika",
    });
  });

  it("rejects requests larger than the public profile batch limit", () => {
    const oversizedIds = Array.from({ length: MAX_PUBLIC_PROFILE_IDS + 1 }, (_, index) =>
      `profile-${index}`,
    );

    expect(() => normalizePublicProfileIds(oversizedIds)).toThrow(/100/);
  });
});
