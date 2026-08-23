"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ContentMediaUploadError,
  readContentPhotoExif,
  uploadContentMedia,
  type UploadProgressHandler,
} from "@/features/admin/components/media-upload";
import { readPhotoExif } from "@/features/media/client/read-photo-exif";
import { readVideoMetadata, type VideoMetadata } from "@/features/media/client/read-video-metadata";
import {
  hasPhotoGps,
  mapPhotoExifToFormValues,
  type PhotoExifFormValues,
} from "@/features/media/domain/photo-exif-form";
import { MediaFilePreview } from "@/features/media/components/media-file-preview";
import { StoryImageUpload } from "@/features/admin/components/story-image-upload";
import { StoryMarkdownEditor } from "@/features/admin/components/story-markdown-editor";
import {
  CurrentLocationError,
  getCurrentLocation,
  getIpLocation,
  locationErrorMessage,
  reverseGeocode,
} from "@/features/media/client/location";
import { resolveCurrentLocation } from "@/features/media/client/location-flow";

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
  storyImages?: {
    objectKey: string;
    sortOrder: number;
    imageUrl?: string | null;
  }[];
  objectKey?: string | null;
  isFeatured?: boolean;
  publishedAt?: string | null;
  occurredAt?: string | null;
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
  video?: {
    objectKey: string;
    durationSeconds: number | null;
    width: number | null;
    height: number | null;
    codec: string;
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [exifError, setExifError] = useState<string | null>(null);
  const [exifStatus, setExifStatus] = useState<string | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(() => {
    const video = initialValues?.video;
    if (!video?.durationSeconds || !video.width || !video.height) return null;
    return { durationSeconds: video.durationSeconds, width: video.width, height: video.height };
  });
  const [videoMetadataStatus, setVideoMetadataStatus] = useState<string | null>(null);
  const [videoMetadataPending, setVideoMetadataPending] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [storyImagesPending, setStoryImagesPending] = useState(false);
  const [locationValues, setLocationValues] = useState({
    label: initialValues?.locationLabel ?? "",
    city: initialValues?.city ?? "",
    region: initialValues?.region ?? "",
  });
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [occurredAt, setOccurredAt] = useState(toDateInputValue(initialValues?.occurredAt));
  const [photoValues, setPhotoValues] = useState<PhotoExifFormValues>(() => mapInitialPhotoValues(initialValues));
  const [isUploading, startUpload] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();
  const isEdit = mode === "edit";

  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.warning) toast.warning(state.warning);
    if (state.error) toast.error(state.error);
  }, [state.error, state.success, state.warning]);

  function updatePhotoValue(field: keyof PhotoExifFormValues, value: string) {
    setPhotoValues((current) => ({ ...current, [field]: value }));
  }

  async function handleMediaChange(file: File | null) {
    setMediaFile(file);
    setExifError(null);
    setExifStatus(null);
    setLocationStatus(null);
    setVideoMetadata(null);
    setVideoMetadataStatus(null);
    setVideoMetadataPending(false);

    if (!file) return;

    if (kind === "video") {
      setVideoMetadataPending(true);
      try {
        setVideoMetadata(await readVideoMetadata(file));
        setVideoMetadataStatus("已读取视频时长和画面尺寸。");
      } catch {
        setVideoMetadataStatus("无法读取视频元数据，保存后将显示为空。");
      } finally {
        setVideoMetadataPending(false);
      }
      return;
    }

    const exifToastId = toast.loading("正在读取照片信息...");

    const result = await readContentPhotoExif(file, readPhotoExif);
    if (!result.ok) {
      setExifError(result.error);
      toast.error(result.error, { id: exifToastId });
      return;
    }

    try {
      const exif = result.exif;
      setPhotoValues(mapPhotoExifToFormValues(exif));
      if (hasPhotoGps(exif)) {
        setLocationVisibility("precise");
        const place = await reverseGeocode(exif.latitude!, exif.longitude!);
        if (place) {
          setLocationValues((current) => ({ label: place.label ?? current.label, city: place.city ?? current.city, region: place.region ?? current.region }));
          setLocationStatus("已根据照片 GPS 建议地点，请确认后再提交。");
        } else {
          setLocationStatus("已读取 GPS 坐标，但地点名称解析失败，请手动填写。");
        }
        setExifStatus("已读取照片参数和 GPS 坐标。");
      } else {
        setExifStatus("已读取照片参数。图片未包含 GPS 坐标，请确认地点隐私级别。");
      }
      toast.success("已读取照片信息。", { id: exifToastId });
    } catch {
      setExifError("无法读取这张照片的 EXIF 信息。");
      toast.error("无法读取这张照片的 EXIF 信息。", { id: exifToastId });
    }
  }

  async function useCurrentLocation() {
    if (isLocating) return;

    setIsLocating(true);
    setLocationStatus("正在获取当前位置...");
    const locationToastId = toast.loading("正在获取当前位置...");
    try {
      const resolution = await resolveCurrentLocation({ getPrecise: getCurrentLocation, getIp: getIpLocation });
      if (resolution.source === "precise") {
        updatePhotoValue("latitude", String(resolution.latitude));
        updatePhotoValue("longitude", String(resolution.longitude));
        setLocationVisibility("precise");
        const place = await reverseGeocode(resolution.latitude, resolution.longitude);
        if (place) {
          setLocationValues((current) => ({
            label: place.label ?? current.label,
            city: place.city ?? current.city,
            region: place.region ?? current.region,
          }));
        }
        setLocationStatus(place ? "已获取当前位置并解析地点，请确认后再提交。" : "已获取坐标，但地点名称解析失败，请手动填写。");
        toast.success("位置坐标已获取，请确认地点。", { id: locationToastId });
      } else if (resolution.source === "ip") {
        setLocationVisibility("city");
        updatePhotoValue("latitude", "");
        updatePhotoValue("longitude", "");
        setLocationValues((current) => ({
          ...current,
          city: resolution.city ?? current.city,
          region: resolution.region ?? current.region,
        }));
        setLocationStatus("浏览器精确定位不可用，已根据网络位置填写城市和地区，请确认后再提交。");
        toast.success("已根据网络位置填写城市和地区。", { id: locationToastId });
      } else {
        setLocationStatus(`${locationErrorMessage(new CurrentLocationError(resolution.preciseError))} 当前未能自动填充，请手动填写地点。`);
        toast.error("无法自动获取位置，请手动填写地点。", { id: locationToastId });
      }
    } finally {
      setIsLocating(false);
    }
  }

  function handleKindChange(nextKind: ContentFormInitialValues["kind"]) {
    setKind(nextKind);
    if (nextKind === "story") {
      setMediaFile(null);
    }
  }

  function uploadAndSubmit(formData: FormData) {
    const uploadToastId = toast.loading("正在处理媒体并保存内容...");
    startUpload(async () => {
      try {
        setUploadError(null);
        if (kind !== "story" && mediaFile) {
          const onProgress: UploadProgressHandler = (value) => setUploadProgress(value);
          setUploadProgress(0);
          const uploadedObjectKey = await uploadContentMedia(mediaFile, fetch, "media", onProgress);
          formData.set("objectKey", uploadedObjectKey);
        }

        if (kind !== "story" && !formData.get("objectKey")) {
          throw new Error("创建此内容前请先选择媒体文件。");
        }

        startSubmit(() => submitAction(formData));
        toast.success("媒体处理完成，正在保存内容。", { id: uploadToastId });
      } catch (error) {
        const message = error instanceof ContentMediaUploadError ? error.message : "媒体上传失败，请稍后重试。";
        setUploadError(message);
        toast.error(message, { id: uploadToastId });
      } finally {
        setUploadProgress(null);
      }
    });
  }

  return (
    <form aria-busy={isPending || isUploading || isSubmitting} className="grid max-w-3xl gap-6 py-8" onSubmit={(event) => { event.preventDefault(); uploadAndSubmit(new FormData(event.currentTarget)); }}>
      {initialValues?.id ? <input name="id" type="hidden" value={initialValues.id} /> : null}
      {isEdit ? <input name="kind" type="hidden" value={kind} /> : null}
      {kind === "story" ? <section aria-labelledby="story-settings-title" className="grid gap-4 rounded-lg border bg-muted/10 p-4"><div className="grid gap-1"><h2 className="text-sm font-medium" id="story-settings-title">故事设置</h2><FieldDescription>选择故事发生日期，公开故事会按这个日期从近到远排列。</FieldDescription></div><Field><FieldLabel htmlFor="occurredAt">故事发生日期</FieldLabel><Input id="occurredAt" name="occurredAt" onChange={(event) => setOccurredAt(event.target.value)} type="date" value={occurredAt} required /></Field></section> : null}
      <FieldGroup className="grid gap-5 md:grid-cols-2">
        <Field><FieldLabel htmlFor="kind">内容类型</FieldLabel><Select disabled={isEdit} name={isEdit ? undefined : "kind"} value={kind} onValueChange={(value) => handleKindChange(value as ContentFormInitialValues["kind"])}><SelectTrigger id="kind"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="photo">摄影</SelectItem><SelectItem value="video">短片</SelectItem><SelectItem value="story">故事</SelectItem></SelectContent></Select></Field>
        <Field><FieldLabel htmlFor="title">标题</FieldLabel><Input id="title" name="title" onChange={(event) => setTitle(event.target.value)} required value={title} /></Field>
        <Field><FieldLabel htmlFor="slug">系统网址标识</FieldLabel><FieldDescription>由系统自动生成，创建后保持不变。</FieldDescription><Input className="font-mono text-xs" disabled={mode === "create" || !initialValues?.slug} id="slug" name={mode === "edit" ? undefined : "slug"} readOnly={mode === "create"} value={initialValues?.slug ?? "创建后生成"} /><input name={mode === "edit" ? "slug" : undefined} type="hidden" value={initialValues?.slug ?? ""} /></Field>
        <Field><FieldLabel htmlFor="excerpt">摘要</FieldLabel><Textarea defaultValue={initialValues?.excerpt ?? ""} id="excerpt" name="excerpt" /></Field>
      </FieldGroup>
      {kind === "story" ? <>
        <Field><FieldLabel>正文（Markdown）</FieldLabel><StoryMarkdownEditor defaultValue={initialValues?.markdownBody ?? ""} /></Field>
        <section aria-labelledby="story-image-gallery-label" className="grid gap-3 rounded-lg border bg-muted/10 p-4" data-testid="story-image-gallery-upload">
          <div className="grid gap-1">
            <h2 className="text-sm font-medium" id="story-image-gallery-label">文后图集</h2>
            <FieldDescription>可一次选择多张图片，保存后将显示在故事正文之后。</FieldDescription>
          </div>
          <StoryImageUpload initialImages={initialValues?.storyImages ?? []} onPendingChange={setStoryImagesPending} />
        </section>
      </> : null}
      {kind !== "story" ? <Field><FieldLabel>{isEdit ? "替换媒体（可选）" : kind === "photo" ? "照片文件" : "短片文件"}</FieldLabel><FieldDescription>{kind === "photo" ? "支持 JPEG、PNG、WebP、HEIC、HEIF，单个文件不超过 200 MB；Live Photo 的静态照片可直接上传。" : "支持 MP4、MOV、M4V，单个文件不超过 2 GB，上传后会自动转换为网页兼容视频。"}</FieldDescription><MediaFilePreview kind={kind} onFile={(file) => void handleMediaChange(file)} onClear={() => { setMediaFile(null); setVideoMetadata(null); setVideoMetadataStatus(null); }} onError={setUploadError} />{uploadProgress !== null ? <Progress aria-label="媒体处理和上传进度" value={uploadProgress}><ProgressLabel>{uploadProgress < 35 ? "正在转换媒体" : "正在上传媒体"}</ProgressLabel><ProgressValue /></Progress> : null}</Field> : null}
      {kind === "photo" ? <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2"><label htmlFor="aperture">光圈（f 值）</label><Input id="aperture" name="aperture" onChange={(event) => updatePhotoValue("aperture", event.target.value)} placeholder="例如 2.8" type="number" step="0.1" value={photoValues.aperture ?? ""} /></div>
        <div className="grid gap-2"><label htmlFor="shutterSpeed">快门速度</label><Input id="shutterSpeed" name="shutterSpeed" onChange={(event) => updatePhotoValue("shutterSpeed", event.target.value)} placeholder="例如 1/250" value={photoValues.shutterSpeed ?? ""} /></div>
        <div className="grid gap-2"><label htmlFor="iso">ISO</label><Input id="iso" name="iso" onChange={(event) => updatePhotoValue("iso", event.target.value)} placeholder="例如 400" type="number" value={photoValues.iso ?? ""} /></div>
        <div className="grid gap-2"><label htmlFor="focalLengthMm">焦距（毫米）</label><Input id="focalLengthMm" name="focalLengthMm" onChange={(event) => updatePhotoValue("focalLengthMm", event.target.value)} placeholder="例如 35" type="number" step="0.1" value={photoValues.focalLengthMm ?? ""} /></div>
        <div className="grid gap-2"><label htmlFor="cameraMake">相机品牌</label><Input id="cameraMake" name="cameraMake" onChange={(event) => updatePhotoValue("cameraMake", event.target.value)} placeholder="例如 Canon" value={photoValues.cameraMake ?? ""} /></div>
        <div className="grid gap-2"><label htmlFor="cameraModel">相机型号</label><Input id="cameraModel" name="cameraModel" onChange={(event) => updatePhotoValue("cameraModel", event.target.value)} placeholder="例如 EOS R5" value={photoValues.cameraModel ?? ""} /></div>
        <div className="grid gap-2 sm:col-span-2"><label htmlFor="lens">镜头</label><Input id="lens" name="lens" onChange={(event) => updatePhotoValue("lens", event.target.value)} placeholder="例如 RF 35mm F1.8" value={photoValues.lens ?? ""} /></div>
      </div> : null}
      {kind === "photo" ? <div className="grid gap-2"><label htmlFor="capturedAt">拍摄时间（ISO 8601）</label><Input id="capturedAt" name="capturedAt" onChange={(event) => updatePhotoValue("capturedAt", event.target.value)} placeholder="例如 2026-08-20T08:30:00Z" type="text" value={photoValues.capturedAt ?? ""} /></div> : null}
      {kind === "video" && videoMetadata ? <div className="grid gap-2"><p className="text-sm text-muted-foreground">视频信息：{videoMetadata.durationSeconds} 秒 · {videoMetadata.width} × {videoMetadata.height}</p><input name="durationSeconds" type="hidden" value={videoMetadata.durationSeconds} /><input name="width" type="hidden" value={videoMetadata.width} /><input name="height" type="hidden" value={videoMetadata.height} /></div> : null}
      {videoMetadataStatus ? <p aria-live="polite" className="text-sm text-muted-foreground">{videoMetadataStatus}</p> : null}
      <div className="grid gap-4 border-t pt-5">
        <Field><FieldLabel htmlFor="locationVisibility">地点公开范围</FieldLabel><Select name="locationVisibility" value={locationVisibility} onValueChange={(value) => setLocationVisibility(value as NonNullable<ContentFormInitialValues["locationVisibility"]>)}><SelectTrigger id="locationVisibility"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hidden">不公开</SelectItem><SelectItem value="city">仅城市和地区</SelectItem><SelectItem value="precise">公开精确地点</SelectItem></SelectContent></Select></Field>
        {locationVisibility !== "hidden" ? <Button className="w-fit" disabled={isLocating} type="button" variant="outline" onClick={() => void useCurrentLocation()}>{isLocating ? "正在获取位置" : "一键获取地理位置"}</Button> : null}
        {locationVisibility !== "hidden" ? <div className="grid gap-4 sm:grid-cols-2">
          <Field><FieldLabel htmlFor="city">城市</FieldLabel><Input value={locationValues.city} onChange={(event) => setLocationValues((current) => ({ ...current, city: event.target.value }))} id="city" name="city" placeholder="填写城市" required /></Field>
          <Field><FieldLabel htmlFor="region">地区</FieldLabel><Input value={locationValues.region} onChange={(event) => setLocationValues((current) => ({ ...current, region: event.target.value }))} id="region" name="region" placeholder="填写地区" required /></Field>
          {locationVisibility === "precise" ? <>
            <Field className="sm:col-span-2"><FieldLabel htmlFor="locationLabel">地点名称</FieldLabel><Input value={locationValues.label} onChange={(event) => setLocationValues((current) => ({ ...current, label: event.target.value }))} id="locationLabel" name="locationLabel" placeholder="填写地点名称" required /></Field>
            <div className="grid gap-2"><label htmlFor="latitude">纬度</label><Input id="latitude" name="latitude" onChange={(event) => updatePhotoValue("latitude", event.target.value)} placeholder="例如 30.123456" type="number" step="0.000001" required value={photoValues.latitude ?? String(initialValues?.latitude ?? "")} /></div>
            <div className="grid gap-2"><label htmlFor="longitude">经度</label><Input id="longitude" name="longitude" onChange={(event) => updatePhotoValue("longitude", event.target.value)} placeholder="例如 104.123456" type="number" step="0.000001" required value={photoValues.longitude ?? String(initialValues?.longitude ?? "")} /></div>
          </> : null}
        </div> : null}
        {locationStatus ? <Alert aria-live="polite"><AlertDescription>{locationStatus}</AlertDescription></Alert> : null}
      </div>
      <input name="objectKey" type="hidden" value={initialValues?.objectKey ?? initialValues?.photo?.objectKey ?? initialValues?.video?.objectKey ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2"><Field orientation="horizontal" className="items-center justify-between rounded-lg border px-3 py-2.5"><FieldLabel htmlFor="publishNow">立即发布</FieldLabel><Switch defaultChecked={Boolean(initialValues?.publishedAt)} id="publishNow" name="publishNow" /></Field><Field orientation="horizontal" className="items-center justify-between rounded-lg border px-3 py-2.5"><FieldLabel htmlFor="isFeatured">在首页精选展示</FieldLabel><Switch defaultChecked={Boolean(initialValues?.isFeatured)} id="isFeatured" name="isFeatured" /></Field></div>
      {state.error ? <p className="text-sm text-destructive" role="alert">{state.error}</p> : null}
      {uploadError ? <p className="text-sm text-destructive" role="alert">{uploadError}</p> : null}
      {exifError ? <p className="text-sm text-destructive" role="alert">{exifError}</p> : null}
      {exifStatus ? <p aria-live="polite" className="text-sm text-muted-foreground">{exifStatus}</p> : null}
      {state.warning ? <p aria-live="polite" className="text-sm text-muted-foreground">{state.warning}</p> : null}
      {state.success ? <p aria-live="polite" className="text-sm">{state.success}{state.publicPath ? <> {" "}<Link className="underline underline-offset-4" href={state.publicPath}>查看公开页面</Link></> : null}</p> : null}
      <Button disabled={isPending || isUploading || isSubmitting || storyImagesPending || videoMetadataPending} type="submit">{videoMetadataPending ? "正在读取视频信息" : isUploading ? "正在上传" : isPending || isSubmitting ? isEdit ? "正在更新" : "正在创建" : isEdit ? "保存修改" : "创建内容"}</Button>
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

function toDateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}
