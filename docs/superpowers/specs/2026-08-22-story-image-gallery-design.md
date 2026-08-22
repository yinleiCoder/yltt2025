# Story Image Gallery Design

## Goal

Allow an administrator to add any number of images to a story. A story remains a Markdown-first article: its image gallery appears after the body so the prose can be read as one continuous document and the images can be revisited afterwards.

## Scope

- Story creation and editing support zero or more story images.
- The Markdown editor remains unchanged and is responsible only for Markdown editing and its text preview.
- A separate multi-file upload area appears directly below the Markdown editor for stories.
- The upload area uses the existing image preview component, supports image removal, and shows the persisted order.
- The public story page renders a responsive gallery after the Markdown body.
- Desktop users open an image with a double-click; touch users open it with a single tap.
- No per-image captions or authored alt text are collected. Generated image alt text uses the story title and one-based image position.

## Non-goals

- No inline image syntax or image picker inside Markdown.
- No image captions, metadata editing, cropping, or drag-and-drop reordering in this change.
- No migration of existing content; stories without images remain valid.

## Data Model

Create `public.story_images` with:

- `id uuid primary key default gen_random_uuid()`
- `content_id uuid not null` referencing `public.content_items(id)` with `on delete cascade`
- `object_key text not null`
- `sort_order integer not null`
- `created_at timestamptz not null default now()`

The table has a unique `(content_id, sort_order)` constraint and an index on `(content_id, sort_order)`. A trigger reuses the existing kind-validation pattern to reject rows whose parent is not `content_kind = 'story'`.

RLS is enabled. Public readers can select images only when `private.can_read_content(content_id)` is true. Authenticated administrators can manage rows under the existing `private.is_admin()` authorization policy. Grants match the existing public content-detail tables.

## Admin Flow

When `kind === 'story'`, `ContentForm` renders these consecutive sections:

1. Markdown editor
2. Story image multi-file upload area

The upload area accepts JPEG, PNG, and WebP files and uses the existing preview card pattern for each selected image. It tracks queued files and already-persisted images separately, preserves selection order, and lets the administrator remove an item before submitting.

The existing signed OSS upload pipeline is extended with a story-image upload type. The server validates administrator access and the existing image file policy, then creates a unique `stories/YYYY/MM/...` object key and a signed PUT URL. The browser uploads directly to OSS and sends only the resulting ordered object keys to the content action.

Creation inserts the story and its `story_images` rows together from the submitted keys. Updates replace the image association set and remove only objects that are no longer referenced by that story after a successful database update. Story deletion gathers its image keys before the cascade and attempts to remove each OSS object after the content item is deleted. Failed OSS cleanup returns the existing warning style without rolling back the content mutation.

## Public Rendering

The public story query selects `story_images` in ascending `sort_order`. The mapped public story type exposes the resulting public image URLs. `StoryDetail` retains its current Markdown rendering and appends the gallery below it when at least one image exists.

The gallery uses a responsive, equal-width grid with stable image aspect-ratio handling. Each image uses a lightbox interaction. Its desktop activation is a double-click, while touch activation is a single tap; keyboard activation remains available through a focusable button. The lightbox closes through its existing controls.

## Errors and Safety

- Unsupported images and files over the existing 25 MB image limit are rejected before signing.
- Failed direct uploads leave the selected image in an error state and block submission until it is removed or retried.
- Server actions still authenticate, authorize, and validate all submitted object keys and ordering as untrusted input.
- Image association rows cannot be used for a photo or video item, cannot duplicate an order within a story, and cannot be publicly read before the story is published.
- Existing stories with no gallery remain readable and editable.

## Verification

- Migration tests cover table shape, constraints, RLS policies, grants, and parent-kind enforcement.
- Domain and action tests cover validation of ordered story image keys.
- Upload tests cover story image signing, MIME/size rejection, and the multiple-file client sequence.
- Content service tests cover gallery mapping, ordering, and public URLs.
- Component tests cover the separate upload placement, previews, remove behavior, gallery rendering, desktop double-click, touch tap, and keyboard activation.
- Type checking, the focused test suite, and a production build provide final verification.
