# 全站流式加载与 Sonner 操作反馈 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为公开页面和后台页面提供即时、结构稳定的流式加载占位，并为全站关键异步操作提供统一的 Sonner 状态反馈。

**Architecture:** 维持现有 Server Component 和 Supabase 服务端查询边界。通过 App Router 的 `loading.tsx` 覆盖整段导航，通过详情页内的 `Suspense` 将评论查询从主体渲染中分离；在根布局挂载一次 `Toaster`，客户端组件根据 server action 与网络操作的状态触发 toast，同时保留就近的可访问错误文本。

**Tech Stack:** Next.js 16 App Router、React 19 Suspense/useActionState/useTransition、Tailwind CSS、shadcn `Skeleton`、Sonner、Vitest。

---

## File Structure

- Create: `components/feedback/comments-skeleton.tsx` - 评论区独立 Suspense fallback。
- Create: `components/feedback/public-page-skeleton.tsx` - 公开页面标题、媒体网格和详情内容骨架。
- Create: `components/feedback/admin-page-skeleton.tsx` - 后台统计、表格和编辑表单骨架。
- Create: `app/loading.tsx` - 覆盖动态 layout 首次执行时的父级 fallback。
- Create: `app/(site)/loading.tsx` - 公开站点路由段 fallback。
- Create: `app/admin/loading.tsx` - 后台路由段 fallback。
- Create: `app/admin/content/[id]/loading.tsx` - 编辑详情的字段/编辑器占位。
- Modify: `app/layout.tsx` - 全局挂载 Sonner `Toaster`。
- Modify: `app/(site)/photography/[slug]/page.tsx`, `app/(site)/stories/[slug]/page.tsx`, `app/(site)/videos/[slug]/page.tsx` - 先渲染主体，再流式查询评论。
- Modify: `features/photography/components/photography-detail.tsx`, `features/media-content/components/story-detail.tsx`, `features/media-content/components/video-detail.tsx` - 从主体组件移除 comments prop，接受插槽化评论区。
- Modify: `features/comments/components/comments-section.tsx` - 评论增、改、删的 pending 与 Sonner 反馈。
- Modify: `features/admin/components/admin-user-role-form.tsx`, `features/admin/components/admin-comment-status-form.tsx` - server action 结果触发 toast。
- Modify: `features/admin/components/content-form.tsx` - 上传、EXIF、定位、保存统一提示并锁定提交。
- Modify: `features/profile/components/profile-form.tsx` - 头像网络失败触发 Sonner，同时保留字段错误。
- Modify: `features/auth/components/login-form.tsx`, `features/auth/components/register-form.tsx` - 登录/注册 action error 触发 Sonner，保留 Alert。
- Modify: `features/admin/components/delete-content-form.tsx`, `features/auth/components/profile-menu.tsx`, `features/admin/components/admin-shell.tsx` - 直接重定向 action 的提交中状态。
- Create: `components/feedback/loading-skeletons.test.ts` - 验证骨架区域和稳定尺寸契约。
- Create: `features/comments/components/comments-section.test.ts` - 验证 toast 与 mutation pending 契约。
- Create: `features/admin/components/admin-mutation-feedback.test.ts` - 验证后台 mutation 的 toast 契约。
- Modify: `features/admin/components/content-form.test.ts` - 验证上传/定位/保存 toast 和禁用契约。
- Modify: `features/profile/components/profile-form.test.ts`, `features/auth/components/auth-form-copy.test.ts` - 验证错误反馈使用 toast。

### Task 1: 建立可复用的加载骨架

**Files:**
- Create: `components/feedback/public-page-skeleton.tsx`
- Create: `components/feedback/admin-page-skeleton.tsx`
- Create: `components/feedback/comments-skeleton.tsx`
- Create: `components/feedback/loading-skeletons.test.ts`

- [ ] **Step 1: 写出骨架契约测试**

```ts
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("loading skeletons", () => {
  it("为公开、后台和评论区域保留稳定结构", async () => {
    const [publicPage, adminPage, comments] = await Promise.all([
      readFile(resolve(import.meta.dirname, "public-page-skeleton.tsx"), "utf8"),
      readFile(resolve(import.meta.dirname, "admin-page-skeleton.tsx"), "utf8"),
      readFile(resolve(import.meta.dirname, "comments-skeleton.tsx"), "utf8"),
    ]);

    expect(publicPage).toContain('aria-busy="true"');
    expect(publicPage).toContain("aspect-[3/2]");
    expect(adminPage).toContain("grid-cols-3");
    expect(adminPage).toContain("min-w-[46rem]");
    expect(comments).toContain('aria-busy="true"');
    expect(comments).toContain("h-16");
  });
});
```

