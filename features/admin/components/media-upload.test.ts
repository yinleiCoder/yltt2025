import { describe, expect, it } from "vitest";

import { uploadContentMedia } from "./media-upload";

describe("content media upload", () => {
  it("uploads MP4 without replacing the original file", async () => {
    const file = new File(["mp4-data"], "clip.mp4", { type: "video/mp4" });
    const requests: RequestInit[] = [];
    const fetcher = async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init) requests.push(init);
      if (requests.length === 1) {
        return Response.json({
          kind: "video",
          mimeType: "video/mp4",
          objectKey: "videos/2026/08/clip.mp4",
          uploadUrl: "https://oss.example.test/upload",
          expiresAt: "2026-08-24T00:00:00.000Z",
        }, { status: 201 });
      }

      return new Response(null, { status: 200 });
    };

    await expect(uploadContentMedia(file, fetcher)).resolves.toBe("videos/2026/08/clip.mp4");
    expect(requests[0].body).toContain("clip.mp4");
    expect(requests[1].body).toBe(file);
  });
});
