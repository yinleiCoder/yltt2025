import { describe, expect, it } from "vitest";

import { toPublicStory, toPublicVideo, type PublicStoryRow, type PublicVideoRow } from "./public-media-content";

describe("public media content mapping", () => {
  it("maps a published video with its playback metadata", () => {
    const row: PublicVideoRow = {
      id: "video-1",
      slug: "summer-train",
      title: "Summer train",
      excerpt: "A short ride.",
      publishedAt: "2026-08-20T00:00:00.000Z",
      videoDetails: {
        objectKey: "videos/2026/08/summer-train.mp4",
        posterObjectKey: "photos/2026/08/summer-train.jpg",
        durationSeconds: 42,
        width: 1920,
        height: 1080,
      },
    };

    expect(toPublicVideo(row)).toEqual(row);
  });

  it("keeps Markdown story content available for safe rendering", () => {
    const row: PublicStoryRow = {
      id: "story-1",
      slug: "late-summer",
      title: "Late summer",
      excerpt: "A letter.",
      publishedAt: "2026-08-20T00:00:00.000Z",
      markdownBody: "## The first evening\n\nWe stayed until the lights came on.",
    };

    expect(toPublicStory(row).markdownBody).toContain("## The first evening");
  });
});
