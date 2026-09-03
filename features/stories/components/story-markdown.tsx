import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function StoryMarkdown({
  markdown,
  emptyMessage,
  className,
  unstyled = false,
}: {
  markdown: string;
  emptyMessage?: string;
  className?: string;
  unstyled?: boolean;
}) {
  return (
    <div
      className={cn(
        !unstyled &&
          "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:pl-1 [&_li+li]:mt-2 [&_p]:my-4 [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-muted-foreground/40 [&_blockquote]:pl-4 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-4 [&_table]:my-4 [&_table]:w-full [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{markdown || emptyMessage || "暂无正文"}</ReactMarkdown>
    </div>
  );
}
