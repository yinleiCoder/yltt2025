import { describe, expect, it } from "vitest";

import { parseCommentDraft } from "./comment-draft";

describe("parseCommentDraft", () => {
  it("trims a valid comment body", () => {
    expect(parseCommentDraft({ contentId: "b7e7b1d8-77c2-4d24-bf7d-5f989750a661", body: "  很喜欢这一帧。  " })).toEqual({
      contentId: "b7e7b1d8-77c2-4d24-bf7d-5f989750a661",
      body: "很喜欢这一帧。",
    });
  });

  it("rejects blank comments", () => {
    expect(() => parseCommentDraft({ contentId: "b7e7b1d8-77c2-4d24-bf7d-5f989750a661", body: "   " })).toThrow();
  });

  it("rejects an invalid content id", () => {
    expect(() => parseCommentDraft({ contentId: "not-a-uuid", body: "A note" })).toThrow();
  });
});
