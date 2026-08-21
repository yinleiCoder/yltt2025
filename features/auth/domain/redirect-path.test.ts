import { describe, expect, it } from "vitest";

import { resolveAuthRedirectPath } from "./redirect-path";

describe("resolveAuthRedirectPath", () => {
  it("keeps an internal application path", () => {
    expect(resolveAuthRedirectPath("/admin?tab=content")).toBe(
      "/admin?tab=content",
    );
  });

  it("rejects a protocol-relative external redirect", () => {
    expect(resolveAuthRedirectPath("//malicious.example")).toBe("/");
  });

  it("rejects an absolute external redirect", () => {
    expect(resolveAuthRedirectPath("https://malicious.example")).toBe("/");
  });
});
