export const contentMediaPreparationError = "媒体上传准备失败，请稍后重试。";
export const contentMediaUploadError = "媒体上传失败，请稍后重试。";
export const contentPhotoExifError = "无法读取这张照片的 EXIF 信息。";

const verifiedMediaUploadErrors = new Set([
  "请先登录后再上传媒体。",
  "仅管理员可以上传媒体。",
  "上传请求格式不正确。",
  "照片文件不能超过 25 MB。",
  "视频文件不能超过 500 MB。",
  "仅支持 JPEG、PNG、WebP 图片和 H.264/AAC MP4 视频。",
  "无法创建媒体上传地址。",
]);

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type ContentUploadSignature = {
  kind: "photo" | "video";
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

export async function uploadContentMedia(file: File, fetcher: Fetcher = fetch): Promise<string> {
  let signatureResponse: Response;

  try {
    signatureResponse = await fetcher("/api/admin/media/upload-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, mimeType: file.type, size: file.size }),
    });
  } catch {
    throw new ContentMediaUploadError(contentMediaPreparationError);
  }

  const payload = await readSignaturePayload(signatureResponse);
  if (!signatureResponse.ok) {
    throw new ContentMediaUploadError(getVerifiedMediaUploadError(payload));
  }

  if (!isContentUploadSignature(payload)) {
    throw new ContentMediaUploadError(contentMediaPreparationError);
  }

  try {
    const uploadResponse = await fetcher(payload.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!uploadResponse.ok) {
      throw new ContentMediaUploadError(contentMediaUploadError);
    }
  } catch (error) {
    if (error instanceof ContentMediaUploadError) throw error;
    throw new ContentMediaUploadError(contentMediaUploadError);
  }

  return payload.objectKey;
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

function isContentUploadSignature(payload: unknown): payload is ContentUploadSignature {
  if (typeof payload !== "object" || payload === null) return false;

  const candidate = payload as Partial<ContentUploadSignature>;
  if (
    (candidate.kind !== "photo" && candidate.kind !== "video") ||
    typeof candidate.objectKey !== "string" ||
    typeof candidate.uploadUrl !== "string" ||
    typeof candidate.expiresAt !== "string"
  ) {
    return false;
  }

  try {
    new URL(candidate.uploadUrl);
    return candidate.objectKey.startsWith(candidate.kind === "photo" ? "photos/" : "videos/");
  } catch {
    return false;
  }
}
