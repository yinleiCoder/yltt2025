import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AuthenticationRequiredError,
  requireCurrentProfile,
} from "@/features/auth/server/auth-service";
import { UploadPolicyError, validateAvatarUpload } from "@/features/media/domain/upload-policy";
import { issueAvatarUploadSignature } from "@/features/media/server/oss-service";

const avatarUploadRequestSchema = z
  .object({
    name: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(100),
    size: z.number().int().positive(),
  })
  .strict();

export async function POST(request: Request) {
  let currentProfile;

  try {
    currentProfile = await requireCurrentProfile();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: "请先登录后再上传头像。" }, { status: 401 });
    }

    return NextResponse.json({ error: "无法创建头像上传地址。" }, { status: 500 });
  }

  let input;
  try {
    input = avatarUploadRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "上传请求格式不正确。" }, { status: 400 });
  }

  try {
    validateAvatarUpload(input);
    const signature = issueAvatarUploadSignature({ ...input, profileId: currentProfile.id });

    return NextResponse.json(
      {
        objectKey: signature.objectKey,
        uploadUrl: signature.uploadUrl,
        fields: signature.fields,
        expiresAt: signature.expiresAt,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof UploadPolicyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "无法创建头像上传地址。" }, { status: 500 });
  }
}
