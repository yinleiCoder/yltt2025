"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";

export function PhotoLightbox({ src, alt, className = "", activation = "click" }: { src: string; alt: string; className?: string; activation?: "click" | "double-click" }) {
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  useEffect(() => {
    const pointer = window.matchMedia("(pointer: coarse)");
    const updatePointer = () => setIsCoarsePointer(pointer.matches);
    updatePointer();
    pointer.addEventListener("change", updatePointer);
    return () => pointer.removeEventListener("change", updatePointer);
  }, []);
  const trigger = activation === "double-click" && !isCoarsePointer ? "onDoubleClick" : "onClick";
  const triggers: ("onClick" | "onDoubleClick")[] = [trigger];
  function openFromKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.currentTarget.dispatchEvent(new MouseEvent(trigger === "onDoubleClick" ? "dblclick" : "click", { bubbles: true }));
  }
  return (
    <PhotoProvider maskOpacity={0.92} bannerVisible={false}>
      <PhotoView key={trigger} src={src} triggers={triggers}>
        <button aria-label={`查看大图：${alt}`} className="block w-full cursor-zoom-in text-left" onKeyDown={openFromKeyboard} type="button">
          <img alt={alt} className={className} decoding="async" src={src} />
        </button>
      </PhotoView>
    </PhotoProvider>
  );
}
