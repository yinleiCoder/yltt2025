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

  if (normalizedMessage.includes("email not confirmed")) {
    return "请先完成邮箱确认，再登录。";
  }

  if (normalizedMessage.includes("email address") && normalizedMessage.includes("invalid")) {
    return "请输入可接收邮件的有效邮箱地址。";
  }

  if (normalizedMessage.includes("user already registered")) {
    return "该邮箱已注册，请直接登录。";
  }

  if (normalizedMessage.includes("rate limit")) {
    return "请求过于频繁，请稍后再试。";
  }

  return "认证请求失败，请稍后重试。";
}

export function getAuthHashErrorCode(hash: string): string | null {
  if (!hash.startsWith("#")) return null;

  const params = new URLSearchParams(hash.slice(1));
  if (!params.has("error") && !params.has("error_code")) return null;

  return params.get("error_code") ?? params.get("error");
}
