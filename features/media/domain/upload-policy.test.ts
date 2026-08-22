import { describe, expect, it } from "vitest";

import {
  UploadPolicyError,
  createAvatarObjectKey,
  createMediaObjectKey,
  parseOwnedAvatarObjectKey,
  validateAvatarUpload,
  validateMediaUpload,
} from "./upload-policy";

describe("validateMediaUpload", () => {
  it("accepts a JPEG photo within the configured limit", () => {
    expect(
      validateMediaUpload({
        name: "fujifilm-frame.jpg",
        mimeType: "image/jpeg",
        size: 12 * 1024 * 1024,
      }),
    ).toEqual({ kind: "photo", mimeType: "image/jpeg" });
  });

  it("rejects MOV video files because the upload path only accepts MP4", () => {
    expect(() =>
      validateMediaUpload({
        name: "clip.mov",
        mimeType: "video/quicktime",
        size: 80 * 1024 * 1024,
      }),
    ).toThrow(UploadPolicyError);
  });
});

describe("createMediaObjectKey", () => {
  it("creates a namespaced key without accepting path traversal from a filename", () => {
    expect(
      createMediaObjectKey({
        kind: "photo",
        originalName: "../../summer frame.JPG",
        timestamp: new Date("2026-08-20T00:00:00.000Z"),
        token: "a1b2c3d4",
      }),
    ).toBe("photos/2026/08/a1b2c3d4-summer-frame.jpg");
  });
});

describe("avatar upload policy", () => {
  it("accepts supported image types only up to 5 MB", () => {
    expect(
      validateAvatarUpload({
        name: "portrait.webp",
        mimeType: "image/webp",
        size: 5 * 1024 * 1024,
      }),
    ).toEqual({ mimeType: "image/webp" });

    expect(() =>
      validateAvatarUpload({
        name: "portrait.gif",
        mimeType: "image/gif",
        size: 1,
      }),
    ).toThrow("头像仅支持 JPEG、PNG 或 WebP 图片。");
    expect(() =>
      validateAvatarUpload({
        name: "portrait.jpg",
        mimeType: "image/jpeg",
        size: 5 * 1024 * 1024 + 1,
      }),
    ).toThrow("头像文件不能超过 5 MB。");
  });

  it("creates an avatar key in the dated avatar namespace", () => {
    expect(
      createAvatarObjectKey({
        profileId: "profile-123",
        originalName: "../Portrait Photo.exe",
        mimeType: "image/png",
        timestamp: new Date("2026-08-20T00:00:00.000Z"),
        token: "a1b2c3d4",
      }),
    ).toBe("avatars/profile-123/2026/08/a1b2c3d4-portrait-photo.png");
  });

  it("accepts only the current profile's dated avatar object key", () => {
    expect(
      parseOwnedAvatarObjectKey(
        "avatars/profile-123/2026/08/a1b2c3d4-portrait.png",
        "profile-123",
      ),
    ).toBe("avatars/profile-123/2026/08/a1b2c3d4-portrait.png");

    expect(() =>
      parseOwnedAvatarObjectKey(
        "avatars/another-profile/2026/08/a1b2c3d4-portrait.png",
        "profile-123",
      ),
    ).toThrow("头像对象不属于当前用户。");
    expect(() =>
      parseOwnedAvatarObjectKey("https://cdn.example.com/avatars/profile-123/avatar.png", "profile-123"),
    ).toThrow("头像对象键格式无效。");
  });
});