- [ ] **Step 2: 运行测试，确认因文件不存在而失败**

Run: `npm test -- components/feedback/loading-skeletons.test.ts`

Expected: FAIL，提示找不到三个骨架组件文件。

- [ ] **Step 3: 创建三个最小可复用组件**

```tsx
// components/feedback/comments-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function CommentsSkeleton() {
  return <section aria-busy="true" aria-label="正在加载评论" className="mt-16 border-y border-[#d9d9d4] py-6"><Skeleton className="h-7 w-28" /><div className="mt-6 divide-y divide-[#d9d9d4]">{Array.from({ length: 3 }, (_, index) => <div className="py-4" key={index}><Skeleton className="h-4 w-24" /><Skeleton className="mt-3 h-16 w-full" /></div>)}</div></section>;
}
```

```tsx
// components/feedback/public-page-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function PublicPageSkeleton() {
  return <main aria-busy="true" className="min-h-dvh bg-[rgb(233,233,233)] px-5 py-12 sm:px-8 lg:px-12"><div className="mx-auto max-w-7xl"><Skeleton className="h-3 w-40" /><Skeleton className="mt-6 h-16 max-w-2xl" /><Skeleton className="mt-4 h-5 max-w-xl" /><div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div className="border border-[#d9d9d4] p-3" key={index}><Skeleton className="aspect-[3/2] w-full" /><Skeleton className="mt-4 h-5 w-3/4" /><Skeleton className="mt-3 h-3 w-1/2" /></div>)}</div></div></main>;
}
```

```tsx
// components/feedback/admin-page-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function AdminPageSkeleton({ editor = false }: { editor?: boolean }) {
  return <main aria-busy="true" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><Skeleton className="h-4 w-24" /><Skeleton className="mt-3 h-8 w-40" />{editor ? <div className="mt-8 grid max-w-3xl gap-5">{Array.from({ length: 8 }, (_, index) => <Skeleton className={index === 4 ? "h-80 w-full" : "h-10 w-full"} key={index} />)}</div> : <><div className="mt-8 grid border-b sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div className="border p-6" key={index}><Skeleton className="h-4 w-20" /><Skeleton className="mt-3 h-9 w-16" /></div>)}</div><div className="mt-8 overflow-x-auto border"><div className="min-w-[46rem] p-4">{Array.from({ length: 6 }, (_, index) => <Skeleton className="mb-3 h-10 w-full" key={index} />)}</div></div></>}</main>;
}
```

- [ ] **Step 4: 运行骨架测试，确认通过**

Run: `npm test -- components/feedback/loading-skeletons.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交这一独立改动**

```bash
git add components/feedback
git commit -m "feat: add reusable loading skeletons"
```

### Task 2: 接入路由级 streaming fallback 与全局 Toaster

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/loading.tsx`
- Create: `app/(site)/loading.tsx`
- Create: `app/admin/loading.tsx`
- Create: `app/admin/content/[id]/loading.tsx`
- Modify: `components/feedback/loading-skeletons.test.ts`

- [ ] **Step 1: 扩展测试，要求路由段引用骨架且根布局挂载 Toaster**

```ts
const [layout, rootLoading, siteLoading, adminLoading, editorLoading] = await Promise.all([
  readFile(resolve(process.cwd(), "app/layout.tsx"), "utf8"),
  readFile(resolve(process.cwd(), "app/loading.tsx"), "utf8"),
  readFile(resolve(process.cwd(), "app/(site)/loading.tsx"), "utf8"),
  readFile(resolve(process.cwd(), "app/admin/loading.tsx"), "utf8"),
  readFile(resolve(process.cwd(), "app/admin/content/[id]/loading.tsx"), "utf8"),
]);

expect(layout).toContain('import { Toaster } from "@/components/ui/sonner"');
expect(layout).toContain('<Toaster closeButton position="top-right" />');
expect(rootLoading).toContain("PublicPageSkeleton");
expect(siteLoading).toContain("PublicPageSkeleton");
expect(adminLoading).toContain("AdminPageSkeleton");
expect(editorLoading).toContain("editor");
```

- [ ] **Step 2: 运行测试，确认新增断言失败**

Run: `npm test -- components/feedback/loading-skeletons.test.ts`

Expected: FAIL，缺少路由 loading 文件和 Toaster。

- [ ] **Step 3: 最小化接入根布局和三个 route loading 文件**

