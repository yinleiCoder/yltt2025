"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { readPhotoExif } from "@/features/media/client/read-photo-exif";
import {
  hasPhotoGps,
  mapPhotoExifToFormValues,
  type PhotoExifFormValues,
} from "@/features/media/domain/photo-exif-form";

export type ContentFormActionState = {
  error?: string;
  success?: string;
  warning?: string;
  publicPath?: string;
};

export type ContentFormInitialValues = {
  id?: string;
  kind: "photo" | "video" | "story";
  title?: string;
  slug?: string;
  excerpt?: string | null;
  markdownBody?: string | null;
  objectKey?: string | null;
  isFeatured?: boolean;
  publishedAt?: string | null;
  locationVisibility?: "precise" | "city" | "hidden";
  locationLabel?: string | null;
  city?: string | null;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photo?: {
    objectKey: string;
    cameraMake: string | null;
    cameraModel: string | null;
    lens: string | null;
    aperture: number | null;
    shutterSpeed: string | null;
    iso: number | null;
    focalLengthMm: number | null;
    capturedAt: string | null;
  } | null;
};

type ContentFormAction = (
  previousState: ContentFormActionState,
  formData: FormData,
) => Promise<ContentFormActionState>;

type ContentFormProps = {
  action: ContentFormAction;
  initialValues?: ContentFormInitialValues;
  mode: "create" | "edit";
};

