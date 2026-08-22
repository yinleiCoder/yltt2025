# YlTt2025 shadcn b0 媒体体验实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 将全站（含后台）切换到 shadcn `b0` 预设，并实现头像裁剪、Markdown 故事编辑、短片/摄影选择预览、EXIF 地点解析、摄影详情大图和更完整的短片播放体验。

**Architecture:** 保留现有 App Router、Server Action、Supabase 和 OSS 领域服务；只重装 shadcn UI 源码与主题 token。浏览器专属编辑/裁剪/预览播放器拆成小型 Client Component，服务端页面只传递可序列化的初始值；EXIF 解析在浏览器完成，反向地理编码由 Route Handler 代理。

**Tech Stack:** Next.js 16.3 App Router、React 19、Tailwind CSS 4、shadcn `b0`、Supabase SSR、OSS signed upload、`react-easy-crop`、`react-dropzone`、`@uiw/react-md-editor`、`react-photo-view`、`react-player` v3、`exifr`、`react-markdown`、`remark-gfm`、`rehype-sanitize`、Vitest。

---

### Task 1: 基线与依赖

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `features/media/domain/photo-exif-form.test.ts`, `features/admin/components/media-upload.test.ts`

- [ ] **Step 1: Record the current baseline**

Run `npm run typecheck`, `npm test`, and `npm run build`. Record existing failures without changing unrelated files.

- [ ] **Step 2: Add the browser media dependencies**

Run:

```powershell
npm install react-easy-crop react-dropzone @uiw/react-md-editor react-photo-view
```

Keep the existing `react-player`, `exifr`, and Markdown rendering dependencies. Do not add a second video player library.

- [ ] **Step 3: Verify dependency and type baselines**

Run `npm run typecheck` and `npm test -- features/media/domain/photo-exif-form.test.ts features/admin/components/media-upload.test.ts`. Expected: the existing tests pass or report only the baseline failures recorded in Step 1.

### Task 2: Apply the shadcn b0 preset

**Files:**
- Modify: `components.json`
- Modify: `app/globals.css`
- Modify: `components/ui/*.tsx`

- [ ] **Step 1: Inspect the supported preset command**

Run `npx shadcn@latest --help` and `npx shadcn@latest info`. Confirm the CLI supports the requested preset operation and list the current UI files before overwriting them.

- [ ] **Step 2: Reinstall the requested preset**

Run the supported force-reinstall form of:

```powershell
npx shadcn@latest apply --preset b0 --force --reinstall
```

If the installed CLI exposes preset switching under `init`, use the equivalent documented command `npx shadcn@latest init --preset b0 --force --reinstall`; the resulting `components.json` must identify `b0`.

- [ ] **Step 3: Add the component set used by the application**

Run `npx shadcn@latest add alert avatar badge button card dialog dropdown-menu field input label progress select separator sheet sidebar skeleton sonner switch table tabs textarea`. Use the project aliases from `components.json` and inspect every rewritten file for missing groups, titles, or invalid icon props.

- [ ] **Step 4: Verify the preset migration before feature edits**

Run `npx shadcn@latest info`, `npm run typecheck`, and `npm test`. Expected: `components.json` reports `b0`; failures are limited to API adjustments caused by the reset and are fixed in the next task, not hidden.

### Task 3: Align shared UI and responsive tokens

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `features/admin/components/admin-shell.tsx`
- Modify: `features/admin/components/admin-navigation.tsx`

- [ ] **Step 1: Update failing component imports and variants**

Replace any pre-b0 props or imports reported by typecheck. Use semantic classes (`bg-background`, `text-muted-foreground`, `border-border`), `gap-*`, and `size-*`; remove raw `<select>`, checkbox styling, `space-*`, and manual overlay z-index from the touched UI.

- [ ] **Step 2: Keep one b0 theme with page-level density**

Retain the b0 variables from `app/globals.css`. Use a scoped `.admin-surface` only for semantic density/background values, never a second component theme. Ensure the body remains `overflow-x: clip` and all fixed media/tool controls have stable aspect ratios.

- [ ] **Step 3: Verify mobile navigation**

Run `npm run typecheck`. At 390px, the admin shell must render a Sheet trigger and no permanent sidebar; at desktop width it must render the b0 Sidebar without page-level horizontal overflow.

### Task 4: Remove metadata range validation and add reverse geocoding

**Files:**
- Modify: `features/content/domain/content-draft.ts`
- Modify: `features/media/domain/photo-exif-form.ts`
- Modify: `features/media/client/read-photo-exif.ts`
- Create: `features/media/client/location.ts`
- Create: `app/api/geocode/reverse/route.ts`
- Test: `features/content/domain/content-draft.test.ts`
- Test: `features/media/domain/photo-exif-form.test.ts`

