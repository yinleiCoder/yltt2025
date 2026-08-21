"use client";

import * as exifr from "exifr";

import type { PhotoExifData } from "@/features/media/domain/photo-exif-form";

export type PhotoExifDraft = PhotoExifData;

export async function readPhotoExif(file: File): Promise<PhotoExifDraft> {
  const metadata = await exifr.parse(file, [
    "FNumber",
    "ExposureTime",
    "ISO",
    "FocalLength",
    "Make",
    "Model",
    "LensModel",
    "DateTimeOriginal",
    "latitude",
    "longitude",
  ]);

  return {
    aperture: metadata?.FNumber,
    shutterSpeed: metadata?.ExposureTime
      ? `1/${Math.round(1 / metadata.ExposureTime)}`
      : undefined,
    iso: metadata?.ISO,
    focalLengthMm: metadata?.FocalLength,
    cameraMake: metadata?.Make,
    cameraModel: metadata?.Model,
    lens: metadata?.LensModel,
    capturedAt: metadata?.DateTimeOriginal
      ? new Date(metadata.DateTimeOriginal).toISOString()
      : undefined,
    latitude: metadata?.latitude,
    longitude: metadata?.longitude,
  };
}
