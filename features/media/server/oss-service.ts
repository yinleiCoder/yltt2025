import OSS from "ali-oss";
import { randomUUID } from "crypto";

import {
  createMediaObjectKey,
  type MediaKind,
  validateMediaUpload,
} from "@/features/media/domain/upload-policy";
import { getOssEnvironment } from "@/lib/env";

type UploadSignatureInput = {
  name: string;
  mimeType: string;
  size: number;
};

export type UploadSignature = {
  kind: MediaKind;
  objectKey: string;
  uploadUrl: string;
  expiresAt: string;
};

export function issueOssUploadSignature(input: UploadSignatureInput): UploadSignature {
  const upload = validateMediaUpload(input);
  const environment = getOssEnvironment();
  const objectKey = createMediaObjectKey({
    kind: upload.kind,
    originalName: input.name,
    timestamp: new Date(),
    token: randomUUID(),
  });
  const client = new OSS({
    region: environment.OSS_REGION,
    bucket: environment.OSS_BUCKET,
    accessKeyId: environment.OSS_ACCESS_KEY_ID,
    accessKeySecret: environment.OSS_ACCESS_KEY_SECRET,
    endpoint: environment.OSS_ENDPOINT,
  });
  const expiresInSeconds = 300;

  return {
    kind: upload.kind,
    objectKey,
    uploadUrl: client.signatureUrl(objectKey, {
      method: "PUT",
      expires: expiresInSeconds,
      "Content-Type": upload.mimeType,
    }),
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
  };
}

export async function deleteOssObject(objectKey: string): Promise<void> {
  const environment = getOssEnvironment();
  const client = new OSS({
    region: environment.OSS_REGION,
    bucket: environment.OSS_BUCKET,
    accessKeyId: environment.OSS_ACCESS_KEY_ID,
    accessKeySecret: environment.OSS_ACCESS_KEY_SECRET,
    endpoint: environment.OSS_ENDPOINT,
  });

  await client.delete(objectKey);
}
