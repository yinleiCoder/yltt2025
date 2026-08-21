import { describe, expect, it } from "vitest";

import { toPublicPhoto, type PublicPhotoRow } from "./public-photography";

const photo: PublicPhotoRow = {
  id: "photo-1",
  slug: "quiet-morning",
  title: "Quiet morning",
  excerpt: "A quiet frame.",
  publishedAt: "2026-08-20T00:00:00.000Z",
  locationVisibility: "precise",
  locationLabel: "Higashiyama Ward",
  city: "Kyoto",
  region: "Kyoto Prefecture",
  latitude: 35.0037,
  longitude: 135.7788,
  photoDetails: {
    objectKey: "photos/2026/08/quiet-morning.jpg",
    altText: "A quiet morning",
    cameraMake: "Fujifilm",
    cameraModel: "X-T5",
    lens: "23mm F1.4",
    aperture: 1.4,
    shutterSpeed: "1/250",
    iso: 160,
    focalLengthMm: 23,
    capturedAt: "2026-08-18T01:00:00.000Z",
    width: 2400,
    height: 1600,
  },
};

describe("toPublicPhoto", () => {
  it("maps photo metadata and preserves precise location for a published photo", () => {
    expect(toPublicPhoto(photo)).toEqual({
      id: "photo-1",
      slug: "quiet-morning",
      title: "Quiet morning",
      excerpt: "A quiet frame.",
      publishedAt: "2026-08-20T00:00:00.000Z",
      location: {
        label: "Higashiyama Ward",
        city: "Kyoto",
        region: "Kyoto Prefecture",
        latitude: 35.0037,
        longitude: 135.7788,
      },
      media: photo.photoDetails,
    });
  });

  it("removes all location data when location visibility is hidden", () => {
    expect(
      toPublicPhoto({
        ...photo,
        locationVisibility: "hidden",
      }).location,
    ).toBeNull();
  });

  it("only exposes city and region for city-level visibility", () => {
    expect(
      toPublicPhoto({
        ...photo,
        locationVisibility: "city",
        locationLabel: null,
        latitude: null,
        longitude: null,
      }).location,
    ).toEqual({ city: "Kyoto", region: "Kyoto Prefecture" });
  });
});
