import { describe, expect, it } from "vitest";

import { parseAdminContentDraft } from "./content-draft";

const validPhoto = {
  kind: "photo",
  title: "Legacy photo",
  isFeatured: false,
  publishNow: false,
  locationVisibility: "hidden",
};

describe("admin content draft media keys", () => {
  it("accepts a legacy relative photo object key", () => {
    expect(parseAdminContentDraft({
      ...validPhoto,
      objectKey: "archive/2019/IMG_0001.JPEG",
    }).objectKey).toBe("archive/2019/IMG_0001.JPEG");
  });

  it.each([
    "",
    "/photos/2026/08/image.jpg",
    "https://cdn.example.com/image.jpg",
    "photos/2026/../image.jpg",
  ])("rejects an unsafe media object key: %s", (objectKey) => {
    expect(() => parseAdminContentDraft({ ...validPhoto, objectKey })).toThrow();
  });

  it("continues to reject malformed photo metadata", () => {
    expect(() => parseAdminContentDraft({
      ...validPhoto,
      objectKey: "archive/2019/IMG_0001.JPEG",
      capturedAt: "24-08-2026",
    })).toThrow();
  });
});
