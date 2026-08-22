import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminShell } from "@/features/admin/components/admin-shell";
import {
  AdministratorRequiredError,
  AuthenticationRequiredError,
  requireAdministrator,
} from "@/features/auth/server/auth-service";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    const administrator = await requireAdministrator();
    return <AdminShell profile={administrator}>{children}</AdminShell>;
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/login?next=/admin");
    if (error instanceof AdministratorRequiredError) redirect("/");
    throw error;
  }
}
