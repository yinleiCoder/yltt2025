"use client";

import { useEffect } from "react";

import { getAuthHashErrorCode } from "@/features/auth/domain/auth-feedback";

export function AuthHashErrorRedirect() {
  useEffect(() => {
    const errorCode = getAuthHashErrorCode(window.location.hash);
    if (!errorCode) return;

    window.location.replace(`/login?error=${encodeURIComponent(errorCode)}`);
  }, []);

  return null;
}
