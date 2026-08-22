"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { GalleryVerticalEnd } from "lucide-react";
import { FaGithub } from "react-icons/fa6";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AuthActionState } from "@/features/auth/domain/auth-feedback";
import {
  signInAction,
  signInWithGitHubAction,
} from "@/features/auth/server/actions";

const initialState: AuthActionState = {};

type LoginProvider = "password" | "github";

export function selectLoginError(
  attemptedProvider: LoginProvider,
  errors: { passwordError?: string; githubError?: string },
): string | undefined {
  return attemptedProvider === "github"
    ? errors.githubError
    : errors.passwordError;
}

export function LoginForm({
  next,
  className,
  ...props
}: { next: string } & React.ComponentProps<"div">) {
  const [passwordState, passwordAction, isPasswordPending] = useActionState(
    signInAction,
    initialState,
  );
  const [githubState, githubAction, isGitHubPending] = useActionState(
    signInWithGitHubAction,
    initialState,
  );
  const [attemptedProvider, setAttemptedProvider] =
    useState<LoginProvider>("password");
  const error = selectLoginError(attemptedProvider, {
    passwordError: passwordState.error,
    githubError: githubState.error,
  });

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center" data-auth-motion="brand">
        <Link className="flex flex-col items-center gap-2 font-medium" href="/">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd aria-hidden="true" />
          </span>
          <span className="sr-only">YLTT2025</span>
        </Link>
        <h1 className="text-xl font-bold">欢迎回到 YLTT2025</h1>
        <FieldDescription>
          还没有账户？{" "}
          <Link href={`/register?next=${encodeURIComponent(next)}`}>立即注册</Link>
        </FieldDescription>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <form action={passwordAction} onSubmit={() => setAttemptedProvider("password")}>
        <input name="next" type="hidden" value={next} />
        <FieldGroup>
          <Field data-auth-motion="field" data-invalid={Boolean(passwordState.error)}>
            <FieldLabel htmlFor="login-email">邮箱</FieldLabel>
            <Input
              aria-invalid={Boolean(passwordState.error)}
              autoComplete="email"
              id="login-email"
              name="email"
              placeholder="请输入常用邮箱"
              required
              type="email"
            />
          </Field>
          <Field data-auth-motion="field" data-invalid={Boolean(passwordState.error)}>
            <FieldLabel htmlFor="login-password">密码</FieldLabel>
            <Input
              aria-invalid={Boolean(passwordState.error)}
              autoComplete="current-password"
              id="login-password"
              minLength={8}
              name="password"
              placeholder="请输入密码"
              required
              type="password"
            />
          </Field>
          <Button className="w-full" disabled={isPasswordPending || isGitHubPending} type="submit">
            {isPasswordPending ? "正在登录..." : "登录"}
          </Button>
        </FieldGroup>
      </form>
      <FieldSeparator>或</FieldSeparator>
      <form action={githubAction} onSubmit={() => setAttemptedProvider("github")}>
        <input name="next" type="hidden" value={next} />
        <Button
          className="w-full"
          disabled={isPasswordPending || isGitHubPending}
          type="submit"
          variant="outline"
        >
          <FaGithub aria-hidden="true" data-icon="inline-start" />
          {isGitHubPending ? "正在连接 GitHub..." : "使用 GitHub 登录"}
        </Button>
      </form>
    </div>
  );
}
