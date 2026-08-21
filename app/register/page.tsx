import Link from "next/link";

import { resolveAuthRedirectPath } from "@/features/auth/domain/redirect-path";
import { RegisterForm } from "@/features/auth/components/register-form";

type RegisterPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const next = resolveAuthRedirectPath(params.next);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
      <Link className="mb-12 text-sm font-medium" href="/">YlTt2025</Link>
      <h1 className="text-3xl font-semibold">Create an account</h1>
      <p className="mt-3 text-sm text-muted-foreground">Comment on work and keep your archive in view.</p>
      <RegisterForm next={next} />
      <p className="mt-8 text-sm text-muted-foreground">Already registered? <Link className="text-foreground underline" href="/login">Login</Link>.</p>
    </main>
  );
}
