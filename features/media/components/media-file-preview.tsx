"use client";

import { useEffect, useState } from "react";
import { useDropzone, type Accept } from "react-dropzone";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PhotoLightbox } from "@/features/media/components/photo-lightbox";

export function MediaFilePreview({ kind, onFile, onClear, onError }: { kind: "photo" | "video"; onFile: (file: File) => void; onClear: () => void; onError?: (message: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const accept: Accept = kind === "photo"
    ? { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] }
    : { "video/mp4": [".mp4"] };

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept,
    multiple: false,
    noClick: true,
    onDropAccepted: ([nextFile]) => { if (nextFile) { setFile(nextFile); onFile(nextFile); } },
    onDropRejected: () => { const message = kind === "photo" ? "请选择 JPEG、PNG 或 WebP 图片。" : "请选择 MP4 视频。"; onError?.(message); },
  });

  function clearFile() {
    setFile(null);
    onClear();
  }

  return (
    <div className="grid min-w-0 max-w-full gap-3">
      <div {...getRootProps()} className="grid min-h-40 min-w-0 max-w-full place-items-center rounded-lg border border-dashed bg-muted/20 p-4 text-center">
        <input {...getInputProps()} />
        <div className="grid gap-2">
          <p className="text-sm font-medium">{isDragActive ? "松开以添加文件" : kind === "photo" ? "拖入摄影图片" : "拖入短片文件"}</p>
          <p className="text-xs text-muted-foreground">或从设备中选择文件</p>
          <Button type="button" variant="outline" onClick={open}>选择文件</Button>
        </div>
      </div>
      {previewUrl && file ? (
        <div className="grid min-w-0 max-w-full gap-3 rounded-lg border bg-card p-3">
          {kind === "photo" ? <PhotoLightbox src={previewUrl} alt={file.name} className="max-h-72 w-full object-contain" /> : <video aria-label={file.name} className="aspect-video w-full bg-black object-contain" controls playsInline preload="metadata" src={previewUrl} />}
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="min-w-0 truncate">{file.name}</span>
            <Button size="sm" type="button" variant="ghost" onClick={clearFile}>移除</Button>
          </div>
        </div>
      ) : null}
      {onError ? <Alert className="hidden" variant="destructive"><AlertTitle>文件错误</AlertTitle><AlertDescription /></Alert> : null}
    </div>
  );
}
