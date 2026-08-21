import { describe, expect, it } from "vitest";

import { toFeaturedArchiveItems } from "./featured-archive";

describe("toFeaturedArchiveItems", () => {
  it("keeps photo metadata while applying city-level location privacy", () => {
    const items = toFeaturedArchiveItems([
      {
        id: "photo-1",
        kind: "photo",
        slug: "quiet-morning",
        title: "Quiet morning",
        excerpt: "A first walk before the city wakes.",
        coverObjectKey: null,
        publishedAt: "2026-08-20T00:00:00.000Z",
        locationVisibility: "city",
        locationLabel: "Higashiyama Ward",
        city: "Kyoto",
        region: "Kyoto Prefecture",
        latitude: 35.0037,
        longitude: 135.7788,
        photoDetails: {
          objectKey: "photos/2026/08/quiet-morning.jpg",
          altText: "Morning light over a quiet street",
          aperture: 2.8,
          shutterSpeed: "1/250",
          iso: 400,
          focalLengthMm: 35,
          width: 3200,
          height: 4000,
        },
        videoDetails: null,
      },
    ]);

    expect(items).toEqual([
      {
        id: "photo-1",
        kind: "photo",
        slug: "quiet-morning",
        title: "Quiet morning",
        excerpt: "A first walk before the city wakes.",
        publishedAt: "2026-08-20T00:00:00.000Z",
        location: { city: "Kyoto", region: "Kyoto Prefecture" },
        media: {
          type: "photo",
          objectKey: "photos/2026/08/quiet-morning.jpg",
          altText: "Morning light over a quiet street",
          width: 3200,
          height: 4000,
          aperture: 2.8,
          shutterSpeed: "1/250",
          iso: 400,
          focalLengthMm: 35,
        },
      },
    ]);
  });

  it("omits media items whose required detail row is missing", () => {
    const items = toFeaturedArchiveItems([
      {
        id: "photo-1",
        kind: "photo",
        slug: "missing-photo",
        title: "Missing photo",
        excerpt: null,
        coverObjectKey: null,
        publishedAt: "2026-08-20T00:00:00.000Z",
        locationVisibility: "hidden",
        locationLabel: null,
        city: null,
        region: null,
        latitude: null,
        longitude: null,
        photoDetails: null,
        videoDetails: null,
      },
      {
        id: "story-1",
        kind: "story",
        slug: "late-summer",
        title: "Late summer",
        excerpt: "A story can be read without a cover image.",
        coverObjectKey: null,
        publishedAt: "2026-08-20T00:00:00.000Z",
        locationVisibility: "hidden",
        locationLabel: null,
        city: null,
        region: null,
        latitude: null,
        longitude: null,
        photoDetails: null,
        videoDetails: null,
      },
    ]);

    expect(items.map((item) => item.id)).toEqual(["story-1"]);
  });

  it("does not use a video object as an image poster fallback", () => {
    const items = toFeaturedArchiveItems([
      {
        id: "video-1",
        kind: "video",
        slug: "summer-train",
        title: "Summer train",
        excerpt: null,
        coverObjectKey: "videos/2026/08/summer-train.mp4",
        publishedAt: "2026-08-20T00:00:00.000Z",
        locationVisibility: "hidden",
        locationLabel: null,
        city: null,
        region: null,
        latitude: null,
        longitude: null,
        photoDetails: null,
        videoDetails: {
          objectKey: "videos/2026/08/summer-train.mp4",
          posterObjectKey: null,
          durationSeconds: 42,
          width: 1920,
          height: 1080,
        },
      },
    ]);

    expect(items[0]?.media).toMatchObject({
      type: "video",
      objectKey: "videos/2026/08/summer-train.mp4",
      posterObjectKey: null,
    });
  });
});
