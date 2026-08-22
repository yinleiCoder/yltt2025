import "server-only";

import { revalidatePath } from "next/cache";

export function revalidateCommentPages() {
  revalidatePath("/photography/[slug]", "page");
  revalidatePath("/videos/[slug]", "page");
  revalidatePath("/stories/[slug]", "page");
}
