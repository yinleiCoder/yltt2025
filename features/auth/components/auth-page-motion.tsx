"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

gsap.registerPlugin(useGSAP);

export function AuthPageMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap
        .timeline({ defaults: { duration: 0.56, ease: "power3.out" } })
        .from("[data-auth-motion=brand]", { autoAlpha: 0, x: -20 })
        .from("[data-auth-motion=form]", { autoAlpha: 0, x: 20 }, "<0.12")
        .from(
          "[data-auth-motion=field]",
          { autoAlpha: 0, stagger: 0.08, y: 12 },
          "<0.2",
        );
    },
    { scope },
  );

  return <main ref={scope}>{children}</main>;
}
