"use client";

import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";

export function PhotoLightbox({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <PhotoProvider maskOpacity={0.92} bannerVisible={false}>
      <PhotoView src={src}>
        <button aria-label={`查看大图：${alt}`} className="block w-full cursor-zoom-in text-left" type="button">
          <img alt={alt} className={className} decoding="async" src={src} />
        </button>
      </PhotoView>
    </PhotoProvider>
  );
}
