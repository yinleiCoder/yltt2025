import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";

import { StoryMarkdown } from "@/features/content/components/story-markdown";

describe("StoryMarkdown", () => {
  it("renders Markdown structure while removing raw HTML", () => {
    const markup = renderToStaticMarkup(
      React.createElement(StoryMarkdown, { markdown: "## 夜航\n\n- 第一段\n- 第二段\n\n1. 第一步\n2. 第二步\n\n<script>alert('unsafe')</script>" }),
    );

    expect(markup).toContain("<h2>夜航</h2>");
    expect(markup).toContain("<li>第一段</li>");
    expect(markup).toContain("<ol>");
    expect(markup).toContain("list-disc");
    expect(markup).not.toContain("<script>");
  });

  it("allows a surface to replace the default Markdown typography", () => {
    const markup = renderToStaticMarkup(
      React.createElement(StoryMarkdown, {
        className: "typeset typeset-docs max-w-[37em]",
        markdown: "## 夜航\n\n- 第一段",
        unstyled: true,
      }),
    );

    expect(markup).toContain('class="typeset typeset-docs max-w-[37em]"');
    expect(markup).not.toContain("list-disc");
  });
});
