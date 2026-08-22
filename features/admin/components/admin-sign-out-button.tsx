"use client";

import { LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function AdminSignOutButton({ compact = false }: { compact?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button className={compact ? undefined : "w-full justify-start"} disabled={pending} size={compact ? "sm" : undefined} type="submit" variant="ghost">
      <LogOut aria-hidden="true" data-icon="inline-start" />
      {pending ? "正在退出..." : "退出登录"}
    </Button>
  );
}
