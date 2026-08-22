# Story Image Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Let administrators upload arbitrary images in a standalone area below a story's Markdown editor and render them as an enlargable gallery after the body.

**Architecture:** public.story_images owns ordered OSS object keys beneath a story-only foreign key. The existing browser-to-OSS signing path gains a typed story-image target; ordered keys pass through the existing Server Action and content service. StoryImageUpload remains outside StoryMarkdownEditor; StoryImageGallery renders after Markdown and delegates enlargement to PhotoLightbox.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod, Vitest, Supabase/Postgres RLS, Aliyun OSS, react-photo-view, Tailwind CSS.

---

## File Structure

- Create supabase/migrations/<generated>_add_story_images.sql and its test: schema, RLS, policies, grants.
- Modify features/media/domain/upload-policy.ts, features/media/server/oss-service.ts, and tests: story-image key and signer target.
- Modify app/api/admin/media/upload-signature/route.ts and test: validated upload target.
- Create features/admin/components/story-image-upload.tsx and test; modify media-upload.ts and content-form.tsx plus tests: target upload, previews, removal, ordering, and standalone placement.
- Modify content draft, action, and content-admin service plus tests: ordered key validation, persistence, replacement, and cleanup.
- Create story-image-gallery.tsx and test; modify public content mapping/service, photo-lightbox, and story-detail: public URLs and accessible post-body display.

### Task 1: Add the story-only database relation

**Files:**
- Create: supabase/migrations/<generated>_add_story_images.sql
- Create: supabase/migrations/<generated>_add_story_images.test.ts

- [ ] **Step 1: Write the failing migration contract test**

~~~ts
it("creates ordered story-only images with reader and admin policies", () => {
  expect(migration).toMatch(/create table public\.story_images/i);
  expect(migration).toMatch(/unique \(content_id, sort_order\)/i);
  expect(migration).toMatch(/story_images_require_story_content/i);
  expect(migration).toMatch(/private\.can_read_content\(content_id\)/i);
  expect(migration).toMatch(/private\.is_admin\(\)/i);
});
~~~

- [ ] **Step 2: Verify the test is red**

Run: npm test -- supabase/migrations/<generated>_add_story_images.test.ts

Expected: FAIL because the migration file is absent.

- [ ] **Step 3: Add the minimal migration**

~~~sql
create table public.story_images (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_items (id) on delete cascade,
  object_key text not null,
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (content_id, sort_order)
);
create index story_images_content_sort_idx on public.story_images (content_id, sort_order);
create function private.require_story_content() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.content_items where id = new.content_id and kind = 'story'::public.content_kind) then
    raise exception 'Story image detail does not match its content kind';
  end if;
  return new;
end;
$$;
create trigger story_images_require_story_content before insert or update on public.story_images for each row execute function private.require_story_content();
alter table public.story_images enable row level security;
create policy "Readable story images follow their content" on public.story_images for select to anon, authenticated using ((select private.can_read_content(content_id)));
create policy "Admins can manage story images" on public.story_images for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
revoke all on function private.require_story_content() from public;
grant select on public.story_images to anon;
grant select, insert, update, delete on public.story_images to authenticated, service_role;
~~~

- [ ] **Step 4: Verify, apply, and commit**

Run: npm test -- supabase/migrations/<generated>_add_story_images.test.ts

Expected: PASS.

Apply exact SQL through configured Supabase MCP, then run security and performance advisors. Expected: no new story_images RLS or policy finding.

~~~bash
git add supabase/migrations/<generated>_add_story_images.sql supabase/migrations/<generated>_add_story_images.test.ts
git commit -m "feat: add story image relation"
~~~

### Task 2: Sign safe story-gallery image uploads

**Files:**
- Modify: features/media/domain/upload-policy.ts and .test.ts
- Modify: features/media/server/oss-service.ts and .test.ts
- Modify: app/api/admin/media/upload-signature/route.ts and .test.ts

