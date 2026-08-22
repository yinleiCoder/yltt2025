import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AdministratorRequiredError,
  AuthenticationRequiredError,
  requireAdministrator,
} from "@/features/auth/server/auth-service";
import { UploadPolicyError } from "@/features/media/domain/upload-policy";
import { issueOssUploadSignature } from "@/features/media/server/oss-service";

const uploadRequestSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  size: z.number().int().positive(),
});

const verifiedUploadPolicyErrors = new Set([
  "照片文件不能超过 25 MB。",
  "视频文件不能超过 500 MB。",
  "仅支持 JPEG、PNG、WebP 图片和 H.264/AAC MP4 视频。",
]);

export async function POST(request: Request) {
  try {
    await requireAdministrator();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: "请先登录后再上传媒体。" }, { status: 401 });
    }

    if (error instanceof AdministratorRequiredError) {
      return NextResponse.json({ error: "仅管理员可以上传媒体。" }, { status: 403 });
    }

    return NextResponse.json({ error: "无法创建媒体上传地址。" }, { status: 500 });
  }

  let input;
  try {
    input = uploadRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "上传请求格式不正确。" }, { status: 400 });
  }

  try {
    const signature = issueOssUploadSignature(input);

    return NextResponse.json(
      {
        kind: signature.kind,
        objectKey: signature.objectKey,
        uploadUrl: signature.uploadUrl,
        expiresAt: signature.expiresAt,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof UploadPolicyError) {
      return NextResponse.json(
        {
          error: verifiedUploadPolicyErrors.has(error.message)
            ? error.message
            : "上传文件不符合要求。",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "无法创建媒体上传地址。" }, { status: 500 });
  }
}
