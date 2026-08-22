import { describe, expect, it } from "vitest";

import { CurrentLocationError } from "./location";
import { resolveCurrentLocation } from "./location-flow";

describe("resolveCurrentLocation", () => {
  it("prefers precise coordinates", async () => {
    await expect(
      resolveCurrentLocation({
        getPrecise: async () => ({ latitude: 30, longitude: 104 }),
        getIp: async () => ({ city: "成都" }),
      }),
    ).resolves.toEqual({ source: "precise", latitude: 30, longitude: 104 });
  });

  it("uses IP city after GPS rejects", async () => {
    await expect(
      resolveCurrentLocation({
        getPrecise: async () => Promise.reject(new CurrentLocationError("permission-denied")),
        getIp: async () => ({ city: "成都", region: "四川省" }),
      }),
    ).resolves.toEqual({ source: "ip", city: "成都", region: "四川省", preciseError: "permission-denied" });
  });

  it("returns the original error when both fail", async () => {
    await expect(
      resolveCurrentLocation({
        getPrecise: async () => Promise.reject(new CurrentLocationError("timeout")),
        getIp: async () => null,
      }),
    ).resolves.toEqual({ source: "none", preciseError: "timeout" });
  });
});
