import { describe, expect, it } from "vitest";

import {
  UploadPolicyError,
  validateMediaUpload,
  validateStoryImageUpload,
} from "./upload-policy";

const photo = (size: number) => ({ name: "photo.heic", mimeType: "image/heic", size });
const video = (size: number) => ({ name: "video.mov", mimeType: "video/quicktime", size });

describe("content upload size policy", () => {
  it("accepts photos up to 200 MB", () => {
    expect(validateMediaUpload(photo(200 * 1024 * 1024))).toEqual({
      kind: "photo",
      mimeType: "image/heic",
    });
    expect(validateStoryImageUpload(photo(200 * 1024 * 1024))).toEqual({
      kind: "photo",
      mimeType: "image/heic",
    });
  });

  it("accepts videos up to 2 GB", () => {
    expect(validateMediaUpload(video(2 * 1024 * 1024 * 1024))).toEqual({
      kind: "video",
      mimeType: "video/quicktime",
    });
  });

  it("rejects content files above the new limits", () => {
    expect(() => validateMediaUpload(photo(200 * 1024 * 1024 + 1))).toThrow(
      new UploadPolicyError("照片文件不能超过 200 MB。"),
    );
    expect(() => validateMediaUpload(video(2 * 1024 * 1024 * 1024 + 1))).toThrow(
      new UploadPolicyError("视频文件不能超过 2 GB。"),
    );
  });
});
