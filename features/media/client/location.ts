export type ReverseGeocodeResult = {
  label?: string;
  city?: string;
  region?: string;
};

type GeolocationLike = Pick<Geolocation, "getCurrentPosition">;

export type LocationErrorCode = "unsupported" | "permission-denied" | "unavailable" | "timeout";

export class CurrentLocationError extends Error {
  constructor(public readonly code: LocationErrorCode) {
    super(code);
    this.name = "CurrentLocationError";
  }
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult | null> {
  try {
    const response = await fetch(`/api/geocode/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      label?: unknown;
      city?: unknown;
      region?: unknown;
      display_name?: unknown;
      address?: { city?: unknown; town?: unknown; village?: unknown; state?: unknown; region?: unknown };
    };
    if (!payload || typeof payload !== "object") return null;
    const address = payload.address ?? {};
    const city = [address.city, address.town, address.village].find((value): value is string => typeof value === "string" && value.length > 0);
    const region = [address.state, address.region].find((value): value is string => typeof value === "string" && value.length > 0);
    const label = typeof payload.label === "string" ? payload.label : typeof payload.display_name === "string" ? payload.display_name : undefined;
    return label || city || region ? { label, city, region } : null;
  } catch {
    return null;
  }
}

export function getCurrentLocation(
  geolocation: GeolocationLike | undefined = globalThis.navigator?.geolocation,
): Promise<{ latitude: number; longitude: number }> {
  if (!geolocation) return Promise.reject(new CurrentLocationError("unsupported"));

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => {
        const code = error.code === 1 || error.code === error.PERMISSION_DENIED
          ? "permission-denied"
          : error.code === 3 || error.code === error.TIMEOUT
            ? "timeout"
            : "unavailable";
        reject(new CurrentLocationError(code));
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

export async function getIpLocation(): Promise<{ city?: string; region?: string } | null> {
  try {
    const response = await fetch("/api/geocode/ip", { headers: { Accept: "application/json" } });
    if (!response.ok) return null;

    const payload = (await response.json()) as { city?: unknown; region?: unknown };
    const city = typeof payload.city === "string" && payload.city.length > 0 ? payload.city : undefined;
    const region = typeof payload.region === "string" && payload.region.length > 0 ? payload.region : undefined;
    return city || region ? { city, region } : null;
  } catch {
    return null;
  }
}

export function locationErrorMessage(error: unknown): string {
  if (!(error instanceof CurrentLocationError)) return "无法获取当前位置，请检查浏览器权限或手动填写地点。";

  switch (error.code) {
    case "unsupported":
      return "当前浏览器不支持定位，请使用 HTTPS 或手动填写地点。";
    case "permission-denied":
      return "浏览器拒绝了定位权限，请在地址栏允许定位后重试，或手动填写地点。";
    case "timeout":
      return "获取当前位置超时，将尝试城市级定位；如仍失败请手动填写地点。";
    case "unavailable":
      return "当前定位服务不可用，将尝试城市级定位；如仍失败请手动填写地点。";
  }
}
