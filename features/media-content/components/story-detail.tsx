import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import type { PublicStoryItem } from "@/features/content/server/public-media-content-service";
import type { PublicComment } from "@/features/comments/server/comment-service";
import { CommentsSection } from "@/features/comments/components/comments-section";
import { PhotographyHeader } from "@/features/photography/components/photography-header";

export function StoryDetail({ story, comments, isSignedIn, currentUserId }: { story: PublicStoryItem; comments: PublicComment[]; isSignedIn: boolean; currentUserId: string | null }) {
  return <main className="min-h-dvh bg-[#111111] text-[#f7f7f7]"><PhotographyHeader /><article className="mx-auto w-full max-w-4xl px-5 pb-20 pt-8 sm:px-8 lg:pt-12"><Link className="font-mono text-[0.7rem] text-[#a8a8a8] transition-colors hover:text-white" href="/stories">← BACK TO STORIES</Link><header className="mt-12 border-b border-[#303030] pb-8"><p className="font-mono text-[0.7rem] text-[#979797]">STORY / {formatDate(story.publishedAt)}</p><h1 className="mt-4 font-[family-name:var(--font-editorial)] text-5xl leading-[1.02] sm:text-7xl">{story.title}</h1>{story.excerpt ? <p className="mt-6 max-w-2xl text-sm leading-7 text-[#b2b2b2]">{story.excerpt}</p> : null}</header><div className="prose prose-invert mt-10 max-w-none prose-headings:font-[family-name:var(--font-editorial)] prose-headings:font-normal prose-p:text-[#c4c4c4] prose-p:leading-8 prose-a:text-white"><ReactMarkdown rehypePlugins={[rehypeSanitize]} remarkPlugins={[remarkGfm]}>{story.markdownBody || "还没有正文。"}</ReactMarkdown></div><CommentsSection comments={comments} contentId={story.id} currentUserId={currentUserId} isSignedIn={isSignedIn} /></article></main>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)); }
