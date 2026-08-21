"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useLayoutEffect } from "react";

gsap.registerPlugin(ScrollTrigger, SplitText);

export function HomeArchiveMotion() {
  useLayoutEffect(() => {
    const scope = document.getElementById("home-archive");
    if (!scope || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const context = gsap.context(() => {
      const title = scope.querySelector<HTMLElement>("[data-home-title]");
      const titleSplit = title
        ? SplitText.create(title, { aria: "auto", mask: "lines", type: "lines" })
        : null;

      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });

      if (titleSplit) {
        intro.from(titleSplit.lines, {
          autoAlpha: 0,
          duration: 0.86,
          stagger: 0.1,
          yPercent: 110,
        });
      }

      intro
        .from(
          "[data-home-hero-media]",
          { autoAlpha: 0, duration: 0.9, scale: 1.035 },
          "<0.12",
        )
        .from(
          "[data-home-hero-index] > *",
          { autoAlpha: 0, duration: 0.45, stagger: 0.07, y: 12 },
          "<0.22",
        );

      const archiveCards = gsap.utils.toArray<HTMLElement>("[data-archive-card]");
      if (archiveCards.length) {
        ScrollTrigger.batch(archiveCards, {
          batchMax: 4,
          interval: 0.1,
          onEnter: (elements) => {
            gsap.from(elements, {
              autoAlpha: 0,
              duration: 0.7,
              ease: "power3.out",
              stagger: 0.08,
              y: 28,
            });
          },
          once: true,
          start: "top 84%",
        });
      }
    }, scope);

    return () => context.revert();
  }, []);

  return null;
}
