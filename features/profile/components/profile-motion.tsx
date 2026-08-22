"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

gsap.registerPlugin(useGSAP);

export function ProfileMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.timeline({ defaults: { duration: 0.42, ease: "power2.out" } })
        .from("[data-profile-motion=heading]", { opacity: 0, y: 12 })
        .from("[data-profile-motion=form]", { opacity: 0, y: 10 }, "<0.1");
    },
    { scope },
  );

  return <section ref={scope}>{children}</section>;
}
