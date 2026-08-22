"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import type { CommentProfile } from "@/features/profile/domain/public-profile";
import { useCurrentUserStore } from "@/features/auth/components/current-user-provider";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const genderLabels = {
  male: "男",
  female: "女",
  other: "其他",
  unknown: "未说明",
} as const;

export function PublicProfileDialog({ profile }: { profile: CommentProfile }) {
  const displayName = profile.displayName?.trim() || "匿名用户";
  const currentUser = useCurrentUserStore((state) => state.currentUser);
  const isCurrentUser = currentUser?.id === profile.id;
  const isAdmin = currentUser?.role == "admin";
  const profileTitle = profile.canViewFullProfile ? "个人资料" : "公开资料";
  const age =
    typeof profile.age === "number" && Number.isInteger(profile.age) && profile.age >= 0
      ? profile.age
      : undefined;
  const details = [
    profile.email ? ["邮箱", profile.email] : null,
    profile.realName ? ["姓名", profile.realName] : null,
    profile.gender ? ["性别", genderLabels[profile.gender]] : null,
    age !== undefined ? ["年龄", `${profile.age}岁`] : null,
    profile.phone ? ["电话", profile.phone] : null,
    profile.address ? ["地址", profile.address] : null,
  ].filter((detail): detail is [string, string] => detail !== null);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            aria-label={`查看 ${displayName} 的${profileTitle}`}
            className="h-auto gap-2 px-0 py-0 text-left hover:bg-transparent"
            variant="ghost"
          />
        }
      >
        <ProfileAvatar profile={profile} size="sm" />
        <span className="text-sm text-foreground">{displayName}</span>
        {isAdmin && (
          <Badge variant="secondary" className='bg-blue-50 text-blue-700'>
            <BadgeCheck data-icon="inline-start" />
            管理员
          </Badge>
        )}
        {isCurrentUser && (
          <Badge variant="outline" className='bg-green-50 text-green-700'>
            <ShieldCheck data-icon="inline-end"  />
            我
          </Badge>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[min(36rem,calc(100dvh-2rem))] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {displayName} 的{profileTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3">
          <ProfileAvatar profile={profile} size="lg" />
          <p className="font-medium">
            {displayName}
            {isCurrentUser ? "（我）" : ""}
          </p>
        </div>
        {details.length > 0 ? (
          <dl className="grid gap-3 text-sm break-words">
            {details.map(([label, value]) => (
              <div className="grid gap-1" key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            该用户暂未公开更多资料
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
