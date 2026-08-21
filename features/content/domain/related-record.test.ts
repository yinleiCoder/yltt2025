import { describe, expect, it } from "vitest";

import { firstRelatedRecord } from "./related-record";

describe("firstRelatedRecord", () => {
  it("accepts a one-to-one relation returned as an object", () => {
    const detail = { objectKey: "photos/2026/08/park.jpg" };

    expect(firstRelatedRecord(detail)).toEqual(detail);
  });

  it("accepts a one-to-many relation returned as an array", () => {
    const detail = { objectKey: "photos/2026/08/park.jpg" };

    expect(firstRelatedRecord([detail])).toEqual(detail);
  });

  it("returns null for an empty relation", () => {
    expect(firstRelatedRecord(null)).toBeNull();
    expect(firstRelatedRecord([])).toBeNull();
  });
});
