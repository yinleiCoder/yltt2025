import { AuthPageMotion } from "@/features/auth/components/auth-page-motion";
import { resolveAuthRedirectPath } from "@/features/auth/domain/redirect-path";
import { getAuthErrorMessage } from "@/features/auth/domain/auth-feedback";
import { LoginForm } from "@/features/auth/components/login-form";

type LoginPageProps = {
  searchParams: Promise<{ "check-email"?: string; error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = resolveAuthRedirectPath(params.next);

  return (
    <AuthPageMotion>
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 text-foreground md:p-10">
        <div className="w-full max-w-sm" data-auth-motion="form">
          {params["check-email"] ? <p className="mb-6 text-center text-sm text-muted-foreground">确认邮件已发送，请前往邮箱完成验证后登录。</p> : null}
          {params.error ? (
            <p className="mb-6 text-center text-sm text-destructive">
              {getAuthErrorMessage(params.error)}
            </p>
          ) : null}
          <LoginForm next={next} />
        </div>
      </div>
    </AuthPageMotion>
  );
}
