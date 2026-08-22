"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type AdminUserDetails = {
  address: string | null;
  gender: "male" | "female" | "other" | "unknown" | null;
  phone: string | null;
  realName: string | null;
};

const genderLabels = {
  male: "男",
  female: "女",
  other: "其他",
  unknown: "未说明",
} as const;

function detailValue(value: string | null) {
  return value?.trim() || "未填写";
}

export function AdminUserDetailsDialog({
  details,
  displayName,
}: {
  details: AdminUserDetails;
  displayName: string | null;
}) {
  const name = displayName?.trim() || "未设置昵称";
  const entries = [
    ["真实姓名", detailValue(details.realName)],
    ["手机号", detailValue(details.phone)],
    ["住址", detailValue(details.address)],
    ["性别", details.gender ? genderLabels[details.gender] : "未填写"],
  ];

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>查看资料</DialogTrigger>
      <DialogContent className="admin-surface max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{name} 的完整资料</DialogTitle>
          <DialogDescription>以下信息仅对管理员可见。</DialogDescription>
        </DialogHeader>
        <dl className="grid gap-3 text-sm break-words">
          {entries.map(([label, value]) => (
            <div className="grid gap-1" key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
