"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

export function VideoPlayer({ src, poster, title }: { src: string | null; poster?: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  if (!src) return <Alert variant="destructive"><AlertTitle>视频暂不可用</AlertTitle><AlertDescription>该短片还没有可播放的媒体地址。</AlertDescription></Alert>;
  return (
    <div className="grid gap-3">
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        {failed ? <video aria-label={title} className="h-full w-full" controls playsInline poster={poster ?? undefined} preload="metadata" src={src} /> : <ReactPlayer aria-label={title} className="h-full w-full" controls playsInline poster={poster ?? undefined} preload="metadata" src={src} width="100%" height="100%" onError={() => setFailed(true)} />}
      </div>
      {failed ? <Alert><AlertTitle>播放器已切换</AlertTitle><AlertDescription>高级播放器无法加载此格式，已切换为浏览器原生播放器。</AlertDescription></Alert> : null}
    </div>
  );
}