```tsx
// app/(site)/loading.tsx
import { PublicPageSkeleton } from "@/components/feedback/public-page-skeleton";
export default function Loading() { return <PublicPageSkeleton />; }

// app/loading.tsx
import { PublicPageSkeleton } from "@/components/feedback/public-page-skeleton";
export default function Loading() { return <PublicPageSkeleton />; }

// app/admin/loading.tsx
import { AdminPageSkeleton } from "@/components/feedback/admin-page-skeleton";
export default function Loading() { return <AdminPageSkeleton />; }

// app/admin/content/[id]/loading.tsx
import { AdminPageSkeleton } from "@/components/feedback/admin-page-skeleton";
export default function Loading() { return <AdminPageSkeleton editor />; }
```

在 `app/layout.tsx` 的 `body` 中，紧接 `AuthHashErrorRedirect` 后添加：

```tsx
<Toaster closeButton position="top-right" />
```

- [ ] **Step 4: 运行测试和类型检查**

Run: `npm test -- components/feedback/loading-skeletons.test.ts && npm run typecheck`

Expected: PASS；TypeScript 不报告错误。

- [ ] **Step 5: 提交路由流式改动**

```bash
git add app/layout.tsx app/loading.tsx app/(site)/loading.tsx app/admin/loading.tsx app/admin/content/[id]/loading.tsx components/feedback/loading-skeletons.test.ts
git commit -m "feat: stream route loading states"
```

### Task 3: 将公开详情评论拆为独立流式区块

**Files:**
- Modify: `app/(site)/photography/[slug]/page.tsx`
- Modify: `app/(site)/stories/[slug]/page.tsx`
- Modify: `app/(site)/videos/[slug]/page.tsx`
- Modify: `features/photography/components/photography-detail.tsx`
- Modify: `features/media-content/components/story-detail.tsx`
- Modify: `features/media-content/components/video-detail.tsx`
- Create: `features/comments/components/streamed-comments.tsx`
- Create: `features/comments/components/streamed-comments.test.ts`

- [ ] **Step 1: 写测试，定义详情页主体不再接受 comments 且页面使用 Suspense**

```ts
expect(await readFile(photoPage, "utf8")).toContain("<Suspense fallback={<CommentsSkeleton />}");
expect(await readFile(storyPage, "utf8")).toContain("<Suspense fallback={<CommentsSkeleton />}");
expect(await readFile(videoPage, "utf8")).toContain("<Suspense fallback={<CommentsSkeleton />}");
expect(await readFile(photoDetail, "utf8")).not.toContain("comments: PublicComment[]");
expect(await readFile(streamedComments, "utf8")).toContain("await listPublicComments(contentId)");
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- features/comments/components/streamed-comments.test.ts`

Expected: FAIL，`streamed-comments.tsx` 与 Suspense 代码不存在。

- [ ] **Step 3: 创建服务端 StreamedComments 组件，并将三个详情页改为插槽接口**

```tsx
// features/comments/components/streamed-comments.tsx
import { CommentsSection } from "@/features/comments/components/comments-section";
import { listPublicComments } from "@/features/comments/server/comment-service";

export async function StreamedComments({ contentId }: { contentId: string }) {
  const comments = await listPublicComments(contentId);
  return <CommentsSection comments={comments} contentId={contentId} />;
}
```

每个 `page.tsx` 只等待内容实体，在返回详情组件时传入：

```tsx
comments={<Suspense fallback={<CommentsSkeleton />}><StreamedComments contentId={item.id} /></Suspense>}
```

每个详情组件的 props 改为 `comments: ReactNode`，删除 `PublicComment` 和 `CommentsSection` 导入，将原有 `<CommentsSection ... />` 替换为 `{comments}`。

- [ ] **Step 4: 运行流式详情测试与类型检查**

Run: `npm test -- features/comments/components/streamed-comments.test.ts && npm run typecheck`

Expected: PASS。

- [ ] **Step 5: 提交独立评论流式改动**

```bash
git add app/(site)/photography/[slug]/page.tsx app/(site)/stories/[slug]/page.tsx app/(site)/videos/[slug]/page.tsx features/photography/components/photography-detail.tsx features/media-content/components/story-detail.tsx features/media-content/components/video-detail.tsx features/comments/components
git commit -m "feat: stream comments on public detail pages"
```

### Task 4: 为评论与后台 server actions 添加 Sonner 反馈

**Files:**
- Modify: `features/comments/components/comments-section.tsx`
- Modify: `features/admin/components/admin-user-role-form.tsx`
- Modify: `features/admin/components/admin-comment-status-form.tsx`
- Create: `features/comments/components/comments-section.test.ts`
- Create: `features/admin/components/admin-mutation-feedback.test.ts`

- [ ] **Step 1: 写出 toast、错误保留和 pending 控制测试**

