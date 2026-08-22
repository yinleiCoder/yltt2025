import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { MAX_PUBLIC_PROFILE_IDS } from "@/features/profile/domain/public-profile";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260821120000_add_profile_details_and_public_projection.sql",
  ),
  "utf8",
);

describe("get_public_profiles migration contract", () => {
  it("returns only the fixed public profile columns", () => {
    expect(migration).toMatch(
      /returns table \(\s*id uuid,\s*avatar_url text,\s*display_name text,\s*gender public\.profile_gender,\s*real_name text,\s*phone text,\s*address text\s*\)/,
    );
    expect(migration).toContain("where profile.id = any (requested_profile_ids);");
  });

  it("uses a hardened security-definer function", () => {
    expect(migration).toMatch(/security\s+definer/i);
    expect(migration).toMatch(/set\s+search_path\s*=\s*''/i);
  });

  it("projects disabled fields as SQL null", () => {
    expect(migration).toContain(
      "case when profile.public_gender then profile.gender else null end as gender",
    );
    expect(migration).toContain(
      "case when profile.public_real_name then profile.real_name else null end as real_name",
    );
    expect(migration).toContain(
      "case when profile.public_phone then profile.phone else null end as phone",
    );
    expect(migration).toContain(
      "case when profile.public_address then profile.address else null end as address",
    );
  });

  it("caps batch size and restricts execution to anon and authenticated", () => {
    expect(migration).toContain(
      `if cardinality(coalesce(requested_profile_ids, '{}'::uuid[])) > ${MAX_PUBLIC_PROFILE_IDS} then`,
    );
    expect(migration).toContain(
      `raise exception 'At most ${MAX_PUBLIC_PROFILE_IDS} public profiles can be requested at once';`,
    );
    expect(migration).toContain(
      "revoke all on function public.get_public_profiles(uuid[]) from public;",
    );
    expect(migration).toContain(
      "grant execute on function public.get_public_profiles(uuid[]) to anon, authenticated;",
    );
  });

  it("grants authenticated users update access to every editable profile field", () => {
    expect(migration).toMatch(
      /grant update \(\s*display_name,\s*avatar_url,\s*real_name,\s*phone,\s*address,\s*gender,\s*public_gender,\s*public_real_name,\s*public_phone,\s*public_address\s*\) on public\.profiles to authenticated;/,
    );
  });
});
