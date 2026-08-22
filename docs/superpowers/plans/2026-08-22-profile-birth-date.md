# Profile Birth Date Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a private birth-date field with opt-in public visibility that exposes only the viewer-safe calculated age.

**Architecture:** Store `birth_date` and `public_birth_date` on `profiles`. The public-profile RPC returns an `age` integer calculated in PostgreSQL from `current_date`, never the birth date. The profile form and server action handle the private date and visibility flag, while the public dialog renders only age.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod 4, Supabase/PostgreSQL migrations, Vitest.

---

### Task 1: Add date validation and public-profile age types

**Files:**
- Modify: `features/profile/domain/profile-schema.ts`
- Modify: `features/profile/domain/public-profile.ts`
- Test: `features/profile/domain/profile-schema.test.ts`
- Test: `features/profile/domain/public-profile.test.ts`

- [x] **Step 1: Write failing tests** for valid `YYYY-MM-DD`, blank-to-null, invalid/future dates, and public age projection that omits any source birth date.
- [x] **Step 2: Run the focused tests** with `npm test -- features/profile/domain/profile-schema.test.ts features/profile/domain/public-profile.test.ts`; confirm failures are due to missing birth-date and age behavior.
- [x] **Step 3: Implement minimal schemas and projections**: add `birthDate` and `publicBirthDate` to profile drafts/sources, add `age?: number` to public profile rows, and project only age.
- [x] **Step 4: Re-run focused tests** and confirm they pass.

### Task 2: Add Supabase migration and migration contract tests

**Files:**
- Create: `supabase/migrations/20260822110000_add_profile_birth_date_visibility.sql`
- Create: `supabase/migrations/20260822110000_add_profile_birth_date_visibility.test.ts`

- [x] **Step 1: Write the migration contract tests** asserting the two columns, authenticated update grant, dropped/recreated RPC signature with `age integer`, `current_date`, public flag gating, and absence of `birth_date` in the RPC return table.
- [x] **Step 2: Run the migration test** and confirm it fails because the migration file does not exist.
- [x] **Step 3: Write the migration** with nullable `birth_date`, default-false `public_birth_date`, update grant, and a hardened RPC recreation that returns only age.
- [x] **Step 4: Run the migration test** and confirm it passes.

### Task 3: Thread birth date through server reads and writes

**Files:**
- Modify: `features/profile/server/profile-service.ts`
- Modify: `features/profile/server/actions.ts`
- Modify: `features/profile/domain/profile-form-validation.ts` if date validation is shared there
- Test: `features/profile/server/actions.test.ts`

- [x] **Step 1: Add failing action/service assertions** that submitted dates are parsed, normalized, and written to `birth_date` with `public_birth_date`, and current-profile details select/return both fields.
- [x] **Step 2: Run the focused action tests** and confirm the new assertions fail.
- [x] **Step 3: Implement the minimal server wiring** using the profile schema, `birth_date`/`public_birth_date` select and update fields, and map RPC `age` to the public profile domain type.
- [x] **Step 4: Re-run action/profile tests** and confirm they pass.

### Task 4: Add form controls and public age rendering

**Files:**
- Modify: `app/(site)/profile/page.tsx`
- Modify: `features/profile/components/profile-form.tsx`
- Modify: `features/profile/components/public-profile-dialog.tsx`
- Test: existing profile component/domain tests as applicable

- [x] **Step 1: Add failing component assertions** for a date input, public birth-date switch, and public dialog age label.
- [x] **Step 2: Run the focused component tests** and confirm failures.
- [x] **Step 3: Implement controls** with the existing Field/Input/Switch patterns, submit `birthDate` and `publicBirthDate`, pass current values from the page, and append `年龄` only when `profile.age` is a valid non-negative integer.
- [x] **Step 4: Re-run focused tests** and confirm they pass.

### Task 5: Full verification

- [x] **Step 1:** Run `npm test`; 215/219 tests pass, with four unrelated pre-existing workspace failures.
- [x] **Step 2:** Run `npm run typecheck` and confirm no TypeScript errors.
- [x] **Step 3:** Run `npm run build` and confirm the Next.js production build succeeds.
- [x] **Step 4:** Inspect `git diff --check` and review only the intended birth-date files; applied and verified the migration through Supabase MCP, while the local CLI is unavailable.
