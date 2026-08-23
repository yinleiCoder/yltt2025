import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hasPublicSupabaseEnvironment: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  getCurrentProfile: vi.fn(),
  getCurrentProfileDetails: vi.fn(),
  listAdministratorProfileDetails: vi.fn(),
  listPublicProfiles: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  hasPublicSupabaseEnvironment: mocks.hasPublicSupabaseEnvironment,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

vi.mock("@/features/profile/server/profile-service", () => ({
  getCurrentProfileDetails: mocks.getCurrentProfileDetails,
  listAdministratorProfileDetails: mocks.listAdministratorProfileDetails,
  listPublicProfiles: mocks.listPublicProfiles,
}));

vi.mock("@/features/auth/server/auth-service", () => ({
  getCurrentProfile: mocks.getCurrentProfile,
}));

import { listPublicComments } from "./comment-service";

describe("listPublicComments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasPublicSupabaseEnvironment.mockReturnValue(true);
    mocks.getCurrentProfile.mockResolvedValue(null);
  });

  it("batches unique comment authors once and preserves comment order", async () => {
    const comments = [
      { id: "comment-3", author_id: "profile-2", body: "third", created_at: "2026-08-21T03:00:00.000Z" },
      { id: "comment-2", author_id: "profile-1", body: "second", created_at: "2026-08-21T02:00:00.000Z" },
      { id: "comment-1", author_id: "profile-2", body: "first", created_at: "2026-08-21T01:00:00.000Z" },
    ];
    const limit = vi.fn().mockResolvedValue({ data: comments, error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const eqStatus = vi.fn().mockReturnValue({ order });
    const eqContent = vi.fn().mockReturnValue({ eq: eqStatus });
    const select = vi.fn().mockReturnValue({ eq: eqContent });
    mocks.createServerSupabaseClient.mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) });
    mocks.listPublicProfiles.mockResolvedValue([
      {
        id: "profile-1",
        avatarUrl: "https://cdn.example.com/profile-1.jpg",
        displayName: "Mika",
        realName: "Mika Tanaka",
        privatePhone: "+81 90 1234 5678",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-08-21T00:00:00.000Z",
        phone: "",
        address: "   ",
      },
      {
        id: "profile-2",
        avatarUrl: null,
        displayName: "Noah",
        gender: "male",
        role: "admin",
        created_at: "2026-01-02T00:00:00.000Z",
        updated_at: "2026-08-21T01:00:00.000Z",
      },
    ]);

    await expect(listPublicComments("content-1")).resolves.toEqual([
      {
        id: "comment-3",
        authorId: "profile-2",
        body: "third",
        createdAt: "2026-08-21T03:00:00.000Z",
        author: { id: "profile-2", avatarUrl: null, displayName: "Noah", gender: "male", canViewFullProfile: false },
      },
      {
        id: "comment-2",
        authorId: "profile-1",
        body: "second",
        createdAt: "2026-08-21T02:00:00.000Z",
        author: {
          id: "profile-1",
          avatarUrl: "https://cdn.example.com/profile-1.jpg",
          displayName: "Mika",
          realName: "Mika Tanaka",
          canViewFullProfile: false,
        },
      },
      {
        id: "comment-1",
        authorId: "profile-2",
        body: "first",
        createdAt: "2026-08-21T01:00:00.000Z",
        author: { id: "profile-2", avatarUrl: null, displayName: "Noah", gender: "male", canViewFullProfile: false },
      },
    ]);

    expect(mocks.listPublicProfiles).toHaveBeenCalledTimes(1);
    expect(mocks.listPublicProfiles).toHaveBeenCalledWith(["profile-2", "profile-1"]);
  });

  it("does not request public profiles when visible comments have no author ids", async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [{ id: "comment-1", author_id: null, body: "Untitled", created_at: "2026-08-21T01:00:00.000Z" }],
      error: null,
    });
    const order = vi.fn().mockReturnValue({ limit });
    const eqStatus = vi.fn().mockReturnValue({ order });
    const eqContent = vi.fn().mockReturnValue({ eq: eqStatus });
    const select = vi.fn().mockReturnValue({ eq: eqContent });
    mocks.createServerSupabaseClient.mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) });

    await expect(listPublicComments("content-1")).resolves.toEqual([
      {
        id: "comment-1",
        authorId: "",
        body: "Untitled",
        createdAt: "2026-08-21T01:00:00.000Z",
        author: null,
      },
    ]);

    expect(mocks.listPublicProfiles).not.toHaveBeenCalled();
  });

  it("only requests the public projection for a visitor", async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [{ id: "comment-1", author_id: "other-profile", body: "公开评论", created_at: "2026-08-21T01:00:00.000Z" }],
      error: null,
    });
    const order = vi.fn().mockReturnValue({ limit });
    const eqStatus = vi.fn().mockReturnValue({ order });
    const eqContent = vi.fn().mockReturnValue({ eq: eqStatus });
    const select = vi.fn().mockReturnValue({ eq: eqContent });
    mocks.createServerSupabaseClient.mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) });
    mocks.listPublicProfiles.mockResolvedValue([
      {
        id: "other-profile",
        avatarUrl: null,
        displayName: "公开昵称",
        email: "public@example.com",
        age: 36,
      },
    ]);

    await expect(listPublicComments("content-1")).resolves.toEqual([
      {
        id: "comment-1",
        authorId: "other-profile",
        body: "公开评论",
        createdAt: "2026-08-21T01:00:00.000Z",
        author: {
          id: "other-profile",
          avatarUrl: null,
          displayName: "公开昵称",
          email: "public@example.com",
          age: 36,
          canViewFullProfile: false,
        },
      },
    ]);

    expect(mocks.getCurrentProfileDetails).not.toHaveBeenCalled();
    expect(mocks.listAdministratorProfileDetails).not.toHaveBeenCalled();
  });

  it("adds complete details only for the signed-in comment author", async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [
        { id: "comment-self", author_id: "self-profile", body: "我的评论", created_at: "2026-08-21T02:00:00.000Z" },
        { id: "comment-other", author_id: "other-profile", body: "他人评论", created_at: "2026-08-21T01:00:00.000Z" },
      ],
      error: null,
    });
    const order = vi.fn().mockReturnValue({ limit });
    const eqStatus = vi.fn().mockReturnValue({ order });
    const eqContent = vi.fn().mockReturnValue({ eq: eqStatus });
    const select = vi.fn().mockReturnValue({ eq: eqContent });
    mocks.createServerSupabaseClient.mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) });
    mocks.getCurrentProfile.mockResolvedValue({ id: "self-profile", role: "user" });
    mocks.listPublicProfiles.mockResolvedValue([
      { id: "self-profile", avatarUrl: null, displayName: "我" },
      { id: "other-profile", avatarUrl: null, displayName: "他人", phone: "仅公开电话" },
    ]);
    mocks.getCurrentProfileDetails.mockResolvedValue({
      id: "self-profile",
      avatarUrl: "https://cdn.example.com/self.jpg",
      displayName: "我的昵称",
      email: "self@example.com",
      realName: "我的真实姓名",
      phone: "13800000000",
      address: "上海市",
      birthDate: "1990-06-15",
      gender: "female",
      publicGender: false,
      publicRealName: false,
      publicPhone: false,
      publicAddress: false,
    });

    const result = await listPublicComments("content-1");

    expect(result[0]?.author).toEqual({
      id: "self-profile",
      avatarUrl: "https://cdn.example.com/self.jpg",
      displayName: "我的昵称",
      email: "self@example.com",
      age: 36,
      realName: "我的真实姓名",
      phone: "13800000000",
      address: "上海市",
      gender: "female",
      canViewFullProfile: true,
    });
    expect(result[1]?.author).toEqual({
      id: "other-profile",
      avatarUrl: null,
      displayName: "他人",
      phone: "仅公开电话",
      canViewFullProfile: false,
    });
    expect(JSON.stringify(result)).not.toContain("publicPhone");
    expect(mocks.getCurrentProfileDetails).toHaveBeenCalledTimes(1);
    expect(mocks.listAdministratorProfileDetails).not.toHaveBeenCalled();
  });

  it("uses the administrator-only batch query for every comment author", async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [
        { id: "comment-1", author_id: "profile-1", body: "第一条", created_at: "2026-08-21T02:00:00.000Z" },
        { id: "comment-2", author_id: "profile-2", body: "第二条", created_at: "2026-08-21T01:00:00.000Z" },
      ],
      error: null,
    });
    const order = vi.fn().mockReturnValue({ limit });
    const eqStatus = vi.fn().mockReturnValue({ order });
    const eqContent = vi.fn().mockReturnValue({ eq: eqStatus });
    const select = vi.fn().mockReturnValue({ eq: eqContent });
    mocks.createServerSupabaseClient.mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) });
    mocks.getCurrentProfile.mockResolvedValue({ id: "admin-profile", role: "admin" });
    mocks.listAdministratorProfileDetails.mockResolvedValue([
      {
        id: "profile-1", avatarUrl: null, displayName: "作者一", email: "author@example.com", realName: "作者一姓名", phone: "13800000001", address: "北京", birthDate: "1990-06-15", gender: "male",
        publicGender: false, publicRealName: false, publicPhone: false, publicAddress: false,
      },
      {
        id: "profile-2", avatarUrl: null, displayName: "作者二", email: null, realName: null, phone: null, address: null, birthDate: null, gender: null,
        publicGender: true, publicRealName: true, publicPhone: true, publicAddress: true,
      },
    ]);

    const result = await listPublicComments("content-1");

    expect(mocks.listAdministratorProfileDetails).toHaveBeenCalledWith(["profile-1", "profile-2"]);
    expect(mocks.listPublicProfiles).not.toHaveBeenCalled();
    expect(mocks.getCurrentProfileDetails).not.toHaveBeenCalled();
    expect(result).toEqual([
      {
        id: "comment-1", authorId: "profile-1", body: "第一条", createdAt: "2026-08-21T02:00:00.000Z",
        author: { id: "profile-1", avatarUrl: null, displayName: "作者一", email: "author@example.com", age: 36, realName: "作者一姓名", phone: "13800000001", address: "北京", gender: "male", canViewFullProfile: true },
      },
      {
        id: "comment-2", authorId: "profile-2", body: "第二条", createdAt: "2026-08-21T01:00:00.000Z",
        author: { id: "profile-2", avatarUrl: null, displayName: "作者二", canViewFullProfile: true },
      },
    ]);
    expect(JSON.stringify(result)).not.toMatch(/role|created_at|updated_at|publicPhone/);
  });
});