- [ ] **Step 1: Add regression tests for permissive EXIF fields**

Add tests asserting that `aperture`, `iso`, `focalLengthMm`, and `shutterSpeed` values extracted from a valid form are accepted without business-range checks, while malformed types are still rejected by the schema.

- [ ] **Step 2: Remove business ranges from the draft schema**

Change the metadata fields in `content-draft.ts` to type/format checks only. Keep coordinate bounds because they protect geographic data integrity; do not add camera-value bounds.

- [ ] **Step 3: Implement reverse geocoding client helpers**

Create `reverseGeocode(latitude, longitude)` that calls `/api/geocode/reverse`, returns `{ label?: string; city?: string; region?: string }`, and maps timeout/network/empty results to a typed `null` result. Create `getCurrentLocation()` as a Promise wrapper around `navigator.geolocation.getCurrentPosition` with a 10-second timeout.

- [ ] **Step 4: Implement the server Route Handler**

Validate latitude/longitude with `z.number()` and bounds, call the configured geocoder with an `AbortSignal.timeout(5000)`, send a descriptive User-Agent, and return only normalized place fields. Return status 400 for invalid coordinates, 502 for upstream failure, and never expose upstream response bodies or secrets.

- [ ] **Step 5: Run focused tests**

Run `npx vitest run features/content/domain/content-draft.test.ts features/media/domain/photo-exif-form.test.ts`. Expected: metadata values outside any camera convention pass; invalid coordinate ranges still fail.

### Task 5: Build reusable client media controls

**Files:**
- Create: `features/media/components/avatar-crop-dialog.tsx`
- Create: `features/media/components/media-file-preview.tsx`
- Create: `features/media/components/video-player.tsx`
- Create: `features/media/components/photo-lightbox.tsx`
- Test: `features/admin/components/media-upload.test.ts`

- [ ] **Step 1: Add crop dialog behavior**

Implement a client `Dialog` that accepts a source `File`, renders `react-easy-crop` with a square crop and rotation control, and emits a JPEG/WebP `Blob` only after the user confirms. Revoke the source object URL when the dialog closes or the file changes.

- [ ] **Step 2: Add file preview behavior**

Implement a `react-dropzone` wrapper that accepts `image/*` or video MIME types, creates a local object URL, and renders image metadata or a `<video preload="metadata" controls playsInline>` preview. Revoke URLs on replacement and unmount. Expose `onFile`, `onError`, and `onClear` callbacks.

- [ ] **Step 3: Add photo lightbox behavior**

Wrap the image with `PhotoProvider` and `PhotoView`, include an accessible alt text, and render a b0 `Dialog`/`Alert` fallback if the image cannot load. Keep the parent layout dimensions stable.

- [ ] **Step 4: Add the video player behavior**

Create a client wrapper around `react-player` v3 with `src`, `poster`, `controls`, `playsInline`, responsive width/height, and an `onError` state. Render a native `<video>` fallback for direct file URLs when the library cannot load the source.

- [ ] **Step 5: Verify client components**

Run `npm run typecheck` and `npm test -- features/admin/components/media-upload.test.ts`. Expected: object URLs are cleaned up, invalid files produce an error callback, and components compile only under client boundaries.

### Task 6: Upgrade the personal profile avatar flow

**Files:**
- Modify: `features/profile/components/profile-form.tsx`
- Modify: `features/profile/components/profile-avatar.tsx`
- Modify: `app/profile/page.tsx`
- Modify: `app/api/profile/avatar/upload-signature/route.ts`
- Test: `features/profile/components/profile-form.test.tsx`

- [ ] **Step 1: Add form interaction tests**

Test selecting a file opens the crop dialog, cancel leaves the initial avatar, confirm shows the cropped preview, and a failed upload leaves the previous URL unchanged.

- [ ] **Step 2: Connect the crop result to the existing OSS signature flow**

Request the current-user signature only after crop confirmation, upload the Blob with the returned object key, then submit the profile update. Show b0 `Progress`, `Alert`, and Sonner feedback using Chinese copy.

- [ ] **Step 3: Enforce mobile-first layout**

Use a single-column `FieldGroup` by default and expand to a two-column grid at `md`. Keep avatar controls at stable `size-*` dimensions and provide a keyboard-accessible crop confirmation/cancel path.

- [ ] **Step 4: Run profile tests**

Run `npx vitest run features/profile` and `npm run typecheck`. Expected: profile tests pass and no client component imports server-only modules.

