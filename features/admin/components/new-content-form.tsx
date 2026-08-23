"use client";

import { ContentForm } from "@/features/admin/components/content-form";
import { createContentAction } from "@/features/content/server/actions";

export function NewContentForm({ kind = "photo" }: { kind?: "photo" | "video" | "story" }) {
  return <ContentForm action={createContentAction} initialValues={{ kind }} mode="create" />;
}
