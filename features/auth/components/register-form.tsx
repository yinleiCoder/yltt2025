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
import type { AuthActionState } from "@/features/auth/domain/auth-feedback";
import { signInWithGitHubAction, signUpAction } from "@/features/auth/server/actions";
import { cn } from "@/lib/utils";

const initialState: AuthActionState = {};

export function RegisterForm({
  next,
  className,
  ...props
}: { next: string } & React.ComponentProps<"div">) {
  const [state, action, isPending] = useActionState(signUpAction, initialState);
  const [githubState, githubAction, isGitHubPending] = useActionState(
    signInWithGitHubAction,
    initialState,
  );
  const [attemptedProvider, setAttemptedProvider] = useState<"password" | "github">("password");
  const error = attemptedProvider === "github" ? githubState.error : state.error;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center" data-auth-motion="brand">
        <Link className="flex flex-col items-center gap-2 font-medium" href="/">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd aria-hidden="true" />
          </span>
          <span className="sr-only">YLTT2025</span>
        </Link>
        <h1 className="text-xl font-bold">加入 YLTT2025</h1>
        <FieldDescription>
          已经注册？{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`}>去登录</Link>
        </FieldDescription>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <form action={action} onSubmit={() => setAttemptedProvider("password")}>
        <input name="next" type="hidden" value={next} />
        <FieldGroup>
          <Field data-auth-motion="field" data-invalid={Boolean(state.error)}>
            <FieldLabel htmlFor="register-email">邮箱</FieldLabel>
            <Input
              aria-invalid={Boolean(state.error)}
              autoComplete="email"
              id="register-email"
              name="email"
              placeholder="请输入常用邮箱"
              required
              type="email"
            />
          </Field>
          <Field data-auth-motion="field" data-invalid={Boolean(state.error)}>
            <FieldLabel htmlFor="register-password">密码</FieldLabel>
            <Input
              aria-invalid={Boolean(state.error)}
              autoComplete="new-password"
              id="register-password"
              minLength={8}
              name="password"
              placeholder="至少 8 个字符"
              required
              type="password"
            />
          </Field>
          <Button className="w-full" disabled={isPending || isGitHubPending} type="submit">
            {isPending ? "正在注册..." : "创建账户"}
          </Button>
        </FieldGroup>
      </form>
      <FieldSeparator>或</FieldSeparator>
      <form action={githubAction} onSubmit={() => setAttemptedProvider("github")}>
        <input name="next" type="hidden" value={next} />
        <Button className="w-full" disabled={isPending || isGitHubPending} type="submit" variant="outline">
          <FaGithub aria-hidden="true" data-icon="inline-start" />
          {isGitHubPending ? "正在连接 GitHub..." : "使用 GitHub 注册"}
        </Button>
      </form>
    </div>
  );
}
