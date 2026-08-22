import { beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_PUBLIC_PROFILE_IDS } from "@/features/profile/domain/public-profile";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  requireAdministrator: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

vi.mock("@/features/auth/server/auth-service", () => ({
  requireCurrentProfile: vi.fn(),
  requireAdministrator: mocks.requireAdministrator,
}));

import { listAdministratorProfileDetails, listPublicProfiles } from "./profile-service";

describe("listPublicProfiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty result without creating a Supabase client for an empty request", async () => {
    await expect(listPublicProfiles([])).resolves.toEqual([]);

    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("rejects an oversized external request before creating a Supabase client", async () => {
    const oversizedIds = Array.from({ length: MAX_PUBLIC_PROFILE_IDS + 1 }, (_, index) =>
      `profile-${index}`,
    );

    await expect(listPublicProfiles(oversizedIds)).rejects.toThrow(
      `At most ${MAX_PUBLIC_PROFILE_IDS} public profiles can be requested at once.`,
    );

    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("maps the RPC age without exposing the birth date", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: "profile-1",
          avatar_url: null,
          display_name: "Mika",
          email: null,
          age: 36,
          gender: null,
          real_name: null,
          phone: null,
          address: null,
        },
      ],
      error: null,
    });
    mocks.createServerSupabaseClient.mockResolvedValue({ rpc });

    await expect(listPublicProfiles(["profile-1"])).resolves.toEqual([
      { id: "profile-1", avatarUrl: null, displayName: "Mika", age: 36 },
    ]);

    expect(rpc).toHaveBeenCalledWith("get_public_profiles", {
      requested_profile_ids: ["profile-1"],
    });
  });
});

describe("listAdministratorProfileDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("authorizes before creating a database client", async () => {
    const authorizationError = new Error("管理员权限不足");
    mocks.requireAdministrator.mockRejectedValue(authorizationError);

    await expect(listAdministratorProfileDetails(["profile-1"])).rejects.toBe(authorizationError);

    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("returns a whitelisted batch of full profile fields without roles or timestamps", async () => {
    mocks.requireAdministrator.mockResolvedValue({ id: "admin-1", role: "admin" });
    const inProfiles = vi.fn().mockResolvedValue({
      data: [
        {
          id: "profile-1",
          avatar_url: "https://cdn.example.com/avatar.jpg",
          display_name: "评论作者",
          real_name: "真实姓名",
          phone: "13800000000",
          address: "上海市",
          birth_date: "1990-06-15",
          gender: "female",
          public_gender: false,
          public_real_name: false,
          public_phone: false,
          public_address: false,
          public_birth_date: false,
          role: "admin",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ in: inProfiles });
    mocks.createServerSupabaseClient.mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) });

    await expect(listAdministratorProfileDetails(["profile-1", "profile-1"])).resolves.toEqual([
      {
        id: "profile-1",
        avatarUrl: "https://cdn.example.com/avatar.jpg",
        displayName: "评论作者",
        realName: "真实姓名",
        phone: "13800000000",
        address: "上海市",
        birthDate: "1990-06-15",
        gender: "female",
        publicGender: false,
        publicRealName: false,
        publicPhone: false,
        publicAddress: false,
        publicBirthDate: false,
      },
    ]);

    expect(inProfiles).toHaveBeenCalledWith("id", ["profile-1"]);
    expect(select).toHaveBeenCalledWith(
      "id, avatar_url, display_name, real_name, phone, address, birth_date, gender, public_gender, public_real_name, public_phone, public_address, public_birth_date",
    );
  });
});
