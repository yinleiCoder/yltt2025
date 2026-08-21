import { describe, expect, it } from "vitest";

import {
  UploadPolicyError,
  createMediaObjectKey,
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
