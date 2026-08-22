const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const supportedAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export type AvatarSelection = {
  file: File | null;
  objectKey: string | null;
  previewObjectUrl: string | null;
  previewUrl: string | null;
};

type AvatarSelectionInput = {
  current: AvatarSelection;
  file: File | null;
  initialAvatarUrl: string | null;
  createPreviewUrl: (file: File) => string;
  revokePreviewUrl: (url: string) => void;
};

type AvatarSelectionResult =
  | { kind: "invalid"; error: string }
  | {
      kind: "clear" | "replace";
      selection: AvatarSelection;
      previousPreviewObjectUrl: string | null;
    };

export function changeAvatarSelection({
  current,
  file,
  initialAvatarUrl,
  createPreviewUrl,
  revokePreviewUrl,
}: AvatarSelectionInput): AvatarSelectionResult {
  if (!file) {
    revokePreviousPreview(current.previewObjectUrl, revokePreviewUrl);
    return {
      kind: "clear",
      previousPreviewObjectUrl: current.previewObjectUrl,
      selection: {
        file: null,
        objectKey: null,
        previewObjectUrl: null,
        previewUrl: initialAvatarUrl,
      },
    };
  }

  const validationError = validateAvatarFile(file);
  if (validationError) return { kind: "invalid", error: validationError };

  revokePreviousPreview(current.previewObjectUrl, revokePreviewUrl);
  const previewUrl = createPreviewUrl(file);
  return {
    kind: "replace",
    previousPreviewObjectUrl: current.previewObjectUrl,
    selection: {
      file,
      objectKey: null,
      previewObjectUrl: previewUrl,
      previewUrl,
    },
  };
}

function validateAvatarFile(file: File): string | null {
  if (!supportedAvatarTypes.has(file.type)) return "头像仅支持 JPEG、PNG 或 WebP 图片。";
  if (file.size > MAX_AVATAR_BYTES) return "头像文件不能超过 5 MB。";
  return null;
}

function revokePreviousPreview(
  previousPreviewObjectUrl: string | null,
  revokePreviewUrl: (url: string) => void,
) {
  if (previousPreviewObjectUrl) revokePreviewUrl(previousPreviewObjectUrl);
}
