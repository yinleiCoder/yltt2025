import { redirect } from "next/navigation";

import { ProfileForm } from "@/features/profile/components/profile-form";
import { ProfileMotion } from "@/features/profile/components/profile-motion";
import { AuthenticationRequiredError } from "@/features/auth/server/auth-service";
import { getCurrentProfileDetails } from "@/features/profile/server/profile-service";

export default async function ProfilePage() {
  try {
    const profile = await getCurrentProfileDetails();

    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-10 bg-[rgb(283,283,283)]">
        <ProfileMotion>
          <header data-profile-motion="heading" className="max-w-2xl border-b border-border pb-8">
            <p className="text-sm text-muted-foreground">个人中心</p>
            <h1 className="mt-2 font-[family-name:var(--font-editorial)] text-4xl text-foreground sm:text-5xl">我的资料</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">管理评论时展示的身份信息，并决定哪些个人资料可以被其他访客查看。</p>
          </header>
          <div className="pt-8">
            <ProfileForm
              initialValues={{
                avatarUrl: profile.avatarUrl,
                displayName: profile.displayName,
                email: profile.email ?? null,
                realName: profile.realName,
                phone: profile.phone,
                address: profile.address,
                birthDate: profile.birthDate,
                gender: profile.gender,
                publicGender: profile.publicGender,
                publicRealName: profile.publicRealName,
                publicPhone: profile.publicPhone,
                publicAddress: profile.publicAddress,
                publicBirthDate: profile.publicBirthDate,
                publicEmail: profile.publicEmail ?? false,
              }}
            />
          </div>
        </ProfileMotion>
      </main>
    );
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/login?next=/profile");
    throw error;
  }
}
