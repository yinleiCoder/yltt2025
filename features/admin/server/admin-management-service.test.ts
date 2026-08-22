import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  requireAdministrator: vi.fn(),
}));

vi.mock("@/features/auth/server/auth-service", () => ({
  requireAdministrator: mocks.requireAdministrator,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import {
  AdminCommentNotFoundError,
  AdminRoleChangeError,
  changeAdminUserRole,
  listAdminComments,
  listAdminUsers,
  listRoleAuditLogs,
  setAdminCommentStatus,
} from "./admin-management-service";

function profileQuery(data: unknown[]) {
  const order = vi.fn().mockResolvedValue({ data, error: null });
  const select = vi.fn().mockReturnValue({ order });
  return { select, order };
}

describe("admin management service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdministrator.mockResolvedValue({ id: "admin-1" });
  });

  it("maps full user details only after administrator authorization", async () => {
    const profiles = profileQuery([
      {
        id: "user-1",
        avatar_url: "https://cdn.example.com/avatars/user-1.jpg",
        display_name: "青禾",
        role: "admin",
        created_at: "2026-08-01T00:00:00.000Z",
        public_gender: true,
        public_real_name: false,
        public_phone: true,
        public_address: false,
        public_email: true,
        public_birth_date: true,
        real_name: "周青禾",
        phone: "13800138000",
        address: "四川省成都市",
        gender: "female",
      },
    ]);
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(profiles),
    });

    await expect(listAdminUsers()).resolves.toEqual([
      {
        id: "user-1",
        avatarUrl: "https://cdn.example.com/avatars/user-1.jpg",
        displayName: "青禾",
        role: "admin",
        createdAt: "2026-08-01T00:00:00.000Z",
        publicProfile: {
          gender: true,
          realName: false,
          phone: true,
          address: false,
          email: true,
          birthDate: true,
        },
        details: {
          realName: "周青禾",
          phone: "13800138000",
          address: "四川省成都市",
          gender: "female",
        },
      },
    ]);

    expect(mocks.requireAdministrator).toHaveBeenCalledTimes(1);
    expect(profiles.select).toHaveBeenCalledWith(
      "id, avatar_url, display_name, role, created_at, public_email, public_gender, public_real_name, public_phone, public_address, public_birth_date, real_name, phone, address, gender",
    );
  });

  it("loads comment author and content mappings only after administrator authorization", async () => {
    const comments = [
      {
        id: "comment-1",
        body: "很喜欢这一张。",
        status: "visible",
        author_id: "user-1",
        content_id: "content-1",
        created_at: "2026-08-20T00:00:00.000Z",
      },
    ];
    const commentLimit = vi.fn().mockResolvedValue({ data: comments, error: null });
    const commentOrder = vi.fn().mockReturnValue({ limit: commentLimit });
    const commentSelect = vi.fn().mockReturnValue({ order: commentOrder });

    const profileIn = vi.fn().mockResolvedValue({
      data: [{ id: "user-1", avatar_url: "https://cdn.example.com/avatars/user-1.jpg", display_name: "青禾" }],
      error: null,
    });
    const profileSelect = vi.fn().mockReturnValue({ in: profileIn });

    const contentIn = vi.fn().mockResolvedValue({
      data: [{ id: "content-1", title: "雨后街角" }],
      error: null,
    });
    const contentSelect = vi.fn().mockReturnValue({ in: contentIn });

    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "comments") return { select: commentSelect };
        if (table === "profiles") return { select: profileSelect };
        return { select: contentSelect };
      }),
    });

    await expect(listAdminComments()).resolves.toEqual([
      {
        id: "comment-1",
        body: "很喜欢这一张。",
        status: "visible",
        authorId: "user-1",
        contentId: "content-1",
        createdAt: "2026-08-20T00:00:00.000Z",
        author: {
          avatarUrl: "https://cdn.example.com/avatars/user-1.jpg",
          displayName: "青禾",
        },
        contentTitle: "雨后街角",
      },
    ]);

    expect(mocks.requireAdministrator).toHaveBeenCalledTimes(1);
    expect(profileIn).toHaveBeenCalledWith("id", ["user-1"]);
    expect(contentIn).toHaveBeenCalledWith("id", ["content-1"]);
  });

  it("does not query user or content maps when there are no comments", async () => {
    const commentLimit = vi.fn().mockResolvedValue({ data: [], error: null });
    const commentOrder = vi.fn().mockReturnValue({ limit: commentLimit });
    const commentSelect = vi.fn().mockReturnValue({ order: commentOrder });
    const from = vi.fn().mockReturnValue({ select: commentSelect });
    mocks.createServerSupabaseClient.mockResolvedValue({ from });

    await expect(listAdminComments()).resolves.toEqual([]);

    expect(mocks.requireAdministrator).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("comments");
  });

  it("does not query audit logs when administrator authorization fails", async () => {
    const authorizationError = new Error("管理员权限不足");
    mocks.requireAdministrator.mockRejectedValue(authorizationError);

    await expect(listRoleAuditLogs()).rejects.toBe(authorizationError);

    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("maps role audit log entries after administrator authorization", async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [{
        id: "audit-1",
        actor_id: "admin-1",
        target_id: "user-1",
        previous_role: "user",
        next_role: "admin",
        created_at: "2026-08-20T00:00:00.000Z",
      }],
      error: null,
    });
    const order = vi.fn().mockReturnValue({ limit });
    const select = vi.fn().mockReturnValue({ order });
    mocks.createServerSupabaseClient.mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) });

    await expect(listRoleAuditLogs()).resolves.toEqual([{
      id: "audit-1",
      actorId: "admin-1",
      targetId: "user-1",
      previousRole: "user",
      nextRole: "admin",
      createdAt: "2026-08-20T00:00:00.000Z",
    }]);

    expect(select).toHaveBeenCalledWith("id, actor_id, target_id, previous_role, next_role, created_at");
  });

  it("does not change a role when administrator authorization fails", async () => {
    const authorizationError = new Error("管理员权限不足");
    mocks.requireAdministrator.mockRejectedValue(authorizationError);

    await expect(changeAdminUserRole("user-1", "admin")).rejects.toBe(authorizationError);

    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("calls the protected role RPC with the requested target and role", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    mocks.createServerSupabaseClient.mockResolvedValue({ rpc });

    await expect(changeAdminUserRole("user-1", "admin")).resolves.toBeUndefined();

    expect(rpc).toHaveBeenCalledWith("admin_change_user_role", {
      target_profile_id: "user-1",
      next_role: "admin",
    });
  });

  it("classifies a final-administrator RPC rejection without exposing its raw message", async () => {
    const rpc = vi.fn().mockResolvedValue({
      error: { message: "The last administrator cannot be demoted" },
    });
    mocks.createServerSupabaseClient.mockResolvedValue({ rpc });

    await expect(changeAdminUserRole("user-1", "user")).rejects.toMatchObject({
      kind: "last-administrator",
      message: "无法降级最后一位管理员。",
    } satisfies Partial<AdminRoleChangeError>);
  });

  it("does not update a comment when administrator authorization fails", async () => {
    const authorizationError = new Error("管理员权限不足");
    mocks.requireAdministrator.mockRejectedValue(authorizationError);

    await expect(setAdminCommentStatus("comment-1", "hidden")).rejects.toBe(authorizationError);

    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("updates comment visibility after administrator authorization", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "comment-1" }, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ update }),
    });

    await expect(setAdminCommentStatus("comment-1", "hidden")).resolves.toBeUndefined();

    expect(update).toHaveBeenCalledWith({ status: "hidden" });
    expect(eq).toHaveBeenCalledWith("id", "comment-1");
    expect(select).toHaveBeenCalledWith("id");
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("rejects a zero-row comment update as a safe not-found error", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ update }),
    });

    await expect(setAdminCommentStatus("missing-comment", "hidden")).rejects.toMatchObject({
      name: "AdminCommentNotFoundError",
      message: "未找到该评论。",
    } satisfies Partial<AdminCommentNotFoundError>);
  });
});
