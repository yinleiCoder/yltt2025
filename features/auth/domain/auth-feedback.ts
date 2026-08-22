const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthCredentials = {
  email: string;
  password: string;
};

export type AuthActionState = {
  error?: string;
};

export function parseAuthCredentials(
  emailValue: FormDataEntryValue | null,
  passwordValue: FormDataEntryValue | null,
): { value: AuthCredentials } | { error: string } {
  const email = String(emailValue ?? "").trim().toLowerCase();
  const password = String(passwordValue ?? "");

  if (!EMAIL_PATTERN.test(email)) {
    return { error: "请输入有效的邮箱地址。" };
  }

  if (password.length < 8) {
    return { error: "密码至少需要 8 个字符。" };
  }

  return { value: { email, password } };
}

export function getAuthErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "邮箱或密码不正确。";
  }

  if (
    normalizedMessage.includes("email not confirmed") ||
    normalizedMessage.includes("email_not_confirmed")
  ) {
    return "请先完成邮箱确认，再登录。";
  }

  if (normalizedMessage.includes("email address") && normalizedMessage.includes("invalid")) {
    return "请输入可接收邮件的有效邮箱地址。";
  }

  if (
    normalizedMessage.includes("user already registered") ||
    normalizedMessage.includes("email_exists")
  ) {
    return "该邮箱已注册，请直接登录。";
  }

  if (
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("over_email_send_rate_limit")
  ) {
    return "请求过于频繁，请稍后再试。";
  }

  if (
    normalizedMessage.includes("provider is not enabled") ||
    normalizedMessage.includes("unsupported provider")
  ) {
    return "GitHub 登录暂不可用，请稍后再试。";
  }

  if (
    normalizedMessage.includes("otp_expired") ||
    normalizedMessage.includes("flow_state_expired") ||
    normalizedMessage.includes("sign-in link expired") ||
    normalizedMessage.includes("could not be verified")
  ) {
    return "登录链接已失效，请重新发起登录。";
  }

  if (
    normalizedMessage.includes("bad_code_verifier") ||
    normalizedMessage.includes("bad_oauth_callback")
  ) {
    return "GitHub 登录验证失败，请重新发起登录。";
  }

  return "认证请求失败，请稍后重试。";
}

export function getAuthHashErrorCode(hash: string): string | null {
  if (!hash.startsWith("#")) return null;

  const params = new URLSearchParams(hash.slice(1));
  if (!params.has("error") && !params.has("error_code")) return null;

  return params.get("error_code") ?? params.get("error");
}

export function getAuthErrorRedirectPath(errorCode: string, next = "/"): string {
  const params = new URLSearchParams({ error: errorCode });
  if (next !== "/") params.set("next", next);
  return `/login?${params.toString()}`;
}
