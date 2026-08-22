"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ContentMediaUploadError,
  readContentPhotoExif,
  uploadContentMedia,
} from "@/features/admin/components/media-upload";
import { readPhotoExif } from "@/features/media/client/read-photo-exif";
import {
  hasPhotoGps,
  mapPhotoExifToFormValues,
  type PhotoExifFormValues,
} from "@/features/media/domain/photo-exif-form";
import { MediaFilePreview } from "@/features/media/components/media-file-preview";
import { StoryMarkdownEditor } from "@/features/admin/components/story-markdown-editor";
import { getCurrentLocation, reverseGeocode } from "@/features/media/client/location";

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
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [locationValues, setLocationValues] = useState({
    label: initialValues?.locationLabel ?? "",
    city: initialValues?.city ?? "",
    region: initialValues?.region ?? "",
  });
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
    setLocationStatus(null);

    if (!file || kind !== "photo") return;

    const result = await readContentPhotoExif(file, readPhotoExif);
    if (!result.ok) {
      setExifError(result.error);
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
    } catch {
      setExifError("无法读取这张照片的 EXIF 信息。");
    }
  }

  async function useCurrentLocation() {
    setLocationStatus("正在获取当前位置...");
    try {
      const coords = await getCurrentLocation();
      updatePhotoValue("latitude", String(coords.latitude));
      updatePhotoValue("longitude", String(coords.longitude));
      setLocationVisibility("precise");
      const place = await reverseGeocode(coords.latitude, coords.longitude);
      if (place) setLocationValues((current) => ({ label: place.label ?? current.label, city: place.city ?? current.city, region: place.region ?? current.region }));
      setLocationStatus(place ? "已获取当前位置并解析地点，请确认后再提交。" : "已获取坐标，但地点名称解析失败，请手动填写。");
    } catch {
      setLocationStatus("无法获取当前位置，请检查浏览器权限或手动填写地点。");
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
          formData.set("objectKey", await uploadContentMedia(mediaFile));
        }

        if (kind !== "story" && !formData.get("objectKey")) {
          throw new Error("创建此内容前请先选择媒体文件。");
        }

        startSubmit(() => submitAction(formData));
      } catch (error) {
        setUploadError(
          error instanceof ContentMediaUploadError
            ? error.message
            : "媒体上传失败，请稍后重试。",
        );
      }
    });
  }

  return (
    <form className="grid max-w-3xl gap-6 py-8" onSubmit={(event) => { event.preventDefault(); uploadAndSubmit(new FormData(event.currentTarget)); }}>
      {initialValues?.id ? <input name="id" type="hidden" value={initialValues.id} /> : null}
      {isEdit ? <input name="kind" type="hidden" value={kind} /> : null}
      <FieldGroup className="grid gap-5 md:grid-cols-2">
        <Field><FieldLabel htmlFor="kind">内容类型</FieldLabel><Select disabled={isEdit} name={isEdit ? undefined : "kind"} value={kind} onValueChange={(value) => handleKindChange(value as ContentFormInitialValues["kind"])}><SelectTrigger id="kind"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="photo">摄影</SelectItem><SelectItem value="video">短片</SelectItem><SelectItem value="story">故事</SelectItem></SelectContent></Select></Field>
        <Field><FieldLabel htmlFor="title">标题</FieldLabel><Input defaultValue={initialValues?.title ?? ""} id="title" name="title" required /></Field>
        <Field><FieldLabel htmlFor="slug">系统网址标识</FieldLabel><FieldDescription>由系统自动生成，创建后保持不变。</FieldDescription><Input className="font-mono text-xs" defaultValue={initialValues?.slug ?? "创建后生成"} disabled={mode === "create" || !initialValues?.slug} id="slug" name={mode === "edit" ? undefined : "slug"} readOnly={mode === "create"} /><input name={mode === "edit" ? "slug" : undefined} type="hidden" value={initialValues?.slug ?? ""} /></Field>
        <Field><FieldLabel htmlFor="excerpt">摘要</FieldLabel><Textarea defaultValue={initialValues?.excerpt ?? ""} id="excerpt" name="excerpt" /></Field>
      </FieldGroup>
      {kind === "story" ? <Field><FieldLabel>正文（Markdown）</FieldLabel><StoryMarkdownEditor defaultValue={initialValues?.markdownBody ?? ""} /></Field> : null}
      {kind !== "story" ? <Field><FieldLabel>{isEdit ? "替换媒体（可选）" : kind === "photo" ? "照片文件" : "短片文件"}</FieldLabel><FieldDescription>{kind === "photo" ? "选择后可点击预览并查看大图。" : "选择后可直接预览视频首帧和控制条。"}</FieldDescription><MediaFilePreview kind={kind} onFile={(file) => void handleMediaChange(file)} onClear={() => setMediaFile(null)} onError={setUploadError} /></Field> : null}
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
      <div className="grid gap-4 border-t pt-5">
        <Field><FieldLabel htmlFor="locationVisibility">地点公开范围</FieldLabel><Select name="locationVisibility" value={locationVisibility} onValueChange={(value) => setLocationVisibility(value as NonNullable<ContentFormInitialValues["locationVisibility"]>)}><SelectTrigger id="locationVisibility"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hidden">不公开</SelectItem><SelectItem value="city">仅城市和地区</SelectItem><SelectItem value="precise">公开精确地点</SelectItem></SelectContent></Select></Field>
        {locationVisibility !== "hidden" ? <Button className="w-fit" type="button" variant="outline" onClick={() => void useCurrentLocation()}>一键获取地理位置</Button> : null}
        {locationVisibility !== "hidden" ? <div className="grid gap-4 sm:grid-cols-2">
          <Field><FieldLabel htmlFor="city">城市</FieldLabel><Input value={locationValues.city} onChange={(event) => setLocationValues((current) => ({ ...current, city: event.target.value }))} id="city" name="city" placeholder="填写城市" required /></Field>
          <Field><FieldLabel htmlFor="region">地区</FieldLabel><Input value={locationValues.region} onChange={(event) => setLocationValues((current) => ({ ...current, region: event.target.value }))} id="region" name="region" placeholder="填写地区" required /></Field>
          {locationVisibility === "precise" ? <>
            <Field className="sm:col-span-2"><FieldLabel htmlFor="locationLabel">地点名称</FieldLabel><Input value={locationValues.label} onChange={(event) => setLocationValues((current) => ({ ...current, label: event.target.value }))} id="locationLabel" name="locationLabel" placeholder="填写地点名称" required /></Field>
            <div className="grid gap-2"><label htmlFor="latitude">纬度</label><Input id="latitude" name="latitude" onChange={(event) => updatePhotoValue("latitude", event.target.value)} placeholder="例如 30.123456" type="number" step="0.000001" required value={photoValues.latitude ?? String(initialValues?.latitude ?? "")} /></div>
            <div className="grid gap-2"><label htmlFor="longitude">经度</label><Input id="longitude" name="longitude" onChange={(event) => updatePhotoValue("longitude", event.target.value)} placeholder="例如 104.123456" type="number" step="0.000001" required value={photoValues.longitude ?? String(initialValues?.longitude ?? "")} /></div>
          </> : null}
        </div> : null}
        {locationStatus ? <Alert><AlertDescription>{locationStatus}</AlertDescription></Alert> : null}
      </div>
      <input name="objectKey" type="hidden" value={initialValues?.objectKey ?? initialValues?.photo?.objectKey ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2"><Field orientation="horizontal" className="items-center justify-between rounded-lg border px-3 py-2.5"><FieldLabel htmlFor="publishNow">立即发布</FieldLabel><Switch defaultChecked={Boolean(initialValues?.publishedAt)} id="publishNow" name="publishNow" /></Field><Field orientation="horizontal" className="items-center justify-between rounded-lg border px-3 py-2.5"><FieldLabel htmlFor="isFeatured">在首页精选展示</FieldLabel><Switch defaultChecked={Boolean(initialValues?.isFeatured)} id="isFeatured" name="isFeatured" /></Field></div>
      {state.error ? <p className="text-sm text-destructive" role="alert">{state.error}</p> : null}
      {uploadError ? <p className="text-sm text-destructive" role="alert">{uploadError}</p> : null}
      {exifError ? <p className="text-sm text-destructive" role="alert">{exifError}</p> : null}
      {exifStatus ? <p aria-live="polite" className="text-sm text-muted-foreground">{exifStatus}</p> : null}
      {state.warning ? <p aria-live="polite" className="text-sm text-muted-foreground">{state.warning}</p> : null}
      {state.success ? <p aria-live="polite" className="text-sm">{state.success}{state.publicPath ? <> {" "}<Link className="underline underline-offset-4" href={state.publicPath}>查看公开页面</Link></> : null}</p> : null}
      <Button disabled={isPending || isUploading || isSubmitting} type="submit">{isUploading ? "正在上传" : isPending || isSubmitting ? isEdit ? "正在更新" : "正在创建" : isEdit ? "保存修改" : "创建内容"}</Button>
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
