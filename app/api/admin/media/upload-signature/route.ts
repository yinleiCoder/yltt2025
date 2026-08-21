import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdministrator } from "@/features/auth/server/auth-service";
import { UploadPolicyError } from "@/features/media/domain/upload-policy";
import { issueOssUploadSignature } from "@/features/media/server/oss-service";

const uploadRequestSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  size: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    await requireAdministrator();
    const input = uploadRequestSchema.parse(await request.json());
    const signature = issueOssUploadSignature(input);

    return NextResponse.json(signature, { status: 201 });
  } catch (error) {
    if (error instanceof UploadPolicyError || error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  }
}