- [ ] **Step 1: Write failing key and route tests**

~~~ts
expect(createStoryImageObjectKey({
  originalName: "../rain frame.JPG", timestamp: new Date("2026-08-22T00:00:00.000Z"), token: "a1b2c3d4",
})).toBe("stories/2026/08/a1b2c3d4-rain-frame.jpg");

expect(parseStoryImageObjectKeys(["stories/2026/08/a1b2c3d4-rain-frame.jpg"]))
  .toEqual(["stories/2026/08/a1b2c3d4-rain-frame.jpg"]);
~~~

Route coverage posts target: "story-image", expects the signer target, and rejects an invalid target plus an MP4 story image.

- [ ] **Step 2: Verify red**

Run: npm test -- features/media/domain/upload-policy.test.ts features/media/server/oss-service.test.ts app/api/admin/media/upload-signature/route.test.ts

Expected: FAIL because story-image support does not exist.

- [ ] **Step 3: Implement the typed target**

~~~ts
export type ContentUploadTarget = "media" | "story-image";

export function createStoryImageObjectKey(input: Omit<MediaObjectKeyInput, "kind">) {
  const datePath = input.timestamp.getUTCFullYear() + "/" + String(input.timestamp.getUTCMonth() + 1).padStart(2, "0");
  return "stories/" + datePath + "/" + input.token + "-" + fileStem(input.originalName) + "." + extensionFor(input.originalName, "photo");
}
~~~

Add a Zod-backed parseStoryImageObjectKeys helper accepting only stories/YYYY/MM/<safe-name>.(jpg|png|webp). Change issueOssUploadSignature(input, target = "media") to use the new factory only for story-image and throw UploadPolicyError when that target is not a photo. Add target: z.enum(["media", "story-image"]).default("media") to the route request schema and preserve existing stable Chinese errors.

- [ ] **Step 4: Verify green and commit**

Run: npm test -- features/media/domain/upload-policy.test.ts features/media/server/oss-service.test.ts app/api/admin/media/upload-signature/route.test.ts

Expected: PASS.

~~~bash
git add features/media/domain/upload-policy.ts features/media/domain/upload-policy.test.ts features/media/server/oss-service.ts features/media/server/oss-service.test.ts app/api/admin/media/upload-signature/route.ts app/api/admin/media/upload-signature/route.test.ts
git commit -m "feat: sign story image uploads"
~~~

### Task 3: Validate, store, replace, and clean up ordered keys

**Files:**
- Modify: features/content/domain/content-draft.ts and .test.ts
- Modify: features/content/server/actions.ts and .test.ts
- Modify: features/content/server/content-admin-service.ts
- Create: features/content/server/content-admin-service.test.ts

- [ ] **Step 1: Write failing draft, action, and service tests**

~~~ts
expect(parseAdminContentDraft({
  kind: "story", title: "Night rain", isFeatured: false, publishNow: false,
  storyImageObjectKeys: ["stories/2026/08/rain.jpg"],
})).toMatchObject({ storyImageObjectKeys: ["stories/2026/08/rain.jpg"] });

formData.append("storyImageObjectKey", "stories/2026/08/rain.jpg");
~~~

Mock Supabase in the new service test. Assert creation inserts sort_order 0 then 1; assert update deletes associations, inserts submitted order, and OSS cleanup receives only removed keys.

- [ ] **Step 2: Verify red**

Run: npm test -- features/content/domain/content-draft.test.ts features/content/server/actions.test.ts features/content/server/content-admin-service.test.ts

Expected: FAIL because no story key list flows through the draft or action.

- [ ] **Step 3: Implement the ordered flow**

~~~ts
storyImageObjectKeys: z.array(storyImageObjectKeySchema).default([]),
// actions.ts
storyImageObjectKeys: formData.getAll("storyImageObjectKey").map(String),
// create service, after content_items insert
await supabase.from("story_images").insert(
  draft.storyImageObjectKeys.map((objectKey, sortOrder) => ({
    content_id: item.id, object_key: objectKey, sort_order: sortOrder,
  })),
);
~~~

