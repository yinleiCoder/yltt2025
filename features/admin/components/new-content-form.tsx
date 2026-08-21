"use client";

import { ContentForm } from "@/features/admin/components/content-form";
import { createContentAction } from "@/features/content/server/actions";

export function NewContentForm() {
  return <ContentForm action={createContentAction} mode="create" />;
}
