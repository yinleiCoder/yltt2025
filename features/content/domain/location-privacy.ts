export type LocationVisibility = "precise" | "city" | "hidden";

export type ContentLocation = {
  label: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  visibility: LocationVisibility;
};

export type PublicLocation =
  | {
      label: string;
      city: string;
      region: string;
      latitude: number;
      longitude: number;
    }
  | {
      city: string;
      region: string;
    }
  | null;

export function toPublicLocation(location: ContentLocation): PublicLocation {
  if (location.visibility === "hidden") {
    return null;
  }

  if (location.visibility === "city") {
    return {
      city: location.city,
      region: location.region,
    };
  }

  return {
    label: location.label,
    city: location.city,
    region: location.region,
    latitude: location.latitude,
    longitude: location.longitude,
  };
}