```ts
expect(commentSource).toContain('import { toast } from "sonner"');
expect(commentSource).toContain("const [isMutating, startMutation] = useTransition()");
expect(commentSource).toContain("toast.success(result.success)");
expect(commentSource).toContain("toast.error(result.error)");
expect(commentSource).toContain("disabled={isPending || isMutating}");
expect(adminRoleSource).toContain('import { toast } from "sonner"');
expect(adminRoleSource).toContain("useEffect");
expect(adminCommentSource).toContain("toast.success(state.success)");
```

- [ ] **Step 2: 运行评论与后台测试，确认失败**

Run: `npm test -- features/comments/components/comments-section.test.ts features/admin/components/admin-mutation-feedback.test.ts`

Expected: FAIL，现有组件没有 toast 或 mutation transition。

- [ ] **Step 3: 实现评论反馈**

在 `CommentsSection` 中增加：

```tsx
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

const [isMutating, startMutation] = useTransition();

useEffect(() => {
  if (state.success && showAddResult) toast.success(state.success);
  if (state.error && showAddResult) toast.error(state.error);
}, [showAddResult, state.error, state.success]);
```

将编辑与删除包装在 `startMutation(async () => { ... })` 中；操作结果后调用 `toast.success(result.success)` 或 `toast.error(result.error)`，并仅在成功时 `router.refresh()`。发布、保存、删除按钮禁用条件均为 `isPending || isMutating`，并为编辑/删除按钮显示“保存中...”/“删除中...”。

- [ ] **Step 4: 实现后台 mutation 反馈**

在两个后台表单组件中添加 `useEffect` 和 Sonner：

```tsx
useEffect(() => {
  if (state.success) toast.success(state.success);
  if (state.error) toast.error(state.error);
}, [state.error, state.success]);
```

保留现有表单旁的错误/成功文本，确保通知不取代无障碍状态。

- [ ] **Step 5: 运行测试和类型检查**

Run: `npm test -- features/comments/components/comments-section.test.ts features/admin/components/admin-mutation-feedback.test.ts && npm run typecheck`

Expected: PASS。

- [ ] **Step 6: 提交评论与后台反馈改动**

```bash
git add features/comments/components/comments-section.tsx features/comments/components/comments-section.test.ts features/admin/components/admin-user-role-form.tsx features/admin/components/admin-comment-status-form.tsx features/admin/components/admin-mutation-feedback.test.ts
git commit -m "feat: notify comment and admin mutations"
```

### Task 5: 为内容编辑、资料与认证操作提供完整反馈

**Files:**
- Modify: `features/admin/components/content-form.tsx`
- Modify: `features/admin/components/content-form.test.ts`
- Modify: `features/profile/components/profile-form.tsx`
- Modify: `features/profile/components/profile-form.test.ts`
- Modify: `features/auth/components/login-form.tsx`
- Modify: `features/auth/components/register-form.tsx`
- Modify: `features/auth/components/auth-form-copy.test.ts`

- [ ] **Step 1: 扩展测试，要求上述组件使用 Sonner 且仍保留就近文本反馈**

```ts
expect(contentSource).toContain('import { toast } from "sonner"');
expect(contentSource).toContain("toast.loading");
expect(contentSource).toContain("toast.success(state.success)");
expect(contentSource).toContain("disabled={isPending || isUploading || isSubmitting}");
expect(profileSource).toContain("toast.error");
expect(loginSource).toContain('import { toast } from "sonner"');
expect(registerSource).toContain("toast.error(error)");
expect(loginSource).toContain('<Alert variant="destructive">');
```

- [ ] **Step 2: 运行相关测试，确认失败**

Run: `npm test -- features/admin/components/content-form.test.ts features/profile/components/profile-form.test.ts features/auth/components/auth-form-copy.test.ts`

Expected: FAIL，内容和认证组件尚未满足 toast 断言。

- [ ] **Step 3: 实现内容编辑表单的 toast 生命周期**

在 `ContentForm` 中：

```tsx
const uploadToastId = toast.loading("正在处理媒体文件...");
try {
  // EXIF、上传、server action 保持现有顺序
  toast.success("媒体已上传，正在保存内容。", { id: uploadToastId });
} catch (error) {
  toast.error(message, { id: uploadToastId });
}
```

为 EXIF 解析、当前位置与反向地理编码分别报告 `toast.success` / `toast.error`；增加 effect 根据 `state.success`、`state.warning`、`state.error` 显示通知。保留现有 `Alert`、`role="alert"` 和 `aria-live` 文本；给表单增加 `aria-busy`，并在上传/提交中禁用文件、定位、字段和提交控件。

