import { describe, expect, it } from "vitest";

import {
  RoleChangePolicyError,
  validateRoleChange,
} from "./role-policy";

describe("validateRoleChange", () => {
  it("rejects an administrator changing their own role", () => {
    expect(() =>
      validateRoleChange({
        actorId: "admin-1",
        targetId: "admin-1",
        nextRole: "user",
        currentTargetRole: "admin",
        administratorCount: 2,
      }),
    ).toThrow(RoleChangePolicyError);
  });

  it("rejects removal of the final administrator", () => {
    expect(() =>
      validateRoleChange({
        actorId: "admin-1",
        targetId: "admin-2",
        nextRole: "user",
        currentTargetRole: "admin",
        administratorCount: 1,
      }),
    ).toThrow("last administrator");
  });

  it("returns a durable audit payload for an allowed role change", () => {
    expect(
      validateRoleChange({
        actorId: "admin-1",
        targetId: "user-2",
        nextRole: "admin",
        currentTargetRole: "user",
        administratorCount: 1,
      }),
    ).toEqual({
      actorId: "admin-1",
      targetId: "user-2",
      previousRole: "user",
      nextRole: "admin",
    });
  });
});
