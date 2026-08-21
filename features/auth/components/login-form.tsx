"use client";

import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthActionState } from "@/features/auth/domain/auth-feedback";
import {
  signInAction,
  signInWithGitHubAction,
} from "@/features/auth/server/actions";

const initialState: AuthActionState = {};

export function LoginForm({ next }: { next: string }) {
  const [passwordState, passwordAction, isPasswordPending] = useActionState(
    signInAction,
    initialState,
  );
  const [githubState, githubAction, isGitHubPending] = useActionState(
    signInWithGitHubAction,
    initialState,
  );
  const error = passwordState.error ?? githubState.error;

  return (
    <div className="mt-8 grid gap-3">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <form action={passwordAction} className="grid gap-4">
        <input name="next" type="hidden" value={next} />
        <Input
          aria-invalid={Boolean(passwordState.error)}
          autoComplete="email"
          name="email"
          placeholder="Email"
          required
          type="email"
        />
        <Input
          aria-invalid={Boolean(passwordState.error)}
          autoComplete="current-password"
          minLength={8}
          name="password"
          placeholder="Password"
          required
          type="password"
        />
        <Button disabled={isPasswordPending || isGitHubPending} type="submit">
          {isPasswordPending ? "Logging in" : "Login"}
        </Button>
      </form>
      <form action={githubAction}>
        <input name="next" type="hidden" value={next} />
        <Button
          className="w-full"
          disabled={isPasswordPending || isGitHubPending}
          type="submit"
          variant="outline"
        >
          {isGitHubPending ? "Connecting" : "Continue with GitHub"}
        </Button>
      </form>
    </div>
  );
}
