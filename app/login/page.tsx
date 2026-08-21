import Link from "next/link";

import { resolveAuthRedirectPath } from "@/features/auth/domain/redirect-path";
import { LoginForm } from "@/features/auth/components/login-form";

type LoginPageProps = {
  searchParams: Promise<{ "check-email"?: string; error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = resolveAuthRedirectPath(params.next);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
      <Link className="mb-12 text-sm font-medium" href="/">YlTt2025</Link>
      <h1 className="text-3xl font-semibold">Login</h1>
      <p className="mt-3 text-sm text-muted-foreground">Return to the archive.</p>
      {params["check-email"] ? <p className="mt-6 text-sm">Check your inbox to confirm your email address.</p> : null}
      {params.error ? <p className="mt-6 text-sm text-destructive">The sign-in link expired or could not be verified.</p> : null}
      <LoginForm next={next} />
      <p className="mt-8 text-sm text-muted-foreground">No account? <Link className="text-foreground underline" href="/register">Create one</Link>.</p>
    </main>
  );
}
