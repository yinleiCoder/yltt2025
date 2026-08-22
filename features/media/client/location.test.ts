import { afterEach, describe, expect, it, vi } from "vitest";

import { getCurrentLocation, getIpLocation, reverseGeocode } from "./location";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("location helpers", () => {
  it("normalizes a reverse geocoding response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            display_name: "京都府京都市左京区",
            address: { city: "京都市", state: "京都府" },
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(reverseGeocode(35.0116, 135.7681)).resolves.toEqual({
      label: "京都府京都市左京区",
      city: "京都市",
      region: "京都府",
    });
  });

  it("returns null instead of throwing when reverse geocoding fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(reverseGeocode(35.0116, 135.7681)).resolves.toBeNull();
  });

  it("wraps browser geolocation in a promise", async () => {
    const geolocation = {
      getCurrentPosition: vi.fn((success: PositionCallback) =>
        success({ coords: { latitude: 30, longitude: 105 } } as GeolocationPosition),
      ),
    };

    await expect(getCurrentLocation(geolocation)).resolves.toEqual({ latitude: 30, longitude: 105 });
    expect(geolocation.getCurrentPosition).toHaveBeenCalledOnce();
  });

  it("reports permission denial distinctly", async () => {
    const geolocation = {
      getCurrentPosition: vi.fn((_success: PositionCallback, error: PositionErrorCallback) =>
        error({ code: 1 } as GeolocationPositionError),
      ),
    };

    await expect(getCurrentLocation(geolocation)).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("returns city-level IP location", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ city: "成都", region: "四川省" }))));

    await expect(getIpLocation()).resolves.toEqual({ city: "成都", region: "四川省" });
  });

  it("returns null when IP location cannot be retrieved", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "unavailable" }), { status: 502 })));

    await expect(getIpLocation()).resolves.toBeNull();
  });
});
