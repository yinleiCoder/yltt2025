import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PublicProfile } from "@/features/profile/domain/public-profile";

export function ProfileAvatar({
  profile,
  size = "default",
}: {
  profile: Pick<PublicProfile, "avatarUrl" | "displayName">;
  size?: "default" | "sm" | "lg";
}) {
  return (
    <Avatar size={size}>
      {profile.avatarUrl ? <AvatarImage alt="" src={profile.avatarUrl} /> : null}
      <AvatarFallback>{profile.displayName?.trim().slice(0, 1).toUpperCase() || "?"}</AvatarFallback>
    </Avatar>
  );
}
