"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import "@uiw/react-md-editor/markdown-editor.css";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StoryMarkdown } from "@/features/content/components/story-markdown";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false, loading: () => <div className="min-h-[32.5rem] rounded-lg border bg-muted/20" /> });

export function StoryMarkdownEditor({ defaultValue = "", name = "markdownBody" }: { defaultValue?: string; name?: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="grid gap-3">
      <input name={name} type="hidden" value={value} />
      <Tabs defaultValue="edit">
        <TabsList aria-label="故事正文视图">
          <TabsTrigger value="edit">编辑</TabsTrigger>
          <TabsTrigger value="preview">预览</TabsTrigger>
        </TabsList>
        <TabsContent value="edit" className="rounded-lg border bg-card p-1">
          <MDEditor height={520} value={value} onChange={(nextValue) => setValue(nextValue ?? "")} preview="edit" hideToolbar={false} visibleDragbar={false} />
        </TabsContent>
        <TabsContent value="preview" className="prose prose-neutral min-h-[32.5rem] max-w-none rounded-lg border bg-card p-4 dark:prose-invert">
          <StoryMarkdown markdown={value} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
