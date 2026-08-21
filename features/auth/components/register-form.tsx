"use client";

import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthActionState } from "@/features/auth/domain/auth-feedback";
import { signUpAction } from "@/features/auth/server/actions";

const initialState: AuthActionState = {};

export function RegisterForm({ next }: { next: string }) {
  const [state, action, isPending] = useActionState(signUpAction, initialState);

  return (
    <form action={action} className="mt-8 grid gap-4">
      <input name="next" type="hidden" value={next} />
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <Input
        aria-invalid={Boolean(state.error)}
        autoComplete="email"
        name="email"
        placeholder="Email"
        required
        type="email"
      />
      <Input
        aria-invalid={Boolean(state.error)}
        autoComplete="new-password"
        minLength={8}
        name="password"
        placeholder="Password (8 characters minimum)"
        required
        type="password"
      />
      <Button disabled={isPending} type="submit">
        {isPending ? "Registering" : "Register"}
      </Button>
    </form>
  );
}
