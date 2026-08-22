import { AuthPageMotion } from "@/features/auth/components/auth-page-motion";
import { resolveAuthRedirectPath } from "@/features/auth/domain/redirect-path";
import { RegisterForm } from "@/features/auth/components/register-form";

type RegisterPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const next = resolveAuthRedirectPath(params.next);

  return (
    <AuthPageMotion>
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 text-foreground md:p-10">
        <div className="w-full max-w-sm" data-auth-motion="form">
          <RegisterForm next={next} />
        </div>
      </div>
    </AuthPageMotion>
  );
}
