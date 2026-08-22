import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath = new URL(
  "./20260821100000_fix_admin_role_rpc_current_role.sql",
  import.meta.url,
);

describe("admin role RPC migration", () => {
  it("serializes role changes before evaluating final-administrator protection", async () => {
    const sql = await readFile(migrationPath, "utf8");
    const lockIndex = sql.indexOf("pg_advisory_xact_lock");
    const adminCheckIndices = [...sql.matchAll(/\(select private\.is_admin\(\)\)/g)]
      .map((match) => match.index ?? -1);
    const targetRoleReadIndex = sql.indexOf("select role into existing_role");
    const finalAdminCheckIndex = sql.indexOf("count(*) from public.profiles where role = 'admin'");
    const roleUpdateIndex = sql.indexOf("update public.profiles");

    expect(sql).toContain("perform pg_catalog.pg_advisory_xact_lock(");
    expect(lockIndex).toBeGreaterThanOrEqual(0);
    expect(adminCheckIndices).toHaveLength(2);
    expect(adminCheckIndices[1]).toBeGreaterThan(lockIndex);
    expect(targetRoleReadIndex).toBeGreaterThan(adminCheckIndices[1]);
    expect(finalAdminCheckIndex).toBeGreaterThan(adminCheckIndices[1]);
    expect(roleUpdateIndex).toBeGreaterThan(adminCheckIndices[1]);
    expect(sql).toContain("raise exception 'The last administrator cannot be demoted'");
  });

  it("keeps the privileged RPC locked down and schema-qualified", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("(select auth.uid())");
    expect(sql).toContain("(select private.is_admin())");
  });
});
