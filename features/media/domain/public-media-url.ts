type PublicMediaUrlInput = {
  baseUrl: string;
  objectKey: string;
  imageWidth?: number;
};

const objectKeySegmentPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export class PublicMediaUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicMediaUrlError";
  }
}

export function createPublicMediaUrl({
  baseUrl,
  objectKey,
  imageWidth,
}: PublicMediaUrlInput): string {
  const mediaBaseUrl = toMediaBaseUrl(baseUrl);
  const objectPath = toSafeObjectPath(objectKey);
  const publicUrl = new URL(objectPath, mediaBaseUrl);

  if (!publicUrl.pathname.startsWith(mediaBaseUrl.pathname)) {
    throw new PublicMediaUrlError("The media object key is outside the configured base path.");
  }

  if (imageWidth !== undefined) {
    if (!Number.isInteger(imageWidth) || imageWidth <= 0) {
      throw new PublicMediaUrlError("Image width must be a positive integer.");
    }

    publicUrl.searchParams.set(
      "x-oss-process",
      `image/format,webp/resize,w_${imageWidth}`,
    );
  }

  return publicUrl.toString();
}

function toMediaBaseUrl(baseUrl: string): URL {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new PublicMediaUrlError("The media base URL must be a valid absolute URL.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new PublicMediaUrlError("The media base URL must use HTTPS.");
  }

  parsedUrl.search = "";
  parsedUrl.hash = "";
  parsedUrl.pathname = `${parsedUrl.pathname.replace(/\/+$/, "")}/`;

  return parsedUrl;
}

function toSafeObjectPath(objectKey: string): string {
  const segments = objectKey.split("/");

  if (!segments.length || segments.some((segment) => !objectKeySegmentPattern.test(segment))) {
    throw new PublicMediaUrlError("The media object key contains an invalid path segment.");
  }

  return segments.map(encodeURIComponent).join("/");
}
