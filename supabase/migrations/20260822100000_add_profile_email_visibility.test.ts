import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260822100000_add_profile_email_visibility.sql",
  ),
  "utf8",
);

describe("profile email visibility migration", () => {
  it("drops the previous public profile function before changing its return shape", () => {
    const dropIndex = migration.indexOf(
      "drop function if exists public.get_public_profiles(uuid[]);",
    );
    const createIndex = migration.indexOf(
      "create function public.get_public_profiles(requested_profile_ids uuid[])",
    );

    expect(dropIndex).toBeGreaterThanOrEqual(0);
    expect(createIndex).toBeGreaterThan(dropIndex);
  });
});
