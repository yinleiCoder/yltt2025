export type PhotoExifData = {
  aperture?: number;
  shutterSpeed?: string;
  iso?: number;
  focalLengthMm?: number;
  cameraMake?: string;
  cameraModel?: string;
  lens?: string;
  capturedAt?: string;
  latitude?: number;
  longitude?: number;
};

export type PhotoExifFormValues = Partial<Record<keyof PhotoExifData, string>>;

export function mapPhotoExifToFormValues(exif: PhotoExifData): PhotoExifFormValues {
  const values: PhotoExifFormValues = {};

  for (const field of [
    "aperture",
    "shutterSpeed",
    "iso",
    "focalLengthMm",
    "cameraMake",
    "cameraModel",
    "lens",
    "capturedAt",
    "latitude",
    "longitude",
  ] as const) {
    const value = exif[field];
    if (value !== undefined && value !== null && String(value).length > 0) {
      values[field] = String(value);
    }
  }

  return values;
}

export function hasPhotoGps(exif: PhotoExifData): boolean {
  return exif.latitude !== undefined && exif.longitude !== undefined;
}
