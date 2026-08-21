import { describe, expect, it } from "vitest";

import { mapPhotoExifToFormValues, hasPhotoGps } from "./photo-exif-form";

describe("photo EXIF form mapping", () => {
  it("maps camera metadata and GPS into editable form values", () => {
    expect(
      mapPhotoExifToFormValues({
        aperture: 2.8,
        shutterSpeed: "1/125",
        iso: 400,
        focalLengthMm: 35,
        cameraMake: "Fujifilm",
        cameraModel: "X-T5",
        lens: "XF35mmF1.4 R",
        capturedAt: "2026-08-21T01:02:03.000Z",
        latitude: 30.123456,
        longitude: 105.654321,
      }),
    ).toEqual({
      aperture: "2.8",
      shutterSpeed: "1/125",
      iso: "400",
      focalLengthMm: "35",
      cameraMake: "Fujifilm",
      cameraModel: "X-T5",
      lens: "XF35mmF1.4 R",
      capturedAt: "2026-08-21T01:02:03.000Z",
      latitude: "30.123456",
      longitude: "105.654321",
    });
  });

  it("only reports GPS when both coordinates are present", () => {
    expect(hasPhotoGps({ latitude: 30, longitude: 105 })).toBe(true);
    expect(hasPhotoGps({ latitude: 30 })).toBe(false);
    expect(hasPhotoGps({ longitude: 105 })).toBe(false);
  });
});
