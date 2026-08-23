import { describe, expect, it } from "vitest";

import {
  getPreparedMediaName,
  getPreparedMediaType,
  needsMediaTranscode,
} from "./media-format";

describe("media format preparation", () => {
  it("transcodes HEIC and HEIF photos to WebP", () => {
    expect(needsMediaTranscode(new File([], "IMG_0001.HEIC", { type: "image/heic" }))).toBe(true);
    expect(getPreparedMediaName("IMG_0001.HEIC", "photo")).toBe("IMG_0001.webp");
    expect(getPreparedMediaType("photo")).toBe("image/webp");
  });

  it("transcodes QuickTime and M4V videos to MP4", () => {
    expect(needsMediaTranscode(new File([], "clip.MOV", { type: "video/quicktime" }))).toBe(true);
    expect(needsMediaTranscode(new File([], "clip.m4v", { type: "video/x-m4v" }))).toBe(true);
    expect(getPreparedMediaName("clip.MOV", "video")).toBe("clip.mp4");
    expect(getPreparedMediaType("video")).toBe("video/mp4");
  });

  it("does not transcode browser-friendly formats", () => {
    expect(needsMediaTranscode(new File([], "photo.jpg", { type: "image/jpeg" }))).toBe(false);
    expect(needsMediaTranscode(new File([], "clip.mp4", { type: "video/mp4" }))).toBe(false);
  });
});
