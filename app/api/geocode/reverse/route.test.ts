import { describe, expect, it, vi } from "vitest";

import { GET } from "./route";

describe("reverse geocode route", () => {
  it("returns normalized place fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ display_name: "京都府京都市", address: { city: "京都市", state: "京都府" } }), { status: 200 }),
      ),
    );

    const response = await GET(new Request("http://localhost/api/geocode/reverse?lat=35.0116&lon=135.7681"));
    await expect(response.json()).resolves.toEqual({ label: "京都府京都市", city: "京都市", region: "京都府" });
  });

  it("rejects invalid coordinates", async () => {
    const response = await GET(new Request("http://localhost/api/geocode/reverse?lat=200&lon=0"));
    expect(response.status).toBe(400);
  });
});
