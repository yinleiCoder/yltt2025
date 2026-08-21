import { describe, expect, it } from "vitest";

import { shouldRefreshSupabaseSession } from "./session-refresh-policy";

describe("shouldRefreshSupabaseSession", () => {
  it("skips session refresh when public Supabase credentials are unavailable", () => {
    expect(shouldRefreshSupabaseSession(false)).toBe(false);
  });

  it("refreshes a session once public Supabase credentials are configured", () => {
    expect(shouldRefreshSupabaseSession(true)).toBe(true);
  });
});
