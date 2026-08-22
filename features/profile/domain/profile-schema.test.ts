import { describe, expect, it } from "vitest";

import { parseProfileDraft } from "./profile-schema";

describe("parseProfileDraft", () => {
  const validDraft = {
    displayName: "Mika",
    realName: "Mika Tanaka",
    phone: "+81 90 1234 5678",
    address: "Sakyo Ward, Kyoto",
    gender: "female",
    publicGender: true,
    publicRealName: false,
    publicPhone: false,
    publicAddress: false,
  };

  it("accepts profile fields at their supported lengths and gender values", () => {
    expect(parseProfileDraft(validDraft)).toEqual(validDraft);
  });

  it("rejects blank or overlong profile fields", () => {
    expect(() => parseProfileDraft({ ...validDraft, displayName: " " })).toThrow();
    expect(() => parseProfileDraft({ ...validDraft, realName: "a".repeat(81) })).toThrow();
    expect(() => parseProfileDraft({ ...validDraft, phone: "1".repeat(33) })).toThrow();
    expect(() => parseProfileDraft({ ...validDraft, address: "a".repeat(241) })).toThrow();
  });

  it("normalizes blank optional details to null", () => {
    expect(
      parseProfileDraft({
        ...validDraft,
        realName: "  ",
        phone: "",
        address: " ",
        gender: null,
      }),
    ).toMatchObject({ realName: null, phone: null, address: null, gender: null });
  });

  it("rejects unsupported gender values", () => {
    expect(() => parseProfileDraft({ ...validDraft, gender: "prefer-not-to-say" })).toThrow();
  });
});
