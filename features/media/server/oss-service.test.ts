import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  calculatePostSignature: vi.fn(),
  generateObjectUrl: vi.fn(),
  OSS: vi.fn(),
}));

vi.mock("ali-oss", () => ({ default: mocks.OSS }));
vi.mock("crypto", () => ({ randomUUID: () => "upload-token" }));
vi.mock("@/lib/env", () => ({
  getOssEnvironment: () => ({
    OSS_REGION: "oss-cn-hangzhou",
    OSS_BUCKET: "media-bucket",
    OSS_ACCESS_KEY_ID: "access-key-id",
    OSS_ACCESS_KEY_SECRET: "access-key-secret",
  }),
}));

import { issueAvatarUploadSignature } from "./oss-service";

describe("issueAvatarUploadSignature", () => {
  it("issues an exact-key POST policy that constrains file size and content type", () => {
    mocks.OSS.mockImplementation(function () {
      return {
      calculatePostSignature: mocks.calculatePostSignature.mockReturnValue({
        OSSAccessKeyId: "access-key-id",
        Signature: "signature",
        policy: "policy",
      }),
      generateObjectUrl: mocks.generateObjectUrl.mockReturnValue("https://media-bucket.oss.example.com/"),
      };
    });

    expect(
      issueAvatarUploadSignature({
        profileId: "profile-123",
        name: "portrait.exe",
        mimeType: "image/webp",
        size: 1024,
      }),
    ).toMatchObject({
      objectKey: expect.stringContaining("avatars/profile-123/"),
      uploadUrl: "https://media-bucket.oss.example.com/",
      fields: {
        key: expect.stringContaining("avatars/profile-123/"),
        "Content-Type": "image/webp",
        OSSAccessKeyId: "access-key-id",
        Signature: "signature",
        policy: "policy",
        success_action_status: "201",
      },
    });

    expect(mocks.calculatePostSignature).toHaveBeenCalledWith(
      expect.objectContaining({
        conditions: expect.arrayContaining([
          ["eq", "$content-type", "image/webp"],
          ["content-length-range", 1, 1024],
        ]),
      }),
    );
  });
});
