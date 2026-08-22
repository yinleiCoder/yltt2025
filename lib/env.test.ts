import { afterEach, describe, expect, it, vi } from "vitest";

import { getTrustedAppOrigin } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("受信任的应用地址", () => {
  it("使用配置的站点源地址，忽略路径和尾部斜杠", () => {
    vi.stubEnv("SITE_URL", "https://yltt.example.cn/archive/");

    expect(getTrustedAppOrigin()).toBe("https://yltt.example.cn");
  });

  it("仅在开发和测试环境缺少配置时回退到本地地址", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SITE_URL", undefined);

    expect(getTrustedAppOrigin()).toBe("http://localhost:3000");
  });

  it("生产环境缺少站点地址时拒绝生成回调地址", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SITE_URL", undefined);

    expect(() => getTrustedAppOrigin()).toThrow("SITE_URL");
  });

  it("生产环境拒绝非 HTTPS 的站点地址", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SITE_URL", "http://yltt.example.cn");

    expect(() => getTrustedAppOrigin()).toThrow("HTTPS");
  });
});
