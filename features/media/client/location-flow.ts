import { CurrentLocationError, type LocationErrorCode } from "./location";

type PreciseLocation = { latitude: number; longitude: number };
type CityLocation = { city?: string; region?: string };

export type LocationDependencies = {
  getPrecise: () => Promise<PreciseLocation>;
  getIp: () => Promise<CityLocation | null>;
};

export type LocationResolution =
  | ({ source: "precise" } & PreciseLocation)
  | ({ source: "ip"; preciseError: LocationErrorCode } & CityLocation)
  | { source: "none"; preciseError: LocationErrorCode };

export async function resolveCurrentLocation(dependencies: LocationDependencies): Promise<LocationResolution> {
  try {
    return { source: "precise", ...(await dependencies.getPrecise()) };
  } catch (error) {
    const preciseError = error instanceof CurrentLocationError ? error.code : "unavailable";
    const ipLocation = await dependencies.getIp();
    return ipLocation
      ? { source: "ip", ...ipLocation, preciseError }
      : { source: "none", preciseError };
  }
}