Add storyImages to AdminContentItem and select story_images (object_key, sort_order). A story update deletes its old association rows, inserts the submitted list in order, then cleans only old keys absent from the new set. Story deletion adds story-image keys to its existing cleanup Set before parent deletion. If relation insertion fails during create, remove the new content row and attempt cleanup for every newly uploaded key.

- [ ] **Step 4: Verify green and commit**

Run: npm test -- features/content/domain/content-draft.test.ts features/content/server/actions.test.ts features/content/server/content-admin-service.test.ts

Expected: PASS.

~~~bash
git add features/content/domain/content-draft.ts features/content/domain/content-draft.test.ts features/content/server/actions.ts features/content/server/actions.test.ts features/content/server/content-admin-service.ts features/content/server/content-admin-service.test.ts
git commit -m "feat: persist ordered story images"
~~~

### Task 4: Build the standalone multi-file admin upload section

**Files:**
- Modify: features/admin/components/media-upload.ts and .test.ts
- Create: features/admin/components/story-image-upload.tsx and .test.tsx
- Modify: features/admin/components/content-form.tsx and .test.ts

- [ ] **Step 1: Write failing helper, component, and placement tests**

~~~ts
await expect(uploadContentMedia(file, fetcher, "story-image"))
  .resolves.toBe("stories/2026/08/rain.jpg");
expect(contentFormSource.indexOf("<StoryMarkdownEditor")).toBeLessThan(contentFormSource.indexOf("<StoryImageUpload"));
expect(markdownEditorSource).not.toContain("StoryImageUpload");
~~~

Render the uploader with two persisted keys; assert two preview cards and hidden storyImageObjectKey fields. Remove one card and assert only the remaining ordered field remains.

- [ ] **Step 2: Verify red**

Run: npm test -- features/admin/components/media-upload.test.ts features/admin/components/story-image-upload.test.tsx features/admin/components/content-form.test.ts

Expected: FAIL because the component and target are absent.

- [ ] **Step 3: Implement a dedicated component directly below Markdown**

~~~tsx
{kind === "story" ? <>
  <Field><FieldLabel>正文（Markdown）</FieldLabel><StoryMarkdownEditor defaultValue={initialValues?.markdownBody ?? ""} /></Field>
  <Field><FieldLabel>故事图片</FieldLabel><FieldDescription>可一次选择多张图片，图片会显示在正文之后。</FieldDescription><StoryImageUpload initialObjectKeys={initialValues?.storyImages ?? []} /></Field>
</> : null}
~~~

Use useDropzone with multiple: true and the existing JPEG/PNG/WebP accept map. Preserve item order in component state and upload accepted files sequentially with uploadContentMedia(file, fetcher, "story-image"). Reuse preview-card styling, add one hidden field per completed item, and do not edit StoryMarkdownEditor:

~~~tsx
<input name="storyImageObjectKey" type="hidden" value={item.objectKey} />
~~~

Surface pending/error state to ContentForm so normal submission is disabled while image uploads are unresolved.

- [ ] **Step 4: Verify green and commit**

Run: npm test -- features/admin/components/media-upload.test.ts features/admin/components/story-image-upload.test.tsx features/admin/components/content-form.test.ts

Expected: PASS.

~~~bash
git add features/admin/components/media-upload.ts features/admin/components/media-upload.test.ts features/admin/components/story-image-upload.tsx features/admin/components/story-image-upload.test.tsx features/admin/components/content-form.tsx features/admin/components/content-form.test.ts
git commit -m "feat: add story gallery upload area"
~~~

### Task 5: Map and render public post-body galleries

