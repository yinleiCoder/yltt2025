import { describe, expect, it } from "vitest";

import {
  UploadPolicyError,
  validateMediaUpload,
  validateStoryImageUpload,
} from "./upload-policy";

const photo = (size: number) => ({ name: "photo.jpg", mimeType: "image/jpeg", size });
const video = (size: number) => ({ name: "video.mp4", mimeType: "video/mp4", size });

describe("content upload size policy", () => {
  it("accepts photos up to 200 MB", () => {
    expect(validateMediaUpload(photo(200 * 1024 * 1024))).toEqual({
      kind: "photo",
      mimeType: "image/jpeg",
    });
    expect(validateStoryImageUpload(photo(200 * 1024 * 1024))).toEqual({
      kind: "photo",
      mimeType: "image/jpeg",
    });
  });

  it("accepts videos up to 2 GB", () => {
    expect(validateMediaUpload(video(2 * 1024 * 1024 * 1024))).toEqual({
      kind: "video",
      mimeType: "video/mp4",
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

  it("rejects Apple photo and video formats", () => {
    expect(() => validateMediaUpload({ name: "photo.heic", mimeType: "image/heic", size: 1 })).toThrow(
      new UploadPolicyError("仅支持 JPEG、PNG、WebP 图片和 MP4 视频。"),
    );
    expect(() => validateMediaUpload({ name: "photo.heif", mimeType: "image/heif", size: 1 })).toThrow(
      new UploadPolicyError("仅支持 JPEG、PNG、WebP 图片和 MP4 视频。"),
    );
    expect(() => validateMediaUpload({ name: "clip.mov", mimeType: "video/quicktime", size: 1 })).toThrow(
      new UploadPolicyError("仅支持 JPEG、PNG、WebP 图片和 MP4 视频。"),
    );
    expect(() => validateMediaUpload({ name: "clip.m4v", mimeType: "video/x-m4v", size: 1 })).toThrow(
      new UploadPolicyError("仅支持 JPEG、PNG、WebP 图片和 MP4 视频。"),
    );
  });
});