export function ContentForm({ action, initialValues, mode }: ContentFormProps) {
  const [state, submitAction, isPending] = useActionState(action, {});
  const [kind, setKind] = useState<ContentFormInitialValues["kind"]>(initialValues?.kind ?? "photo");
  const [locationVisibility, setLocationVisibility] = useState<NonNullable<ContentFormInitialValues["locationVisibility"]>>(initialValues?.locationVisibility ?? "hidden");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [exifError, setExifError] = useState<string | null>(null);
  const [exifStatus, setExifStatus] = useState<string | null>(null);
  const [photoValues, setPhotoValues] = useState<PhotoExifFormValues>(() => mapInitialPhotoValues(initialValues));
  const [isUploading, startUpload] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();
  const isEdit = mode === "edit";

  function updatePhotoValue(field: keyof PhotoExifFormValues, value: string) {
    setPhotoValues((current) => ({ ...current, [field]: value }));
  }

  async function handleMediaChange(file: File | null) {
    setMediaFile(file);
    setExifError(null);
    setExifStatus(null);

    if (!file || kind !== "photo") return;

    try {
      const exif = await readPhotoExif(file);
      setPhotoValues(mapPhotoExifToFormValues(exif));
      if (hasPhotoGps(exif)) {
        setLocationVisibility("precise");
        setExifStatus("已读取照片参数和 GPS 坐标。请确认城市、地区与地点标签后再提交。");
      } else {
        setExifStatus("已读取照片参数。图片未包含 GPS 坐标，请确认地点隐私级别。");
      }
    } catch (error) {
      setExifError(error instanceof Error ? error.message : "无法读取这张照片的 EXIF 信息。");
    }
  }

  function handleKindChange(nextKind: ContentFormInitialValues["kind"]) {
    setKind(nextKind);
    if (nextKind === "story") {
      setMediaFile(null);
      setLocationVisibility("hidden");
    }
  }

  function uploadAndSubmit(formData: FormData) {
    startUpload(async () => {
      try {
        setUploadError(null);
        if (kind !== "story" && mediaFile) {
          const signatureResponse = await fetch("/api/admin/media/upload-signature", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: mediaFile.name,
              mimeType: mediaFile.type,
              size: mediaFile.size,
            }),
          });
          const signature = await signatureResponse.json();
          if (!signatureResponse.ok) throw new Error(signature.error ?? "Could not prepare the media upload.");

          const uploadResponse = await fetch(signature.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": mediaFile.type },
            body: mediaFile,
          });
          if (!uploadResponse.ok) throw new Error("The media upload was rejected by OSS.");
          formData.set("objectKey", signature.objectKey);
        }

        if (kind !== "story" && !formData.get("objectKey")) {
          throw new Error("Choose a media file before creating this item.");
        }

        startSubmit(() => submitAction(formData));
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Could not upload media.");
      }
    });
  }

  return (
    <form className="grid max-w-2xl gap-5 py-10" onSubmit={(event) => { event.preventDefault(); uploadAndSubmit(new FormData(event.currentTarget)); }}>
      {initialValues?.id ? <input name="id" type="hidden" value={initialValues.id} /> : null}
      {isEdit ? <input name="kind" type="hidden" value={kind} /> : null}
      <div className="grid gap-2">
        <label htmlFor="kind">Kind</label>
        <select className="h-9 rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60" disabled={isEdit} id="kind" name={isEdit ? undefined : "kind"} onChange={(event) => handleKindChange(event.target.value as ContentFormInitialValues["kind"])} value={kind}>
          <option value="photo">Photography</option>
          <option value="video">Short video</option>
          <option value="story">Love story</option>
        </select>
      </div>
      <div className="grid gap-2"><label htmlFor="title">Title</label><Input defaultValue={initialValues?.title ?? ""} id="title" name="title" required /></div>
      <div className="grid gap-2"><label htmlFor="slug">Slug</label><Input defaultValue={initialValues?.slug ?? ""} id="slug" name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></div>
      <div className="grid gap-2"><label htmlFor="excerpt">Excerpt</label><Textarea defaultValue={initialValues?.excerpt ?? ""} id="excerpt" name="excerpt" /></div>
      {kind === "story" ? <div className="grid gap-2"><label htmlFor="markdownBody">Markdown</label><Textarea className="min-h-48" defaultValue={initialValues?.markdownBody ?? ""} id="markdownBody" name="markdownBody" /></div> : null}
      {kind !== "story" ? <div className="grid gap-2"><label htmlFor="media">{isEdit ? "Replace media (optional)" : kind === "photo" ? "Photo" : "H.264/AAC MP4"}</label><Input accept={kind === "photo" ? "image/jpeg,image/png,image/webp" : "video/mp4"} id="media" onChange={(event) => void handleMediaChange(event.target.files?.[0] ?? null)} type="file" /></div> : null}
      {kind === "photo" ? <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2"><label htmlFor="aperture">Aperture (f-stop)</label><Input id="aperture" name="aperture" onChange={(event) => updatePhotoValue("aperture", event.target.value)} placeholder="e.g. 2.8" type="number" step="0.1" value={photoValues.aperture ?? ""} /></div>
        <div className="grid gap-2"><label htmlFor="shutterSpeed">Shutter speed</label><Input id="shutterSpeed" name="shutterSpeed" onChange={(event) => updatePhotoValue("shutterSpeed", event.target.value)} placeholder="e.g. 1/250" value={photoValues.shutterSpeed ?? ""} /></div>
        <div className="grid gap-2"><label htmlFor="iso">ISO</label><Input id="iso" name="iso" onChange={(event) => updatePhotoValue("iso", event.target.value)} placeholder="e.g. 400" type="number" value={photoValues.iso ?? ""} /></div>
        <div className="grid gap-2"><label htmlFor="focalLengthMm">Focal length (mm)</label><Input id="focalLengthMm" name="focalLengthMm" onChange={(event) => updatePhotoValue("focalLengthMm", event.target.value)} placeholder="e.g. 35" type="number" step="0.1" value={photoValues.focalLengthMm ?? ""} /></div>
        <div className="grid gap-2"><label htmlFor="cameraMake">Camera make</label><Input id="cameraMake" name="cameraMake" onChange={(event) => updatePhotoValue("cameraMake", event.target.value)} placeholder="e.g. Canon" value={photoValues.cameraMake ?? ""} /></div>
        <div className="grid gap-2"><label htmlFor="cameraModel">Camera model</label><Input id="cameraModel" name="cameraModel" onChange={(event) => updatePhotoValue("cameraModel", event.target.value)} placeholder="e.g. EOS R5" value={photoValues.cameraModel ?? ""} /></div>
        <div className="col-span-2 grid gap-2"><label htmlFor="lens">Lens</label><Input id="lens" name="lens" onChange={(event) => updatePhotoValue("lens", event.target.value)} placeholder="e.g. RF 35mm F1.8" value={photoValues.lens ?? ""} /></div>
      </div> : null}
      {kind === "photo" ? <div className="grid gap-2"><label htmlFor="capturedAt">Captured at (ISO 8601)</label><Input id="capturedAt" name="capturedAt" onChange={(event) => updatePhotoValue("capturedAt", event.target.value)} placeholder="e.g. 2026-08-20T08:30:00Z" type="text" value={photoValues.capturedAt ?? ""} /></div> : null}
      <div className="grid gap-3 border-t pt-5">
        <label htmlFor="locationVisibility">Location visibility</label>
        <select className="h-9 rounded-md border bg-background px-3 text-sm" id="locationVisibility" name="locationVisibility" onChange={(event) => setLocationVisibility(event.target.value as NonNullable<ContentFormInitialValues["locationVisibility"]>)} value={locationVisibility}>
          <option value="hidden">Hidden</option>
          <option value="city">City / region only</option>
          <option value="precise">Precise location</option>
        </select>
        {locationVisibility !== "hidden" ? <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2"><label htmlFor="city">City</label><Input defaultValue={initialValues?.city ?? ""} id="city" name="city" placeholder="City" required /></div>
          <div className="grid gap-2"><label htmlFor="region">Region</label><Input defaultValue={initialValues?.region ?? ""} id="region" name="region" placeholder="Region" required /></div>
          {locationVisibility === "precise" ? <>
            <div className="col-span-2 grid gap-2"><label htmlFor="locationLabel">Location label</label><Input defaultValue={initialValues?.locationLabel ?? ""} id="locationLabel" name="locationLabel" placeholder="Location label" required /></div>
            <div className="grid gap-2"><label htmlFor="latitude">Latitude</label><Input id="latitude" name="latitude" onChange={(event) => updatePhotoValue("latitude", event.target.value)} placeholder="e.g. 30.123456" type="number" step="0.000001" required value={photoValues.latitude ?? String(initialValues?.latitude ?? "")} /></div>
            <div className="grid gap-2"><label htmlFor="longitude">Longitude</label><Input id="longitude" name="longitude" onChange={(event) => updatePhotoValue("longitude", event.target.value)} placeholder="e.g. 104.123456" type="number" step="0.000001" required value={photoValues.longitude ?? String(initialValues?.longitude ?? "")} /></div>
          </> : null}
        </div> : null}
      </div>
      <input name="objectKey" type="hidden" value={initialValues?.objectKey ?? initialValues?.photo?.objectKey ?? ""} />
      <label className="flex items-center gap-2 text-sm"><input defaultChecked={Boolean(initialValues?.publishedAt)} name="publishNow" type="checkbox" /> Publish now</label>
      <label className="flex items-center gap-2 text-sm"><input defaultChecked={Boolean(initialValues?.isFeatured)} name="isFeatured" type="checkbox" /> Feature on the home contact sheet</label>
      {state.error ? <p className="text-sm text-destructive" role="alert">{state.error}</p> : null}
      {uploadError ? <p className="text-sm text-destructive" role="alert">{uploadError}</p> : null}
      {exifError ? <p className="text-sm text-destructive" role="alert">{exifError}</p> : null}
      {exifStatus ? <p aria-live="polite" className="text-sm text-muted-foreground">{exifStatus}</p> : null}
      {state.warning ? <p aria-live="polite" className="text-sm text-amber-700 dark:text-amber-300">{state.warning}</p> : null}
      {state.success ? <p aria-live="polite" className="text-sm">{state.success}{state.publicPath ? <> {" "}<Link className="underline underline-offset-4" href={state.publicPath}>Open public page</Link></> : null}</p> : null}
      <Button disabled={isPending || isUploading || isSubmitting} type="submit">{isUploading ? "Uploading" : isPending || isSubmitting ? isEdit ? "Updating" : "Creating" : isEdit ? "Save changes" : "Create content"}</Button>
    </form>
  );
}

function mapInitialPhotoValues(initialValues?: ContentFormInitialValues): PhotoExifFormValues {
  if (!initialValues?.photo) return {};
  return mapPhotoExifToFormValues({
    aperture: initialValues.photo.aperture ?? undefined,
    shutterSpeed: initialValues.photo.shutterSpeed ?? undefined,
    iso: initialValues.photo.iso ?? undefined,
    focalLengthMm: initialValues.photo.focalLengthMm ?? undefined,
    cameraMake: initialValues.photo.cameraMake ?? undefined,
    cameraModel: initialValues.photo.cameraModel ?? undefined,
    lens: initialValues.photo.lens ?? undefined,
    capturedAt: initialValues.photo.capturedAt ?? undefined,
    latitude: initialValues.latitude ?? undefined,
    longitude: initialValues.longitude ?? undefined,
  });
}
