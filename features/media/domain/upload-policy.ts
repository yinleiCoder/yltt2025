export type MediaKind = "photo" | "video";

type MediaUpload = {
  name: string;
  mimeType: string;
  size: number;
};

type MediaObjectKeyInput = {
  kind: MediaKind;
  originalName: string;
  timestamp: Date;
  token: string;
};

const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const PHOTO_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class UploadPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadPolicyError";
  }
}

export function validateMediaUpload(upload: MediaUpload): {
  kind: MediaKind;
  mimeType: string;
} {
  if (PHOTO_MIME_TYPES.has(upload.mimeType)) {
    if (upload.size > MAX_PHOTO_BYTES) {
      throw new UploadPolicyError("Photos must not exceed 25 MB.");
    }

    return { kind: "photo", mimeType: upload.mimeType };
  }

  if (upload.mimeType === "video/mp4") {
    if (upload.size > MAX_VIDEO_BYTES) {
      throw new UploadPolicyError("Videos must not exceed 500 MB.");
    }

    return { kind: "video", mimeType: upload.mimeType };
  }

  throw new UploadPolicyError(
    "Only JPEG, PNG, WebP, and H.264/AAC MP4 files are accepted.",
  );
}

export function createMediaObjectKey(input: MediaObjectKeyInput): string {
  const extension = extensionFor(input.originalName, input.kind);
  const filename = fileStem(input.originalName);
  const year = input.timestamp.getUTCFullYear();
  const month = String(input.timestamp.getUTCMonth() + 1).padStart(2, "0");
  const directory = input.kind === "photo" ? "photos" : "videos";

  return `${directory}/${year}/${month}/${input.token}-${filename}.${extension}`;
}

function fileStem(originalName: string): string {
  const leafName = originalName.split(/[\\/]/).at(-1) ?? "media";
  const withoutExtension = leafName.replace(/\.[^.]+$/, "");
  const normalized = withoutExtension
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "media";
}

function extensionFor(originalName: string, kind: MediaKind): string {
  const extension = originalName.split(".").at(-1)?.toLowerCase();
  const permitted = kind === "photo" ? ["jpg", "jpeg", "png", "webp"] : ["mp4"];

  if (extension && permitted.includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  return kind === "photo" ? "jpg" : "mp4";
}
