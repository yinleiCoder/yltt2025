import { prepareMediaFile, mediaTranscodeError } from "@/features/media/client/transcode-media";
import { needsMediaTranscode } from "@/features/media/client/media-format";

export const contentMediaPreparationError = "媒体上传准备失败，请稍后重试。";
export const contentMediaUploadError = "媒体上传失败，请稍后重试。";
export const contentPhotoExifError = "无法读取这张照片的 EXIF 信息。";

const verifiedMediaUploadErrors = new Set([
  "请先登录后再上传媒体。",
  "仅管理员可以上传媒体。",
  "上传请求格式不正确。",
  "照片文件不能超过 200 MB。",
  "视频文件不能超过 2 GB。",
  "故事图片仅支持 JPEG、PNG、WebP、HEIC 或 HEIF 图片。",
  "仅支持 JPEG、PNG、WebP、HEIC、HEIF 图片和 MP4、MOV、M4V 视频。",
  "无法创建媒体上传地址。",
]);

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type UploadProgressHandler = (percentage: number) => void;

type ContentUploadSignature = {
  kind: "photo" | "video";
  mimeType: string;
  objectKey: string;
  uploadUrl: string;
  expiresAt: string;
};

export class ContentMediaUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentMediaUploadError";
  }
}

export async function uploadContentMedia(
  file: File,
  fetcher: Fetcher = fetch,
  target: "media" | "story-image" = "media",
  onProgress?: UploadProgressHandler,
): Promise<string> {
  const shouldTranscode = needsMediaTranscode(file);
  let preparedFile: File;
  try {
    preparedFile = await prepareMediaFile(
      file,
      onProgress && shouldTranscode
        ? (percentage) => onProgress(Math.round(percentage * 0.35))
        : undefined,
    );
  } catch (error) {
    throw new ContentMediaUploadError(
      error instanceof Error && error.message === mediaTranscodeError
        ? error.message
        : contentMediaPreparationError,
    );
  }

  let signatureResponse: Response;

  try {
    signatureResponse = await fetcher("/api/admin/media/upload-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: preparedFile.name, mimeType: preparedFile.type, size: preparedFile.size, target }),
    });
  } catch {
    throw new ContentMediaUploadError(contentMediaPreparationError);
  }

  const payload = await readSignaturePayload(signatureResponse);
  if (!signatureResponse.ok) {
    throw new ContentMediaUploadError(getVerifiedMediaUploadError(payload));
  }

  if (!isContentUploadSignature(payload, target)) {
    throw new ContentMediaUploadError(contentMediaPreparationError);
  }

  try {
    const uploadResponse = onProgress
      ? await uploadWithProgress(
          payload.uploadUrl,
          preparedFile,
          payload.mimeType,
          (percentage) => onProgress(Math.round((shouldTranscode ? 35 : 0) + percentage * (shouldTranscode ? 0.65 : 1))),
        )
      : await fetcher(payload.uploadUrl, { method: "PUT", headers: { "Content-Type": payload.mimeType }, body: preparedFile });
    if (!uploadResponse.ok) {
      throw new ContentMediaUploadError(contentMediaUploadError);
    }
  } catch (error) {
    if (error instanceof ContentMediaUploadError) throw error;
    throw new ContentMediaUploadError(contentMediaUploadError);
  }

  return payload.objectKey;
}

function uploadWithProgress(uploadUrl: string, file: File, mimeType: string, onProgress: UploadProgressHandler): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Type", mimeType);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => resolve(new Response(null, { status: request.status }));
    request.onerror = () => reject(new Error("upload failed"));
    request.send(file);
  });
}

export async function readContentPhotoExif<T>(
  file: File,
  readExif: (file: File) => Promise<T>,
): Promise<{ exif: T; ok: true } | { error: string; ok: false }> {
  try {
    return { exif: await readExif(file), ok: true };
  } catch {
    return { error: contentPhotoExifError, ok: false };
  }
}

async function readSignaturePayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getVerifiedMediaUploadError(payload: unknown): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string" &&
    verifiedMediaUploadErrors.has(payload.error)
  ) {
    return payload.error;
  }

  return contentMediaPreparationError;
}

function isContentUploadSignature(payload: unknown, target: "media" | "story-image"): payload is ContentUploadSignature {
  if (typeof payload !== "object" || payload === null) return false;

  const candidate = payload as Partial<ContentUploadSignature>;
  if (
    (candidate.kind !== "photo" && candidate.kind !== "video") ||
    typeof candidate.mimeType !== "string" ||
    typeof candidate.objectKey !== "string" ||
    typeof candidate.uploadUrl !== "string" ||
    typeof candidate.expiresAt !== "string"
  ) {
    return false;
  }

  try {
    new URL(candidate.uploadUrl);
    const expectedPrefix = target === "story-image" ? "stories/" : candidate.kind === "photo" ? "photos/" : "videos/";
    return candidate.objectKey.startsWith(expectedPrefix);
  } catch {
    return false;
  }
}
