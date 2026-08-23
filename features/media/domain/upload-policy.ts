export type MediaKind = "photo" | "video";
export type ContentUploadTarget = "media" | "story-image";

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

type AvatarObjectKeyInput = {
  profileId: string;
  originalName: string;
  mimeType: string;
  timestamp: Date;
  token: string;
};

const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const PHOTO_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime", "video/x-m4v"]);
const AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const objectKeySegmentPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

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
  const mimeType = resolveMediaMimeType(upload.name, upload.mimeType);

  if (PHOTO_MIME_TYPES.has(mimeType)) {
    if (upload.size > MAX_PHOTO_BYTES) {
      throw new UploadPolicyError("照片文件不能超过 25 MB。");
    }

    return { kind: "photo", mimeType };
  }

  if (VIDEO_MIME_TYPES.has(mimeType)) {
    if (upload.size > MAX_VIDEO_BYTES) {
      throw new UploadPolicyError("视频文件不能超过 500 MB。");
    }

    return { kind: "video", mimeType };
  }

  throw new UploadPolicyError(
    "仅支持 JPEG、PNG、WebP、HEIC、HEIF 图片和 MP4、MOV、M4V 视频。",
  );
}

export function validateStoryImageUpload(upload: MediaUpload): { kind: "photo"; mimeType: string } {
  const mimeType = resolveMediaMimeType(upload.name, upload.mimeType);
  if (!PHOTO_MIME_TYPES.has(mimeType)) {
    throw new UploadPolicyError("故事图片仅支持 JPEG、PNG、WebP、HEIC 或 HEIF 图片。");
  }

  if (upload.size > MAX_PHOTO_BYTES) {
    throw new UploadPolicyError("照片文件不能超过 25 MB。");
  }

  return { kind: "photo", mimeType };
}

export function createStoryImageObjectKey(input: Omit<MediaObjectKeyInput, "kind">): string {
  const year = input.timestamp.getUTCFullYear();
  const month = String(input.timestamp.getUTCMonth() + 1).padStart(2, "0");
  return `stories/${year}/${month}/${input.token}-${fileStem(input.originalName)}.${extensionFor(input.originalName, "photo")}`;
}

export class AvatarObjectKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvatarObjectKeyError";
  }
}

export function validateAvatarUpload(upload: MediaUpload): { mimeType: string } {
  if (!AVATAR_MIME_TYPES.has(upload.mimeType)) {
    throw new UploadPolicyError("头像仅支持 JPEG、PNG 或 WebP 图片。");
  }

  if (upload.size > MAX_AVATAR_BYTES) {
    throw new UploadPolicyError("头像文件不能超过 5 MB。");
  }

  return { mimeType: upload.mimeType };
}

export function createMediaObjectKey(input: MediaObjectKeyInput): string {
  const extension = extensionFor(input.originalName, input.kind);
  const filename = fileStem(input.originalName);
  const year = input.timestamp.getUTCFullYear();
  const month = String(input.timestamp.getUTCMonth() + 1).padStart(2, "0");
  const directory = input.kind === "photo" ? "photos" : "videos";

  return `${directory}/${year}/${month}/${input.token}-${filename}.${extension}`;
}

export function createAvatarObjectKey(input: AvatarObjectKeyInput): string {
  const year = input.timestamp.getUTCFullYear();
  const month = String(input.timestamp.getUTCMonth() + 1).padStart(2, "0");
  const extension = avatarExtensionFor(input.mimeType);

  return `avatars/${input.profileId}/${year}/${month}/${input.token}-${fileStem(input.originalName)}.${extension}`;
}

export function parseOwnedAvatarObjectKey(objectKey: unknown, profileId: string): string {
  if (typeof objectKey !== "string" || !objectKey.startsWith("avatars/")) {
    throw new AvatarObjectKeyError("头像对象键格式无效。");
  }

  const prefix = `avatars/${profileId}/`;
  if (!objectKey.startsWith(prefix)) {
    throw new AvatarObjectKeyError("头像对象不属于当前用户。");
  }

  const segments = objectKey.split("/");
  const [namespace, ownerId, year, month, filename] = segments;
  if (
    segments.length !== 5 ||
    namespace !== "avatars" ||
    ownerId !== profileId ||
    !objectKeySegmentPattern.test(profileId) ||
    !/^\d{4}$/.test(year) ||
    !/^(0[1-9]|1[0-2])$/.test(month) ||
    !objectKeySegmentPattern.test(filename) ||
    !/\.(jpg|png|webp)$/i.test(filename)
  ) {
    throw new AvatarObjectKeyError("头像对象键格式无效。");
  }

  return objectKey;
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
  const permitted = kind === "photo"
    ? ["jpg", "jpeg", "png", "webp", "heic", "heif"]
    : ["mp4", "mov", "m4v"];

  if (extension && permitted.includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  return kind === "photo" ? "jpg" : "mp4";
}

export function resolveMediaMimeType(originalName: string, mimeType: string): string {
  if (mimeType.trim()) return mimeType.toLowerCase();

  switch (originalName.split(".").at(-1)?.toLowerCase()) {
    case "heic": return "image/heic";
    case "heif": return "image/heif";
    case "mov": return "video/quicktime";
    case "m4v": return "video/x-m4v";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "webp": return "image/webp";
    case "mp4": return "video/mp4";
    default: return "";
  }
}

function avatarExtensionFor(mimeType: string): "jpg" | "png" | "webp" {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      throw new UploadPolicyError("头像仅支持 JPEG、PNG 或 WebP 图片。");
  }
}
