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

import { getAdminDashboardData } from "./admin-service";

describe("getAdminDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdministrator.mockResolvedValue({ id: "admin-1" });
  });

  it("stops before database access when administrator authorization fails", async () => {
    const authorizationError = new Error("管理员权限不足");
    mocks.requireAdministrator.mockRejectedValue(authorizationError);

    await expect(getAdminDashboardData()).rejects.toBe(authorizationError);

    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("returns dashboard counts and recent content after authorization", async () => {
    const recentLimit = vi.fn().mockResolvedValue({
      data: [{ id: "content-1", title: "雨后街角", kind: "photo", published_at: "2026-08-20T00:00:00.000Z" }],
      error: null,
    });
    const recentOrder = vi.fn().mockReturnValue({ limit: recentLimit });
    const recentSelect = vi.fn().mockReturnValue({ order: recentOrder });
    const counts = [
      { count: 12, error: null },
      { count: 34, error: null },
      { count: 56, error: null },
    ];
    let contentCalls = 0;
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "content_items") {
          contentCalls += 1;
          return contentCalls === 1 ? { select: vi.fn().mockReturnValue(counts[0]) } : { select: recentSelect };
        }
        if (table === "comments") return { select: vi.fn().mockReturnValue(counts[1]) };
        return { select: vi.fn().mockReturnValue(counts[2]) };
      }),
    });

    await expect(getAdminDashboardData()).resolves.toEqual({
      contentCount: 12,
      commentCount: 34,
      userCount: 56,
      recentContent: [
        { id: "content-1", title: "雨后街角", kind: "photo", publishedAt: "2026-08-20T00:00:00.000Z" },
      ],
    });

    expect(mocks.requireAdministrator).toHaveBeenCalledTimes(1);
    expect(recentSelect).toHaveBeenCalledWith("id, title, kind, published_at");
  });
});