- [ ] **Step 4: 补齐资料和认证 action error 的通知**

在 ProfileForm 的上传 `catch` 中，在设置 `avatarError` 前调用：

```tsx
toast.error(message);
```

在登录和注册组件中导入 `useEffect`、`toast`，当当前尝试 provider 的 `error` 变化时调用 `toast.error(error)`；继续保留现有 Alert，并不为重定向成功路径制造 toast。

- [ ] **Step 5: 运行测试与类型检查**

Run: `npm test -- features/admin/components/content-form.test.ts features/profile/components/profile-form.test.ts features/auth/components/auth-form-copy.test.ts && npm run typecheck`

Expected: PASS。

- [ ] **Step 6: 提交表单反馈改动**

```bash
git add features/admin/components/content-form.tsx features/admin/components/content-form.test.ts features/profile/components/profile-form.tsx features/profile/components/profile-form.test.ts features/auth/components/login-form.tsx features/auth/components/register-form.tsx features/auth/components/auth-form-copy.test.ts
git commit -m "feat: notify async form operations"
```

### Task 6: 为重定向型动作提供提交中状态

**Files:**
- Modify: `features/admin/components/delete-content-form.tsx`
- Modify: `features/auth/components/profile-menu.tsx`
- Modify: `features/admin/components/admin-shell.tsx`
- Create: `features/auth/components/redirect-action-state.test.ts`

- [ ] **Step 1: 写出重定向 action 的 pending UI 契约测试**

```ts
for (const source of [deleteForm, profileMenu, adminShell]) {
  expect(source).toContain("useFormStatus");
  expect(source).toContain("pending");
}
expect(deleteForm).toContain("正在删除...");
expect(profileMenu).toContain("正在退出...");
expect(adminShell).toContain("正在退出...");
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- features/auth/components/redirect-action-state.test.ts`

Expected: FAIL，组件目前没有 `useFormStatus`。

- [ ] **Step 3: 提取每个 form 内部的提交按钮并使用 React DOM form status**

```tsx
import { useFormStatus } from "react-dom";

function DeleteContentButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending} size="sm" type="submit" variant="destructive">{pending ? "正在删除..." : "删除内容"}</Button>;
}
```

对个人菜单与后台桌面/移动端退出按钮使用同样模式，保持原有图标和视觉变体；form 仍直接调用既有 `signOutAction` / `deleteContentAction`。

- [ ] **Step 4: 运行测试与类型检查**

Run: `npm test -- features/auth/components/redirect-action-state.test.ts && npm run typecheck`

Expected: PASS。

- [ ] **Step 5: 提交 redirect action 状态改动**

```bash
git add features/admin/components/delete-content-form.tsx features/auth/components/profile-menu.tsx features/admin/components/admin-shell.tsx features/auth/components/redirect-action-state.test.ts
git commit -m "feat: show pending state for redirect actions"
```

### Task 7: 端到端验证与回归检查

**Files:**
- Modify only if verification identifies a concrete defect.

- [ ] **Step 1: 运行所有静态与单元测试**

Run: `npm test`

Expected: 所有 Vitest 测试 PASS。

- [ ] **Step 2: 运行生产类型与构建验证**

Run: `npm run typecheck && npm run build`

Expected: 两个命令均以退出码 0 完成。

- [ ] **Step 3: 启动本地应用**

Run: `npm run dev -- --hostname 127.0.0.1 --port 3000`

Expected: Next.js 输出 `http://127.0.0.1:3000` 且无启动错误。

- [ ] **Step 4: 在浏览器执行公开页面流式验证**

Flow: `/` -> 点击“摄影” -> `/photography`；任意公开详情页 -> 评论区。

Expected: 页面导航不出现空白；网络等待时展示骨架；详情主体先于评论区域可用；控制台没有新错误。

- [ ] **Step 5: 在浏览器执行后台和通知验证**

Flow: 已登录管理员 `/admin` -> “用户管理”/“评论审核”/“审计日志”；执行角色变更或评论状态变更；公开详情页发表评论、编辑和删除。

Expected: 每次路由切换有稳定骨架；操作期间按钮显示 pending 并禁用；成功/失败出现一次对应的 Sonner 通知，邻近错误文本仍保留。

- [ ] **Step 6: 进行移动视口回归检查**

Flow: 在 390px 宽度下重复公开页面、后台移动菜单和一个表单操作。

Expected: 骨架、toast、表格横向滚动和按钮没有重叠、裁切或不可达状态。

- [ ] **Step 7: 提交最终验证修复（仅在确有修改时）**

```bash
git add <verified-files>
git commit -m "fix: resolve loading and notification qa findings"
```
