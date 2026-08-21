import { describe, expect, it } from "vitest";

import { toPublicLocation } from "./location-privacy";

const location = {
  label: "Higashiyama Ward",
  city: "Kyoto",
  region: "Kyoto Prefecture",
  latitude: 35.0037,
  longitude: 135.7788,
};

describe("toPublicLocation", () => {
  it("keeps coordinates only when the work is marked precise", () => {
    expect(toPublicLocation({ ...location, visibility: "precise" })).toEqual({
      label: "Higashiyama Ward",
      city: "Kyoto",
      region: "Kyoto Prefecture",
      latitude: 35.0037,
      longitude: 135.7788,
    });
  });

  it("removes coordinates and exact labels for city-level visibility", () => {
    expect(toPublicLocation({ ...location, visibility: "city" })).toEqual({
      city: "Kyoto",
      region: "Kyoto Prefecture",
    });
  });

  it("removes location data when the creator selected hidden", () => {
    expect(toPublicLocation({ ...location, visibility: "hidden" })).toBeNull();
  });
});
