import { beforeEach, describe, expect, it, vi } from "vitest";

import { UploadPolicyError } from "@/features/media/domain/upload-policy";

const mocks = vi.hoisted(() => ({
  AdministratorRequiredError: class AdministratorRequiredError extends Error {},
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
  issueOssUploadSignature: vi.fn(),
  requireAdministrator: vi.fn(),
}));

vi.mock("@/features/auth/server/auth-service", () => ({
  AdministratorRequiredError: mocks.AdministratorRequiredError,
  AuthenticationRequiredError: mocks.AuthenticationRequiredError,
  requireAdministrator: mocks.requireAdministrator,
}));

vi.mock("@/features/media/server/oss-service", () => ({
  issueOssUploadSignature: mocks.issueOssUploadSignature,
}));

import { POST } from "./route";

function createRequest(body: unknown) {
  return new Request("http://localhost/api/admin/media/upload-signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createRawRequest(body: string) {
  return new Request("http://localhost/api/admin/media/upload-signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

describe("POST /api/admin/media/upload-signature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a stable Chinese client error for malformed input without Zod details", async () => {
    mocks.requireAdministrator.mockResolvedValue({ id: "admin-1" });

    const response = await POST(createRequest({ name: "photo.jpg", size: "100" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "上传请求格式不正确。" });
    expect(mocks.issueOssUploadSignature).not.toHaveBeenCalled();
  });

  it("returns a stable Chinese client error for malformed JSON without parser details", async () => {
    mocks.requireAdministrator.mockResolvedValue({ id: "admin-1" });

    const response = await POST(createRawRequest("{"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "上传请求格式不正确。" });
  });

  it("returns a stable Chinese error for a non-administrator without exposing authorization details", async () => {
    mocks.requireAdministrator.mockRejectedValue(new mocks.AdministratorRequiredError("Administrator access is required."));

    const response = await POST(createRequest({ name: "photo.jpg", mimeType: "image/jpeg", size: 100 }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "仅管理员可以上传媒体。" });
    expect(mocks.issueOssUploadSignature).not.toHaveBeenCalled();
  });

  it("returns a stable Chinese error for unexpected signing failures", async () => {
    mocks.requireAdministrator.mockResolvedValue({ id: "admin-1" });
    mocks.issueOssUploadSignature.mockImplementation(() => {
      throw new Error("OSS secret leaked in raw error");
    });

    const response = await POST(createRequest({ name: "photo.jpg", mimeType: "image/jpeg", size: 100 }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "无法创建媒体上传地址。" });
  });

  it("does not expose an arbitrary upload-policy error message", async () => {
    mocks.requireAdministrator.mockResolvedValue({ id: "admin-1" });
    mocks.issueOssUploadSignature.mockImplementation(() => {
      throw new UploadPolicyError("internal policy diagnostic");
    });

    const response = await POST(createRequest({ name: "photo.jpg", mimeType: "image/jpeg", size: 100 }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "上传文件不符合要求。" });
  });
});
