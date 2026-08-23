# Photography Edit Object-Key Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permit editing legacy photography content whose stored OSS object key does not match the current upload naming convention, while retaining content metadata validation.

**Architecture:** Keep upload-file policy validation in the existing signing path. Replace the admin draft schema's convention-specific media key regular expression with a safe-relative-object-key predicate that accepts legacy paths but rejects empty, absolute, URL, and traversal-shaped keys. Cover the parser contract with a focused Vitest domain test.

**Tech Stack:** Next.js 16 App Router, TypeScript, Zod 4, Vitest.

---

## File Structure

- Modify: `features/content/domain/content-draft.ts` - validate submitted content drafts and define the safe relative media object-key rule.
- Create: `features/content/domain/content-draft.test.ts` - verify legacy media keys and all retained validation boundaries through the public draft parser.

### Task 1: Characterize the Existing Parser Contract

**Files:**
- Create: `features/content/domain/content-draft.test.ts`
- Test: `features/content/domain/content-draft.test.ts`

- [ ] **Step 1: Write the failing regression tests**

```ts
import { describe, expect, it } from "vitest";

import { parseAdminContentDraft } from "./content-draft";

const validPhoto = {
  kind: "photo",
  title: "Legacy photo",
  isFeatured: false,
  publishNow: false,
  locationVisibility: "hidden",
};

describe("admin content draft media keys", () => {
  it("accepts a legacy relative photo object key", () => {
    expect(parseAdminContentDraft({
      ...validPhoto,
      objectKey: "archive/2019/IMG_0001.JPEG",
    }).objectKey).toBe("archive/2019/IMG_0001.JPEG");
  });

  it.each([
    "",
    "/photos/2026/08/image.jpg",
    "https://cdn.example.com/image.jpg",
    "photos/2026/../image.jpg",
  ])("rejects an unsafe media object key: %s", (objectKey) => {
    expect(() => parseAdminContentDraft({ ...validPhoto, objectKey })).toThrow();
  });

  it("continues to reject malformed photo metadata", () => {
    expect(() => parseAdminContentDraft({
      ...validPhoto,
      objectKey: "archive/2019/IMG_0001.JPEG",
      capturedAt: "24-08-2026",
    })).toThrow();
  });
});
```

- [ ] **Step 2: Run the regression tests and confirm the legacy-key case fails**

Run: `npx vitest run features/content/domain/content-draft.test.ts`

Expected: the `accepts a legacy relative photo object key` test fails because the current `objectKeySchema` only allows `photos/` or `videos/` paths with a fixed set of extensions; the unsafe-key and malformed-metadata tests pass.

### Task 2: Relax Legacy Key Compatibility Without Removing Safety Checks

**Files:**
- Modify: `features/content/domain/content-draft.ts:3-9`
- Test: `features/content/domain/content-draft.test.ts`

- [ ] **Step 1: Replace the convention-specific object-key schema with a safe relative-path rule**

```ts
const objectKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(1024)
  .refine(isSafeRelativeObjectKey, {
    message: "Enter a valid media object key.",
  });

function isSafeRelativeObjectKey(value: string): boolean {
  if (value.startsWith("/") || value.includes("\\") || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return false;
  }

  return value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}
```

Keep `objectKey: objectKeySchema.optional()` and the existing `superRefine` rule so photos and videos still require a media key. Do not alter `storyImageObjectKeySchema`, upload policy, or server actions.

- [ ] **Step 2: Run the focused parser tests**

Run: `npx vitest run features/content/domain/content-draft.test.ts`

Expected: all tests pass, proving a legacy relative photo path is accepted and that empty, absolute, URL, traversal-shaped, and malformed metadata inputs remain rejected.

- [ ] **Step 3: Run the TypeScript check**

Run: `npm run typecheck`

Expected: exit code 0 with no TypeScript diagnostics.

- [ ] **Step 4: Inspect the scoped diff**

Run: `git diff --check -- features/content/domain/content-draft.ts features/content/domain/content-draft.test.ts && git diff -- features/content/domain/content-draft.ts features/content/domain/content-draft.test.ts`

Expected: no whitespace errors; the diff changes only the media object-key predicate and its focused regression tests.

- [ ] **Step 5: Commit the implementation**

```bash
git add features/content/domain/content-draft.ts features/content/domain/content-draft.test.ts
git commit -m "fix: allow legacy media keys when editing photos"
```
