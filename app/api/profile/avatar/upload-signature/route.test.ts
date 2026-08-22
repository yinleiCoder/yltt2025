import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
  issueAvatarUploadSignature: vi.fn(),
  requireCurrentProfile: vi.fn(),
}));

vi.mock("@/features/auth/server/auth-service", () => ({
  AuthenticationRequiredError: mocks.AuthenticationRequiredError,
  requireCurrentProfile: mocks.requireCurrentProfile,
}));

vi.mock("@/features/media/server/oss-service", () => ({
  issueAvatarUploadSignature: mocks.issueAvatarUploadSignature,
}));

import { POST } from "./route";

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/profile/avatar/upload-signature", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function createRawRequest(body: string): Request {
  return new Request("http://localhost/api/profile/avatar/upload-signature", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/profile/avatar/upload-signature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated upload requests before issuing a signature", async () => {
    mocks.requireCurrentProfile.mockRejectedValue(new mocks.AuthenticationRequiredError());

    const response = await POST(
      createRequest({ name: "portrait.jpg", mimeType: "image/jpeg", size: 100 }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "请先登录后再上传头像。" });
    expect(mocks.issueAvatarUploadSignature).not.toHaveBeenCalled();
  });

  it("returns a client error for malformed JSON without exposing parser details", async () => {
    mocks.requireCurrentProfile.mockResolvedValue({ id: "current-profile-id" });

    const response = await POST(createRawRequest("{"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "上传请求格式不正确。" });
    expect(mocks.issueAvatarUploadSignature).not.toHaveBeenCalled();
  });

  it("returns a client error for an invalid request shape without exposing Zod details", async () => {
    mocks.requireCurrentProfile.mockResolvedValue({ id: "current-profile-id" });

    const response = await POST(createRequest({ name: "portrait.jpg", mimeType: "image/jpeg" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "上传请求格式不正确。" });
    expect(mocks.issueAvatarUploadSignature).not.toHaveBeenCalled();
  });

  it("returns a server error for unexpected authentication failures", async () => {
    mocks.requireCurrentProfile.mockRejectedValue(new Error("Supabase connection failed"));

    const response = await POST(
      createRequest({ name: "portrait.jpg", mimeType: "image/jpeg", size: 100 }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "无法创建头像上传地址。" });
    expect(mocks.issueAvatarUploadSignature).not.toHaveBeenCalled();
  });

  it("rejects unsupported avatar MIME types before issuing a signature", async () => {
    mocks.requireCurrentProfile.mockResolvedValue({ id: "current-profile-id" });

    const response = await POST(
      createRequest({ name: "portrait.gif", mimeType: "image/gif", size: 100 }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "头像仅支持 JPEG、PNG 或 WebP 图片。" });
    expect(mocks.issueAvatarUploadSignature).not.toHaveBeenCalled();
  });

  it("rejects avatars larger than 5 MB before issuing a signature", async () => {
    mocks.requireCurrentProfile.mockResolvedValue({ id: "current-profile-id" });

    const response = await POST(
      createRequest({ name: "portrait.jpg", mimeType: "image/jpeg", size: 5 * 1024 * 1024 + 1 }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "头像文件不能超过 5 MB。" });
    expect(mocks.issueAvatarUploadSignature).not.toHaveBeenCalled();
  });

  it("returns only the avatar upload contract after authentication", async () => {
    mocks.requireCurrentProfile.mockResolvedValue({ id: "current-profile-id" });
    mocks.issueAvatarUploadSignature.mockReturnValue({
      objectKey: "avatars/current-profile-id/2026/08/avatar.jpg",
      uploadUrl: "https://oss.example.com/",
      fields: { key: "avatars/current-profile-id/2026/08/avatar.jpg" },
      expiresAt: "2026-08-21T00:05:00.000Z",
    });

    const response = await POST(
      createRequest({ name: "portrait.jpg", mimeType: "image/jpeg", size: 100 }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      objectKey: "avatars/current-profile-id/2026/08/avatar.jpg",
      uploadUrl: "https://oss.example.com/",
      fields: { key: "avatars/current-profile-id/2026/08/avatar.jpg" },
      expiresAt: "2026-08-21T00:05:00.000Z",
    });
    expect(mocks.issueAvatarUploadSignature).toHaveBeenCalledWith({
      name: "portrait.jpg",
      mimeType: "image/jpeg",
      size: 100,
      profileId: "current-profile-id",
    });
  });

  it("returns a server error when post policy signing fails", async () => {
    mocks.requireCurrentProfile.mockResolvedValue({ id: "current-profile-id" });
    mocks.issueAvatarUploadSignature.mockImplementation(() => {
      throw new Error("OSS signing failed");
    });

    const response = await POST(
      createRequest({ name: "portrait.jpg", mimeType: "image/jpeg", size: 100 }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "无法创建头像上传地址。" });
  });
});
