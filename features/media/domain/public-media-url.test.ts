import { describe, expect, it } from "vitest";

import {
  PublicMediaUrlError,
  createPublicMediaUrl,
} from "./public-media-url";

describe("createPublicMediaUrl", () => {
  it("builds a public URL below the configured media origin", () => {
    expect(
      createPublicMediaUrl({
        baseUrl: "https://media.example.com/archive",
        objectKey: "photos/2026/08/quiet-morning.jpg",
      }),
    ).toBe("https://media.example.com/archive/photos/2026/08/quiet-morning.jpg");
  });

  it("keeps an object key from escaping the configured media origin", () => {
    expect(() =>
      createPublicMediaUrl({
        baseUrl: "https://media.example.com/archive",
        objectKey: "../private/original.jpg",
      }),
    ).toThrow(PublicMediaUrlError);
  });

  it("adds an OSS image transformation only for image media", () => {
    expect(
      createPublicMediaUrl({
        baseUrl: "https://media.example.com",
        objectKey: "photos/2026/08/quiet-morning.jpg",
        imageWidth: 960,
      }),
    ).toBe(
      "https://media.example.com/photos/2026/08/quiet-morning.jpg?x-oss-process=image%2Fformat%2Cwebp%2Fresize%2Cw_960",
    );
  });
});