### Task 7: Upgrade the admin content form

**Files:**
- Modify: `features/admin/components/new-content-form.tsx`
- Modify: `features/admin/components/content-form.tsx`
- Modify: `features/admin/components/media-upload.tsx`
- Create: `features/admin/components/story-markdown-editor.tsx`
- Test: `features/admin/components/media-upload.test.ts`
- Test: `features/content/domain/content-draft.test.ts`

- [ ] **Step 1: Add story editor tests**

Test that story mode renders the editor/preview tabs, editing updates the Markdown value, preview uses the sanitized renderer, and submitting preserves the original Markdown string.

- [ ] **Step 2: Add the lazy Markdown editor**

Create a client component with top-level `dynamic(() => import("@uiw/react-md-editor"), { ssr: false })`, controlled `value/onChange`, and b0 Tabs for `编辑`/`预览`. The preview uses existing sanitized Markdown rendering and does not execute HTML.

- [ ] **Step 3: Replace custom upload markup**

Use `MediaFilePreview` and shadcn `Field`/`FieldLabel`/`FieldDescription`/`Alert` for photo/video selection. Show photo `PhotoView` and video first-frame preview before upload; clean object URLs when the selected file changes.

- [ ] **Step 4: Add EXIF location suggestions and manual fallback**

After `readPhotoExif`, call `reverseGeocode` when GPS is present. Add a `获取当前位置` button that calls `getCurrentLocation`, then reverse geocodes and fills editable city/region/label fields. Keep location visibility options and allow submission when geocoding fails.

- [ ] **Step 5: Run focused admin tests**

Run `npx vitest run features/admin/components/media-upload.test.ts features/content/domain/content-draft.test.ts` and `npm run typecheck`. Expected: story editor and media preview tests pass, with no range validation failures.

### Task 8: Add photography lightbox and video detail player

**Files:**
- Modify: `features/photography/components/photography-detail.tsx`
- Modify: `features/media-content/components/video-detail.tsx`
- Modify: `app/photography/[slug]/page.tsx`
- Modify: `app/videos/[slug]/page.tsx`
- Test: `features/media-content/components/video-detail.test.tsx`

- [ ] **Step 1: Add detail interaction tests**

Test that photography renders a `PhotoView` trigger with the public image URL and that video renders the player with poster, controls, and inline playback props.

- [ ] **Step 2: Wire the photography lightbox**

Replace the plain image trigger with `PhotoProvider/PhotoView`, retain alt text and stable `max-h`/aspect layout, and ensure closing the viewer returns focus to the trigger.

- [ ] **Step 3: Wire the reusable video player**

Replace the direct video markup with the client `VideoPlayer`, pass poster and URL, retain the details table, and show a b0 error Alert on playback failure.

- [ ] **Step 4: Run media detail tests**

Run `npx vitest run features/media-content/components/video-detail.test.tsx` and `npm run typecheck`. Expected: detail components compile and media props remain serializable across the server/client boundary.

### Task 9: Full verification and browser QA

**Files:**
- Modify only files required by failed verification checks.

- [ ] **Step 1: Run the full test suite**

Run `npm test`, `npm run typecheck`, and `npm run build`. Expected: all exit with code 0.

- [ ] **Step 2: Start the dev server**

Run `npm run dev` and use the exact local URL printed by Next.js. Check the flow: `/profile` -> choose avatar -> crop -> cancel/confirm; `/admin/content/new` -> story edit/preview and photo/video preview; `/photography/<slug>` -> open full-size image; `/videos/<slug>` -> play/pause/seek.

- [ ] **Step 3: Perform responsive checks**

Use Browser when available. Verify desktop and 390px mobile viewports for page identity, nonblank content, no framework overlay, no relevant console errors, no horizontal page overflow, and one successful interaction per target flow. Capture screenshots outside the repository.

- [ ] **Step 4: Inspect final diff and report permissions**

Run `git status --short` and `git diff --stat`. Do not revert unrelated pre-existing changes. Attempt a scoped commit only if `.git/index.lock` is writable; otherwise report that the design and implementation remain uncommitted because repository metadata is read-only.

## Self-review

- Preset scope: Task 2 and Task 3 cover the b0 reinstall and shared theme requirement.
- Avatar, Markdown, video, photo, EXIF, reverse geocoding, location fallback, and photography detail lightbox each have dedicated tasks and tests.
- The plan uses the same names (`MediaFilePreview`, `VideoPlayer`, `reverseGeocode`, `getCurrentLocation`) in all later tasks.
- No camera metadata range validation is introduced; coordinate bounds remain data-integrity checks.
- No placeholder or TODO steps remain.
