# Video Detail Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the public video detail metadata as a dynamic Chinese `视频信息` block instead of static English index labels.

**Architecture:** `getPublicVideoBySlug` already maps the video metadata into `PublicVideoItem.videoDetails`; keep that data boundary unchanged. Update `VideoDetail` to derive an ordered list of displayable values from those fields and render the block only when the list is non-empty. A server-rendered component test protects both populated and empty metadata states.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, React DOM server renderer.

---

### Task 1: Add the failing metadata-rendering regression test

**Files:**
- Create: `features/media-content/components/video-detail.test.tsx`
- Reference: `features/media-content/components/video-detail.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { VideoDetail } from "./video-detail";

const video = {
  id: "video-1",
  slug: "sample-video",
  title: "Sample video",
  excerpt: null,
  publishedAt: "2026-08-20T00:00:00.000Z",
  location: null,
  videoDetails: {
    objectKey: "videos/sample.mp4",
    posterObjectKey: null,
    durationSeconds: 125,
    width: 1920,
    height: 1080,
    codec: "h264",
  },
  videoUrl: null,
  posterUrl: null,
};

describe("VideoDetail", () => {
  it("renders available video metadata in the Chinese information block", () => {
    const html = renderToStaticMarkup(<VideoDetail comments={null} video={video} />);

    expect(html).toContain("视频信息");
    expect(html).toContain("2:05 · 1920 × 1080 · H264");
    expect(html).not.toContain("DURATION");
  });

  it("does not render the information block when every metadata value is absent", () => {
    const html = renderToStaticMarkup(
      <VideoDetail
        comments={null}
        video={{ ...video, videoDetails: { ...video.videoDetails, durationSeconds: null, width: null, height: null, codec: null } }}
      />,
    );

    expect(html).not.toContain("视频信息");
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run features/media-content/components/video-detail.test.tsx`

Expected: the populated case fails because the component still renders `DURATION`, `FORMAT`, and `FRAME` rather than `视频信息`.

### Task 2: Render the dynamic video-information block

**Files:**
- Modify: `features/media-content/components/video-detail.tsx`
- Test: `features/media-content/components/video-detail.test.tsx`

- [ ] **Step 1: Derive display values from the existing video details**

Add this value derivation immediately before the component return:

```tsx
const metadata = [
  video.videoDetails.durationSeconds ? formatDuration(video.videoDetails.durationSeconds) : null,
  video.videoDetails.width && video.videoDetails.height
    ? `${video.videoDetails.width} × ${video.videoDetails.height}`
    : null,
  formatCodec(video.videoDetails.codec),
].filter((value): value is string => Boolean(value));
```

- [ ] **Step 2: Replace the static definition list**

Replace the `dl` containing the three `IndexRow` entries with:

```tsx
{metadata.length ? (
  <section className="mt-10 border-y border-[#d9d9d4] py-3">
    <h2 className="font-mono text-xs text-[#222222]">视频信息</h2>
    <p className="mt-2 font-mono text-xs text-[#222222]">{metadata.join(" · ")}</p>
  </section>
) : null}
```

Remove the unused `IndexRow` helper.

- [ ] **Step 3: Run the focused test to verify it passes**

Run: `npx vitest run features/media-content/components/video-detail.test.tsx`

Expected: both tests pass.

### Task 3: Verify the route and type safety

**Files:**
- Verify: `app/(site)/videos/[slug]/page.tsx`
- Verify: `features/media-content/components/video-detail.tsx`

- [ ] **Step 1: Run static verification**

Run: `npm run typecheck`

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 2: Verify the rendered route in the browser**

Start: `npm run dev -- --hostname 127.0.0.1 --port 3000`

Check the published route `/videos/<published-slug>` and confirm that the visible metadata block is titled `视频信息`, contains the available values, and contains none of `DURATION`, `FORMAT`, or `FRAME`. Also check browser console warnings and errors.

- [ ] **Step 3: Commit the implementation**

```bash
git add features/media-content/components/video-detail.tsx features/media-content/components/video-detail.test.tsx
git commit -m "fix: render video detail metadata"
```
