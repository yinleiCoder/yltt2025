"use client";

import { useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export function AvatarCropDialog({ file, onCancel, onConfirm }: { file: File | null; onCancel: () => void; onConfirm: (blob: Blob) => void }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setSourceUrl(null);
      return;
    }

    const nextSourceUrl = URL.createObjectURL(file);
    setSourceUrl(nextSourceUrl);
    return () => URL.revokeObjectURL(nextSourceUrl);
  }, [file]);

  async function confirmCrop() {
    if (!sourceUrl || !area) return;
    const blob = await cropImage(sourceUrl, area, rotation);
    onConfirm(blob);
  }

  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>调整头像</DialogTitle>
          <DialogDescription>拖动、缩放或旋转图片，确认后才会上传。</DialogDescription>
        </DialogHeader>
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          {sourceUrl ? <Cropper image={sourceUrl} crop={crop} zoom={zoom} rotation={rotation} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onRotationChange={setRotation} onCropComplete={(_, croppedAreaPixels) => setArea(croppedAreaPixels)} /> : null}
        </div>
        <div className="grid gap-3">
          <label className="text-sm font-medium" htmlFor="avatar-zoom">缩放</label>
          <Slider id="avatar-zoom" min={1} max={3} step={0.1} value={zoom} onValueChange={(value) => setZoom(typeof value === "number" ? value : value[0] ?? 1)} />
          <label className="text-sm font-medium" htmlFor="avatar-rotation">旋转角度</label>
          <Input id="avatar-rotation" max={180} min={-180} onChange={(event) => setRotation(Number(event.target.value) || 0)} type="number" value={rotation} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
          <Button type="button" onClick={() => void confirmCrop()}>使用此头像</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function cropImage(sourceUrl: string, area: Area, rotation: number): Promise<Blob> {
  const image = await loadImage(sourceUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建头像裁剪画布。");
  canvas.width = area.width;
  canvas.height = area.height;
  context.translate(area.width / 2, area.height / 2);
  context.rotate((rotation * Math.PI) / 180);
  context.translate(-area.width / 2, -area.height / 2);
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("无法生成头像裁剪结果。")), "image/webp", 0.9));
}

function loadImage(sourceUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("无法读取头像图片。"));
    image.src = sourceUrl;
  });
}
