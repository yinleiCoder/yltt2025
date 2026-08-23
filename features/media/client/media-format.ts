export type PreparedMediaKind = "photo" | "video";

const PHOTO_TRANSCODE_EXTENSIONS = new Set(["heic", "heif"]);
const PHOTO_TRANSCODE_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);
const VIDEO_TRANSCODE_EXTENSIONS = new Set(["mov", "m4v"]);
const VIDEO_TRANSCODE_MIME_TYPES = new Set(["video/quicktime", "video/x-m4v"]);

export function mediaKindForFile(file: Pick<File, "name" | "type">): PreparedMediaKind {
  const mimeType = file.type.toLowerCase();
  const extension = extensionFor(file.name);
  return PHOTO_TRANSCODE_MIME_TYPES.has(mimeType) || PHOTO_TRANSCODE_EXTENSIONS.has(extension)
    ? "photo"
    : VIDEO_TRANSCODE_MIME_TYPES.has(mimeType) || VIDEO_TRANSCODE_EXTENSIONS.has(extension)
      ? "video"
      : mimeType.startsWith("image/")
        ? "photo"
        : "video";
}

export function needsMediaTranscode(file: Pick<File, "name" | "type">): boolean {
  const mimeType = file.type.toLowerCase();
  const extension = extensionFor(file.name);
  return PHOTO_TRANSCODE_MIME_TYPES.has(mimeType)
    || PHOTO_TRANSCODE_EXTENSIONS.has(extension)
    || VIDEO_TRANSCODE_MIME_TYPES.has(mimeType)
    || VIDEO_TRANSCODE_EXTENSIONS.has(extension);
}

export function getPreparedMediaName(originalName: string, kind: PreparedMediaKind): string {
  const leafName = originalName.split(/[\\/]/).at(-1) ?? "media";
  const stem = leafName.replace(/\.[^.]+$/, "") || "media";
  return `${stem}.${kind === "photo" ? "webp" : "mp4"}`;
}

export function getPreparedMediaType(kind: PreparedMediaKind): string {
  return kind === "photo" ? "image/webp" : "video/mp4";
}

function extensionFor(name: string): string {
  return name.split(".").at(-1)?.toLowerCase() ?? "";
}
