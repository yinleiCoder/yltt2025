export type UserRole = "user" | "admin";

export type RoleChangeInput = {
  actorId: string;
  targetId: string;
  nextRole: UserRole;
  currentTargetRole: UserRole;
  administratorCount: number;
};

export type RoleAuditPayload = {
  actorId: string;
  targetId: string;
  previousRole: UserRole;
  nextRole: UserRole;
};

export class RoleChangePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoleChangePolicyError";
  }
}

export function validateRoleChange(
  input: RoleChangeInput,
): RoleAuditPayload {
  if (input.actorId === input.targetId) {
    throw new RoleChangePolicyError("Administrators cannot change their own role.");
  }

  const removesFinalAdministrator =
    input.currentTargetRole === "admin" &&
    input.nextRole !== "admin" &&
    input.administratorCount <= 1;

  if (removesFinalAdministrator) {
    throw new RoleChangePolicyError("Cannot remove the last administrator.");
  }

  return {
    actorId: input.actorId,
    targetId: input.targetId,
    previousRole: input.currentTargetRole,
    nextRole: input.nextRole,
  };
}