**Files:**
- Modify: features/content/domain/public-media-content.ts and .test.ts
- Modify: features/content/server/public-media-content-service.ts
- Create: features/media-content/components/story-image-gallery.tsx and .test.tsx
- Modify: features/media/components/photo-lightbox.tsx
- Modify: features/media-content/components/story-detail.tsx

- [ ] **Step 1: Write failing public mapping and interaction tests**

~~~ts
expect(toPublicStory({
  ...row, images: [{ objectKey: "stories/2026/08/rain.jpg", imageUrl: "/rain.jpg" }],
}).images).toHaveLength(1);

await user.dblClick(screen.getByRole("button", {
  name: "查看大图：Night rain（第 1 张）",
}));
~~~

Also cover empty gallery omission, StoryDetail placing gallery after StoryMarkdown, one-tap touch activation, and Enter on the image button.

- [ ] **Step 2: Verify red**

Run: npm test -- features/content/domain/public-media-content.test.ts features/media-content/components/story-image-gallery.test.tsx

Expected: FAIL because public stories have no images and the gallery component is absent.

- [ ] **Step 3: Implement public mapping and interaction**

~~~ts
export type PublicStoryImage = { objectKey: string; imageUrl: string | null };
export type PublicStoryRow = {
  id: string; slug: string; title: string; excerpt: string | null;
  publishedAt: string; markdownBody: string; images: PublicStoryImage[];
};
~~~

Extend the story select with story_images (object_key, sort_order), request relation order by sort_order, and build each URL with createPublicMediaUrl. Append rendering after the existing Markdown node:

~~~tsx
{story.images.length ? <StoryImageGallery images={story.images} storyTitle={story.title} /> : null}
~~~

StoryImageGallery uses grid grid-cols-1 gap-4 sm:grid-cols-2 and alt text storyTitle + Chinese sequence. Extend PhotoLightbox with activation: "click" | "double-click" and pass the library's native trigger prop rather than implementing a separate opener:

~~~tsx
const triggers = activation === "double-click" && !isCoarsePointer ? ["onDoubleClick"] : ["onClick"];
return <PhotoView src={src} triggers={triggers}><button aria-label={"查看大图：" + alt} type="button">...</button></PhotoView>;
~~~

Initialize isCoarsePointer with false and update it in a client effect using window.matchMedia("(pointer: coarse)").matches. This gives fine-pointer desktop only a double-click trigger and touch devices a single-tap trigger. Keep the wrapping button focusable; on Enter or Space, prevent the native button action and dispatch a bubbling MouseEvent for triggers[0] ("dblclick" on desktop or "click" on touch) from currentTarget so PhotoView receives its configured trigger.

- [ ] **Step 4: Verify green and commit**

Run: npm test -- features/content/domain/public-media-content.test.ts features/media-content/components/story-image-gallery.test.tsx

Expected: PASS.

~~~bash
git add features/content/domain/public-media-content.ts features/content/domain/public-media-content.test.ts features/content/server/public-media-content-service.ts features/media-content/components/story-image-gallery.tsx features/media-content/components/story-image-gallery.test.tsx features/media/components/photo-lightbox.tsx features/media-content/components/story-detail.tsx
git commit -m "feat: render story image galleries"
~~~

### Task 6: Run integrated verification

**Files:**
- Modify only files required to correct a verified failure.

- [ ] **Step 1: Run the complete suite**

Run: npm test

Expected: exit code 0.

- [ ] **Step 2: Run type and production-build checks**

Run: npm run typecheck

Expected: exit code 0 with no diagnostics.

Run: npm run build

Expected: exit code 0 with a successful Next.js build.

- [ ] **Step 3: Run an authenticated browser smoke test**

Run: npm run dev

Verify zero, one, and multiple images; the upload section below Markdown; removal; publish; gallery order after body; desktop double-click, touch-emulation tap, and keyboard activation.

- [ ] **Step 4: Re-run Supabase advisors**

Run: configured Supabase MCP security and performance advisors.

Expected: no newly introduced story_images finding; report unrelated existing findings separately.
