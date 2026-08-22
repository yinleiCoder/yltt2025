import { describe, expect, it, vi } from "vitest";

import {
  readContentPhotoExif,
  uploadContentMedia,
} from "./media-upload";

const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });

describe("admin media upload", () => {
  it("returns only an approved Chinese API error when the signing endpoint returns a malicious error body", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "<script>alert('xss')</script>" }), { status: 400 }),
    );

    await expect(uploadContentMedia(file, fetcher)).rejects.toMatchObject({
      message: "媒体上传准备失败，请稍后重试。",
    });
  });

  it("returns a preparation error when the signing endpoint has a malformed successful response", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ uploadUrl: "https://oss.example.com" }), { status: 201 }),
    );

    await expect(uploadContentMedia(file, fetcher)).rejects.toMatchObject({
      message: "媒体上传准备失败，请稍后重试。",
    });
  });

  it("returns a stable upload error when OSS rejects the signed upload", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            kind: "photo",
            objectKey: "photos/2026/08/photo.jpg",
            uploadUrl: "https://oss.example.com/photos/2026/08/photo.jpg",
            expiresAt: "2026-08-21T00:05:00.000Z",
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 403 }));

    await expect(uploadContentMedia(file, fetcher)).rejects.toMatchObject({
      message: "媒体上传失败，请稍后重试。",
    });
  });

  it("keeps a verified Chinese upload-policy error from the signing endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "照片文件不能超过 25 MB。" }), { status: 400 }),
    );

    await expect(uploadContentMedia(file, fetcher)).rejects.toMatchObject({
      message: "照片文件不能超过 25 MB。",
    });
  });

  it("returns a stable EXIF error instead of an arbitrary parser error", async () => {
    await expect(
      readContentPhotoExif(file, vi.fn().mockRejectedValue(new Error("Unexpected EXIF parser stack"))),
    ).resolves.toEqual({ error: "无法读取这张照片的 EXIF 信息。", ok: false });
  });
});
