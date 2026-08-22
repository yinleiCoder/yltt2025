import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
  createServerSupabaseClient: vi.fn(),
  deleteOssObject: vi.fn(),
  revalidatePath: vi.fn(),
  requireCurrentProfile: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/features/auth/server/auth-service", () => ({
  AuthenticationRequiredError: mocks.AuthenticationRequiredError,
  requireCurrentProfile: mocks.requireCurrentProfile,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

vi.mock("@/lib/env", () => ({
  getPublicMediaBaseUrl: () => "https://media.example.com",
}));

vi.mock("@/features/media/server/oss-service", () => ({
  deleteOssObject: mocks.deleteOssObject,
}));

import { updateProfileAction } from "./actions";

function createValidFormData(): FormData {
  const formData = new FormData();
  formData.set("displayName", "Mika");
  formData.set("realName", "Mika Tanaka");
  formData.set("phone", "+81 90 1234 5678");
  formData.set("address", "Sakyo Ward, Kyoto");
  formData.set("birthDate", "1990-06-15");
  formData.set("gender", "female");
  formData.set("publicGender", "on");
  formData.set("publicRealName", "on");
  formData.set("publicBirthDate", "on");
  return formData;
}

describe("updateProfileAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentProfile.mockResolvedValue({
      id: "current-profile-id",
      displayName: "Existing profile",
      avatarUrl: null,
      role: "user",
    });
  });

  it("rejects an unsupported gender before creating a database client", async () => {
    const formData = createValidFormData();
    formData.set("gender", "prefer-not-to-say");

    await expect(updateProfileAction({}, formData)).resolves.toEqual({
      error: "请检查个人资料填写内容。",
    });

    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated profile updates", async () => {
    mocks.requireCurrentProfile.mockRejectedValue(new mocks.AuthenticationRequiredError());

    await expect(updateProfileAction({}, createValidFormData())).resolves.toEqual({
      error: "请先登录后再保存个人资料。",
    });

    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("rejects a blank nickname before creating a database client", async () => {
    const formData = createValidFormData();
    formData.set("displayName", " ");

    await expect(updateProfileAction({}, formData)).resolves.toEqual({
      error: "请检查个人资料填写内容。",
    });

    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("updates only the authenticated profile and returns a stable success state", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "current-profile-id" }, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => ({ update })),
    });
    const formData = createValidFormData();
    formData.set("id", "another-profile-id");
    formData.set("role", "admin");

    await expect(updateProfileAction({}, formData)).resolves.toEqual({
      success: "个人资料已保存。",
    });

    expect(update).toHaveBeenCalledWith({
      display_name: "Mika",
      real_name: "Mika Tanaka",
      phone: "+81 90 1234 5678",
      address: "Sakyo Ward, Kyoto",
      birth_date: "1990-06-15",
      gender: "female",
      public_gender: true,
      public_real_name: true,
      public_phone: false,
      public_address: false,
      public_birth_date: true,
      public_email: false,
    });
    expect(eq).toHaveBeenCalledTimes(1);
    expect(eq).toHaveBeenCalledWith("id", "current-profile-id");
    expect(select).toHaveBeenCalledWith("id");
    expect(maybeSingle).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/profile");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/photography/[slug]", "page");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/videos/[slug]", "page");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/stories/[slug]", "page");
  });

  it("returns a stable error when the authenticated profile row was not updated", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => ({ update })),
    });

    await expect(updateProfileAction({}, createValidFormData())).resolves.toEqual({
      error: "未找到需要更新的个人资料。",
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("returns an actionable error when the profile migration is missing", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "42703", message: "column profiles.real_name does not exist" },
    });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => ({ update })),
    });

    await expect(updateProfileAction({}, createValidFormData())).resolves.toEqual({
      error: "个人资料数据库结构未更新，请联系管理员。",
    });
  });

  it("returns an actionable error when profile update permission is missing", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "42501", message: "permission denied for table profiles" },
    });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => ({ update })),
    });

    await expect(updateProfileAction({}, createValidFormData())).resolves.toEqual({
      error: "个人资料保存权限未配置，请联系管理员。",
    });
  });

  it("persists an owned avatar object key as the configured public media URL", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "current-profile-id" }, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => ({ update })),
    });
    const formData = createValidFormData();
    formData.set("avatarObjectKey", "avatars/current-profile-id/2026/08/avatar.png");

    await expect(updateProfileAction({}, formData)).resolves.toEqual({ success: "个人资料已保存。" });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        avatar_url: "https://media.example.com/avatars/current-profile-id/2026/08/avatar.png",
      }),
    );
  });

  it("deletes the previous owned avatar after replacing it", async () => {
    mocks.requireCurrentProfile.mockResolvedValue({
      id: "current-profile-id",
      displayName: "Existing profile",
      avatarUrl: "https://media.example.com/avatars/current-profile-id/2026/08/old-avatar.png",
      role: "user",
    });
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "current-profile-id" }, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => ({ update })),
    });
    const formData = createValidFormData();
    formData.set("avatarObjectKey", "avatars/current-profile-id/2026/08/new-avatar.webp");

    await expect(updateProfileAction({}, formData)).resolves.toEqual({ success: "个人资料已保存。" });

    expect(mocks.deleteOssObject).toHaveBeenCalledWith(
      "avatars/current-profile-id/2026/08/old-avatar.png",
    );
  });

  it("keeps the existing avatar when the update does not include a new object key", async () => {
    mocks.requireCurrentProfile.mockResolvedValue({
      id: "current-profile-id",
      displayName: "Existing profile",
      avatarUrl: "https://media.example.com/avatars/current-profile-id/2026/08/old-avatar.png",
      role: "user",
    });
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "current-profile-id" }, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => ({ update })),
    });

    await expect(updateProfileAction({}, createValidFormData())).resolves.toEqual({ success: "个人资料已保存。" });

    expect(mocks.deleteOssObject).not.toHaveBeenCalled();
  });

  it("deletes a newly uploaded avatar when the profile update fails", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "42501", message: "permission denied for table profiles" },
    });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => ({ update })),
    });
    const formData = createValidFormData();
    formData.set("avatarObjectKey", "avatars/current-profile-id/2026/08/orphan-avatar.webp");

    await expect(updateProfileAction({}, formData)).resolves.toEqual({
      error: "个人资料保存权限未配置，请联系管理员。",
    });

    expect(mocks.deleteOssObject).toHaveBeenCalledWith(
      "avatars/current-profile-id/2026/08/orphan-avatar.webp",
    );
  });

  it("rejects an avatar object key outside the authenticated profile prefix", async () => {
    const formData = createValidFormData();
    formData.set("avatarObjectKey", "avatars/another-profile/2026/08/avatar.png");

    await expect(updateProfileAction({}, formData)).resolves.toEqual({ error: "头像引用无效。" });

    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });
});
