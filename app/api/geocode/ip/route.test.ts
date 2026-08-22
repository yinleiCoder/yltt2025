import { describe, expect, it, vi } from "vitest";

import { GET, getClientIp } from "./route";

describe("getClientIp", () => {
  it("prefers Cloudflare's IP", () => {
    expect(
      getClientIp(
        new Headers({
          "cf-connecting-ip": "203.0.113.10",
          "x-forwarded-for": "198.51.100.4",
        }),
      ),
    ).toBe("203.0.113.10");
  });

  it("uses x-forwarded-for then x-real-ip", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": "198.51.100.4, 10.0.0.1" }))).toBe("198.51.100.4");
    expect(getClientIp(new Headers({ "x-real-ip": "192.0.2.1" }))).toBe("192.0.2.1");
  });
});

describe("GET /api/geocode/ip", () => {
  it("returns only city-level data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, city: "Chengdu", region: "Sichuan" }))),
    );

    const response = await GET(
      new Request("http://localhost/api/geocode/ip", { headers: { "cf-connecting-ip": "203.0.113.10" } }),
    );

    expect(await response.json()).toEqual({ city: "Chengdu", region: "Sichuan" });
    expect(fetch).toHaveBeenCalledWith(
      "https://ipwho.is/203.0.113.10",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("returns a useful failure when no client IP is present", async () => {
    const response = await GET(new Request("http://localhost/api/geocode/ip"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "无法识别访问者 IP，请手动填写地点。" });
  });
});
