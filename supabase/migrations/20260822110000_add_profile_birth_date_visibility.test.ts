import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260822110000_add_profile_birth_date_visibility.sql",
  ),
  "utf8",
);

describe("profile birth date visibility migration", () => {
  it("adds nullable birth date storage and opt-in visibility", () => {
    expect(migration).toMatch(/add column if not exists birth_date date/i);
    expect(migration).toMatch(
      /add column if not exists public_birth_date boolean not null default false/i,
    );
  });

  it("allows authenticated owners to update the new fields", () => {
    expect(migration).toMatch(
      /grant update \(\s*birth_date,\s*public_birth_date\s*\) on public\.profiles to authenticated;/i,
    );
  });

  it("replaces the public RPC with an age-only return shape", () => {
    expect(migration).toContain("drop function if exists public.get_public_profiles(uuid[]);");
    expect(migration).toMatch(/age integer/);
    expect(migration).toMatch(/extract\(year from age\(current_date, profile\.birth_date\)\)::integer/);
    expect(migration).toContain("profile.public_birth_date");
    expect(migration).not.toMatch(/returns table \([\s\S]*birth_date\s+date[\s\S]*\)/i);
  });

  it("keeps the RPC restricted to anonymous and authenticated readers", () => {
    expect(migration).toContain(
      "revoke all on function public.get_public_profiles(uuid[]) from public;",
    );
    expect(migration).toContain(
      "grant execute on function public.get_public_profiles(uuid[]) to anon, authenticated;",
    );
  });
});
