"use client";

import { useEffect, useRef, useState } from "react";
import { useDropzone, type Accept } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { PhotoLightbox } from "@/features/media/components/photo-lightbox";
import { uploadContentMedia } from "@/features/admin/components/media-upload";

type StoryImageItem = {
  objectKey: string;
  previewUrl: string | null;
  isObjectUrl: boolean;
  fileName: string;
};

type InitialStoryImage = {
  objectKey: string;
  imageUrl?: string | null;
  sortOrder?: number;
};

const imageAccept: Accept = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

export function StoryImageUpload({
  initialImages = [],
  onPendingChange,
}: {
  initialImages?: InitialStoryImage[];
  onPendingChange?: (pending: boolean) => void;
}) {
  const [items, setItems] = useState<StoryImageItem[]>(() => initialImages.map((image) => ({
    objectKey: image.objectKey,
    previewUrl: image.imageUrl ?? null,
    isObjectUrl: false,
    fileName: image.objectKey.split("/").at(-1) ?? image.objectKey,
  })));
  const itemsRef = useRef(items);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: imageAccept,
    multiple: true,
    noClick: true,
    onDropAccepted: (files) => void addFiles(files),
    onDropRejected: () => setError("请选择 JPEG、PNG 或 WebP 图片。"),
  });

  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => onPendingChange?.(pending), [onPendingChange, pending]);
  useEffect(() => () => itemsRef.current.forEach((item) => { if (item.isObjectUrl && item.previewUrl) URL.revokeObjectURL(item.previewUrl); }), []);

  async function addFiles(files: File[]) {
    setError(null);
    setPending(true);
    const added: StoryImageItem[] = [];
    try {
      for (const file of files) {
        const objectKey = await uploadContentMedia(file, fetch, "story-image");
        added.push({ objectKey, previewUrl: URL.createObjectURL(file), isObjectUrl: true, fileName: file.name });
      }
      setItems((current) => [...current, ...added]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "图片上传失败，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  function removeItem(objectKey: string) {
    setItems((current) => {
      const removed = current.find((item) => item.objectKey === objectKey);
      if (removed?.isObjectUrl && removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((item) => item.objectKey !== objectKey);
    });
  }

  return (
    <div className="grid gap-3">
      <div {...getRootProps()} className="grid min-h-32 place-items-center rounded-lg border border-dashed bg-muted/20 p-4 text-center">
        <input {...getInputProps()} />
        <div className="grid gap-2">
          <p className="text-sm font-medium">{isDragActive ? "松开以添加图片" : "拖入故事图片"}</p>
          <Button type="button" variant="outline" onClick={open}>选择图片</Button>
        </div>
      </div>
      {items.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item, index) => <div className="grid gap-2 rounded-lg border bg-card p-2" key={item.objectKey}>
          {item.previewUrl ? <PhotoLightbox src={item.previewUrl} alt={`故事图片 ${index + 1}`} className="aspect-square w-full object-cover" /> : <div className="grid aspect-square place-items-center bg-muted text-center text-xs text-muted-foreground">已上传<br />{item.fileName}</div>}
          <input name="storyImageObjectKey" type="hidden" value={item.objectKey} />
          <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.objectKey)}>移除</Button>
        </div>)}
      </div> : null}
      {pending ? <p aria-live="polite" className="text-xs text-muted-foreground">正在上传图片...</p> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
