export type ReverseGeocodeResult = {
  label?: string;
  city?: string;
  region?: string;
};

type GeolocationLike = Pick<Geolocation, "getCurrentPosition">;

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

export function getCurrentLocation(geolocation: GeolocationLike = navigator.geolocation): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => reject(new Error("无法获取当前位置。")),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}
