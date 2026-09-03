"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import "@uiw/react-md-editor/markdown-editor.css";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StoryMarkdown } from "@/features/stories/components/story-markdown";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false, loading: () => <div className="min-h-[32.5rem] rounded-lg border bg-muted/20" /> });

export function StoryMarkdownEditor({ defaultValue = "", name = "markdownBody" }: { defaultValue?: string; name?: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="grid min-w-0 max-w-full gap-3">
      <input name={name} type="hidden" value={value} />
      <Tabs defaultValue="edit" className="min-w-0">
        <TabsList aria-label="故事正文视图" className="max-w-full">
          <TabsTrigger value="edit">编辑</TabsTrigger>
          <TabsTrigger value="preview">预览</TabsTrigger>
        </TabsList>
        <TabsContent value="edit" className="min-w-0 max-w-full overflow-hidden rounded-lg border bg-card p-1">
          <MDEditor height={520} value={value} onChange={(nextValue) => setValue(nextValue ?? "")} preview="edit" hideToolbar={false} visibleDragbar={false} />
        </TabsContent>
        <TabsContent value="preview" className="prose prose-neutral min-h-[32.5rem] max-w-full overflow-x-auto rounded-lg border bg-card p-4 dark:prose-invert">
          <StoryMarkdown markdown={value} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
