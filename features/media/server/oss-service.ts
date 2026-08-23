import "server-only";

import OSS from "ali-oss";
import { randomUUID } from "crypto";

import {
  createAvatarObjectKey,
  createMediaObjectKey,
  createStoryImageObjectKey,
  type ContentUploadTarget,
  type MediaKind,
  validateAvatarUpload,
  validateMediaUpload,
  validateStoryImageUpload,
} from "@/features/media/domain/upload-policy";
import { getOssEnvironment } from "@/lib/env";

type UploadSignatureInput = {
  name: string;
  mimeType: string;
  size: number;
};

export type UploadSignature = {
  kind: MediaKind;
  mimeType: string;
  objectKey: string;
  uploadUrl: string;
  expiresAt: string;
};

export type AvatarUploadSignature = Omit<UploadSignature, "kind" | "mimeType"> & {
  fields: Record<string, string>;
};

type AvatarUploadSignatureInput = UploadSignatureInput & {
  profileId: string;
};

type OssPostPolicyClient = {
  calculatePostSignature(policy: object): {
    OSSAccessKeyId: string;
    Signature: string;
    policy: string;
  };
  generateObjectUrl(name: string): string;
};

export function issueOssUploadSignature(input: UploadSignatureInput, target: ContentUploadTarget = "media"): UploadSignature {
  const upload = target === "story-image" ? validateStoryImageUpload(input) : validateMediaUpload(input);
  const environment = getOssEnvironment();
  const objectKey = target === "story-image"
    ? createStoryImageObjectKey({ originalName: input.name, timestamp: new Date(), token: randomUUID() })
    : createMediaObjectKey({ kind: upload.kind, originalName: input.name, timestamp: new Date(), token: randomUUID() });
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
    mimeType: upload.mimeType,
    objectKey,
    uploadUrl: client.signatureUrl(objectKey, {
      method: "PUT",
      expires: expiresInSeconds,
      "Content-Type": upload.mimeType,
    }),
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
  };
}

export function issueAvatarUploadSignature(input: AvatarUploadSignatureInput): AvatarUploadSignature {
  const upload = validateAvatarUpload(input);
  const environment = getOssEnvironment();
  const expiresInSeconds = 300;
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + expiresInSeconds * 1000);
  const objectKey = createAvatarObjectKey({
    profileId: input.profileId,
    originalName: input.name,
    mimeType: upload.mimeType,
    timestamp: issuedAt,
    token: randomUUID(),
  });
  const client = new OSS({
    region: environment.OSS_REGION,
    bucket: environment.OSS_BUCKET,
    accessKeyId: environment.OSS_ACCESS_KEY_ID,
    accessKeySecret: environment.OSS_ACCESS_KEY_SECRET,
    endpoint: environment.OSS_ENDPOINT,
  });
  const policy = {
    expiration: expiresAt.toISOString(),
    conditions: [
      { bucket: environment.OSS_BUCKET },
      ["eq", "$key", objectKey],
      ["eq", "$content-type", upload.mimeType],
      ["content-length-range", 1, input.size],
      ["eq", "$success_action_status", "201"],
    ],
  };
  // ali-oss exposes these POST-policy methods at runtime but omits them from its declarations.
  const postClient = client as unknown as OssPostPolicyClient;
  const postSignature = postClient.calculatePostSignature(policy);

  return {
    objectKey,
    uploadUrl: postClient.generateObjectUrl(""),
    fields: {
      key: objectKey,
      "Content-Type": upload.mimeType,
      success_action_status: "201",
      ...postSignature,
    },
    expiresAt: expiresAt.toISOString(),
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
