import { describe, expect, it } from "vitest";

import { parseAdminContentDraft } from "./content-draft";

describe("parseAdminContentDraft", () => {
  it("parses a featured photo with its object key", () => {
    expect(
      parseAdminContentDraft({
        kind: "photo",
        title: "Rain on the platform",
        slug: "rain-on-the-platform",
        isFeatured: true,
        publishNow: true,
        objectKey: "photos/2026/08/photo.jpg",
      }),
    ).toMatchObject({
      kind: "photo",
      isFeatured: true,
      objectKey: "photos/2026/08/photo.jpg",
    });
  });

  it("rejects a media item without an object key", () => {
    expect(() =>
      parseAdminContentDraft({
        kind: "video",
        title: "A short film",
        slug: "a-short-film",
        isFeatured: false,
        publishNow: false,
      }),
    ).toThrow("media object key");
  });

  it("rejects an object key outside the approved media folders", () => {
    expect(() =>
      parseAdminContentDraft({
        kind: "photo",
        title: "Rain on the platform",
        slug: "rain-on-the-platform",
        isFeatured: false,
        publishNow: false,
        objectKey: "../private/photo.jpg",
      }),
    ).toThrow("media object key");
  });

  it("requires complete location data for precise visibility", () => {
    expect(() =>
      parseAdminContentDraft({
        kind: "photo",
        title: "A precise frame",
        slug: "a-precise-frame",
        isFeatured: false,
        publishNow: false,
        objectKey: "photos/2026/08/photo.jpg",
        locationVisibility: "precise",
        city: "Kyoto",
        region: "Kyoto Prefecture",
      }),
    ).toThrow("precise location");
  });

  it("accepts city-level location without storing exact coordinates", () => {
    expect(
      parseAdminContentDraft({
        kind: "photo",
        title: "A city frame",
        slug: "a-city-frame",
        isFeatured: false,
        publishNow: false,
        objectKey: "photos/2026/08/photo.jpg",
        locationVisibility: "city",
        city: "Kyoto",
        region: "Kyoto Prefecture",
      }),
    ).toMatchObject({ locationVisibility: "city", city: "Kyoto", region: "Kyoto Prefecture" });
  });

  it("accepts camera metadata without imposing business ranges", () => {
    expect(
      parseAdminContentDraft({
        kind: "photo",
        title: "Metadata from an unusual camera",
        slug: "unusual-camera",
        isFeatured: false,
        publishNow: false,
        objectKey: "photos/2026/08/photo.jpg",
        aperture: 0,
        iso: 0,
        focalLengthMm: -1,
        shutterSpeed: "bulb",
      }),
    ).toMatchObject({ aperture: 0, iso: 0, focalLengthMm: -1, shutterSpeed: "bulb" });
  });
});
