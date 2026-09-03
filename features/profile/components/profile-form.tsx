"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { LoaderCircleIcon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AvatarCropDialog } from "@/features/profile/components/avatar-crop-dialog";
import { updateProfileAction, type ProfileMutationState } from "@/features/profile/server/actions";
import type { ProfileGender } from "@/features/profile/domain/profile-schema";
import {
  validateProfileFormValues,
  type ProfileFormFieldErrors,
} from "@/features/profile/domain/profile-form-validation";
import {
  changeAvatarSelection,
  type AvatarSelection,
} from "@/features/profile/components/avatar-selection";

const avatarPreparationError = "头像上传准备失败，请稍后重试。";
const verifiedAvatarUploadErrors = new Set([
  "请先登录后再上传头像。",
  "上传请求格式不正确。",
  "头像仅支持 JPEG、PNG 或 WebP 图片。",
  "头像文件不能超过 5 MB。",
  "无法创建头像上传地址。",
]);
const initialState: ProfileMutationState = {};

type ProfileFormValues = {
  avatarUrl: string | null;
  displayName: string | null;
  email: string | null;
  realName: string | null;
  phone: string | null;
  address: string | null;
  birthDate: string | null;
  gender: ProfileGender | null;
  publicGender: boolean;
  publicRealName: boolean;
  publicPhone: boolean;
  publicAddress: boolean;
  publicBirthDate: boolean;
  publicEmail: boolean;
};

type AvatarUploadSignature = {
  objectKey: string;
  uploadUrl: string;
  fields: Record<string, string>;
};

class AvatarUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvatarUploadError";
  }
}

export function ProfileForm({ initialValues }: { initialValues: ProfileFormValues }) {
  const [state, submitAction, isPending] = useActionState(updateProfileAction, initialState);
  const [avatarSelection, setAvatarSelection] = useState<AvatarSelection>({
    file: null,
    objectKey: null,
    previewObjectUrl: null,
    previewUrl: initialValues.avatarUrl,
  });
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState<number | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfileFormFieldErrors>({});
  const [isSubmissionLocked, setIsSubmissionLocked] = useState(false);
  const [isUploading, startUpload] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();
  const previewObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state.error, state.success]);

  useEffect(() => () => revokeAvatarPreview(previewObjectUrlRef), []);

  function handleAvatarChange(file: File | null) {
    const transition = changeAvatarSelection({
      current: avatarSelection,
      file,
      initialAvatarUrl: initialValues.avatarUrl,
      createPreviewUrl: URL.createObjectURL,
      revokePreviewUrl: URL.revokeObjectURL,
    });

    if (transition.kind === "invalid") {
      setAvatarError(transition.error);
      return;
    }

    previewObjectUrlRef.current = transition.selection.previewObjectUrl;
    setAvatarSelection(transition.selection);
    setAvatarError(null);
  }

  function handleCropConfirm(blob: Blob) {
    const croppedFile = new File([blob], "avatar.webp", { type: blob.type || "image/webp" });
    setCropFile(null);
    handleAvatarChange(croppedFile);
  }

  function handleSubmit(formData: FormData) {
    if (isSaving) return;

    const validationErrors = validateProfileFormValues({
      displayName: formValue(formData, "displayName"),
      realName: formValue(formData, "realName"),
      phone: formValue(formData, "phone"),
      address: formValue(formData, "address"),
      birthDate: formValue(formData, "birthDate"),
      gender: formValue(formData, "gender"),
    });
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const submittedFormData = cloneFormData(formData);
    const selectedAvatarFile = avatarSelection.file;
    const existingAvatarObjectKey = avatarSelection.objectKey;
    setIsSubmissionLocked(true);

    startUpload(async () => {
      try {
        setAvatarError(null);
        let objectKey = existingAvatarObjectKey;

        if (selectedAvatarFile) {
          setAvatarUploadProgress(0);
          objectKey = await uploadAvatar(selectedAvatarFile, setAvatarUploadProgress);
          setAvatarSelection((current) => ({ ...current, objectKey }));
        }

        if (objectKey) submittedFormData.set("avatarObjectKey", objectKey);
        startSubmit(() => submitAction(submittedFormData));
      } catch (error) {
        const message = error instanceof AvatarUploadError ? error.message : avatarPreparationError;
        toast.error(message);
        setAvatarError(message);
      } finally {
        setAvatarUploadProgress(null);
        setIsSubmissionLocked(false);
      }
    });
  }

  const fallback = initialValues.displayName?.trim().slice(0, 1).toUpperCase() || "我";
  const isSaving = isPending || isUploading || isSubmitting || isSubmissionLocked;
  const avatarErrorId = "avatar-error";

  return (
    <form
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit(new FormData(event.currentTarget));
      }}
    >
      <fieldset aria-busy={isSaving} disabled={isSaving}>
      <FieldGroup data-profile-motion="form" className="max-w-3xl">
        <FieldSet>
          <FieldLegend>基本资料</FieldLegend>
          <FieldDescription>评论区仅显示头像和昵称，点击头像可查看你主动公开的资料。</FieldDescription>
          <Field className="items-center sm:flex-row sm:gap-5">
            <Avatar className="size-18" size="lg">
              {avatarSelection.previewUrl ? <AvatarImage alt="当前头像" src={avatarSelection.previewUrl} /> : null}
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
            <FieldContent>
              <FieldLabel htmlFor="avatar">头像</FieldLabel>
              <Input
                accept="image/jpeg,image/png,image/webp"
                aria-describedby={avatarError ? avatarErrorId : undefined}
                aria-invalid={Boolean(avatarError)}
                disabled={isSaving}
                id="avatar"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setCropFile(nextFile);
                  event.currentTarget.value = "";
                }}
                type="file"
              />
              <FieldDescription>支持 JPEG、PNG、WebP，文件不超过 5 MB。</FieldDescription>
              {avatarUploadProgress !== null ? <Progress aria-label="头像上传进度" value={avatarUploadProgress}><ProgressLabel>正在上传头像</ProgressLabel><ProgressValue /></Progress> : null}
              {avatarError ? <FieldError id={avatarErrorId}>{avatarError}</FieldError> : null}
            </FieldContent>
          </Field>
          <Field data-invalid={Boolean(fieldErrors.displayName)}>
            <FieldLabel htmlFor="displayName">昵称</FieldLabel>
            <Input
              aria-describedby={fieldErrors.displayName ? "displayName-error" : undefined}
              aria-invalid={Boolean(fieldErrors.displayName)}
              defaultValue={initialValues.displayName ?? ""}
              disabled={isSaving}
              id="displayName"
              maxLength={80}
              name="displayName"
              required
            />
            {fieldErrors.displayName ? <FieldError id="displayName-error">{fieldErrors.displayName}</FieldError> : null}
          </Field>
        </FieldSet>

        <FieldSet>
          <FieldLegend>个人信息</FieldLegend>
          <FieldGroup className="grid gap-5 sm:grid-cols-2">
            <TextFieldWithVisibility
              defaultValue={initialValues.email ?? ""}
              description="开启后，其他用户可在评论资料中查看。"
              disabled
              id="email"
              label="邮箱地址"
              maxLength={254}
              name="email"
              publicDefault={initialValues.publicEmail}
              publicName="publicEmail"
              visibilityDisabled={isSaving}
              type="email"
            />
            <TextFieldWithVisibility
              defaultValue={initialValues.realName ?? ""}
              description="开启后，其他用户可在评论资料中查看。"
              id="realName"
              label="真实姓名"
              maxLength={80}
              name="realName"
              error={fieldErrors.realName}
              disabled={isSaving}
               publicDefault={initialValues.publicRealName}
               publicName="publicRealName"
               visibilityDisabled={isSaving}
            />
            <TextFieldWithVisibility
              defaultValue={initialValues.phone ?? ""}
              description="开启后，其他用户可在评论资料中查看。"
              id="phone"
              label="手机号"
              maxLength={32}
              name="phone"
              error={fieldErrors.phone}
              disabled={isSaving}
               publicDefault={initialValues.publicPhone}
               publicName="publicPhone"
               visibilityDisabled={isSaving}
               type="tel"
            />
          </FieldGroup>
          <Field data-invalid={Boolean(fieldErrors.gender)}>
            <FieldLabel htmlFor="gender">性别</FieldLabel>
            <Select defaultValue={initialValues.gender} disabled={isSaving} name="gender">
              <SelectTrigger
                aria-describedby={fieldErrors.gender ? "gender-error" : undefined}
                aria-invalid={Boolean(fieldErrors.gender)}
                id="gender"
                className="w-full"
              >
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="male">男</SelectItem>
                  <SelectItem value="female">女</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                  <SelectItem value="unknown">未说明</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {fieldErrors.gender ? <FieldError id="gender-error">{fieldErrors.gender}</FieldError> : null}
          </Field>
          <VisibilitySwitch defaultChecked={initialValues.publicGender} disabled={isSaving} label="公开性别" name="publicGender" />
          <TextFieldWithVisibility
            defaultValue={initialValues.address ?? ""}
            description="开启后，其他用户可在评论资料中查看。"
            id="address"
            label="住址"
            maxLength={240}
            multiline
            name="address"
            error={fieldErrors.address}
            disabled={isSaving}
            publicDefault={initialValues.publicAddress}
            publicName="publicAddress"
            visibilityDisabled={isSaving}
          />
          <TextFieldWithVisibility
            defaultValue={initialValues.birthDate ?? ""}
            description="开启后，其他用户只能看到按当前日期计算的年龄。"
            id="birthDate"
            label="出生日期"
            maxLength={10}
            name="birthDate"
            error={fieldErrors.birthDate}
            disabled={isSaving}
            publicDefault={initialValues.publicBirthDate}
            publicName="publicBirthDate"
            visibilityDisabled={isSaving}
            type="date"
          />
        </FieldSet>

        {state.error ? <FieldError>{state.error}</FieldError> : null}
        <Button disabled={isSaving} size="lg" type="submit">
          {isSaving ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
          {isUploading ? "上传头像中..." : isPending ? "保存中..." : "保存资料"}
        </Button>
      </FieldGroup>
      </fieldset>
      <AvatarCropDialog file={cropFile} onCancel={() => setCropFile(null)} onConfirm={handleCropConfirm} />
    </form>
  );
}

function TextFieldWithVisibility({
  defaultValue,
  description,
  error,
  disabled,
  id,
  label,
  maxLength,
  multiline = false,
  name,
  publicDefault,
  publicName,
  visibilityDisabled,
  type = "text",
}: {
  defaultValue: string;
  description: string;
  error?: string;
  disabled: boolean;
  id: string;
  label: string;
  maxLength: number;
  multiline?: boolean;
  name: string;
  publicDefault: boolean;
  publicName: string;
  visibilityDisabled: boolean;
  type?: "date" | "email" | "tel" | "text";
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? (
        <Textarea aria-describedby={error ? `${id}-error` : undefined} aria-invalid={Boolean(error)} defaultValue={defaultValue} disabled={disabled} id={id} maxLength={maxLength} name={name} />
      ) : (
        <Input aria-describedby={error ? `${id}-error` : undefined} aria-invalid={Boolean(error)} defaultValue={defaultValue} disabled={disabled} id={id} maxLength={maxLength} name={name} type={type} />
      )}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
      <VisibilitySwitch defaultChecked={publicDefault} description={description} disabled={visibilityDisabled} label={`公开${label}`} name={publicName} />
    </Field>
  );
}

function VisibilitySwitch({
  defaultChecked,
  description,
  disabled,
  label,
  name,
}: {
  defaultChecked: boolean;
  description?: string;
  disabled: boolean;
  label: string;
  name: string;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  const id = `${name}-switch`;

  useEffect(() => setChecked(defaultChecked), [defaultChecked]);

  return (
    <Field orientation="horizontal" className="items-center justify-between rounded-lg border border-border px-3 py-2.5">
      <FieldContent>
        <FieldTitle>{label}</FieldTitle>
        {description ? <FieldDescription>{description}</FieldDescription> : <FieldDescription>开启后，其他用户可在评论资料中查看。</FieldDescription>}
      </FieldContent>
      <Switch
        checked={checked}
        disabled={disabled}
        id={id}
        name={name}
        aria-label={label}
        onCheckedChange={(nextChecked) => setChecked(nextChecked)}
      />
    </Field>
  );
}

async function uploadAvatar(file: File, onProgress?: (percentage: number) => void): Promise<string> {
  let signatureResponse: Response;
  try {
    signatureResponse = await fetch("/api/profile/avatar/upload-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, mimeType: file.type, size: file.size }),
    });
  } catch {
    throw new AvatarUploadError(avatarPreparationError);
  }

  const payload = await readAvatarSignaturePayload(signatureResponse);

  if (!signatureResponse.ok) {
    throw new AvatarUploadError(getVerifiedAvatarUploadError(payload));
  }

  if (!isAvatarUploadSignature(payload)) throw new AvatarUploadError(avatarPreparationError);

  const uploadData = new FormData();
  for (const [key, value] of Object.entries(payload.fields)) uploadData.set(key, value);
  uploadData.set("file", file);

  try {
    const uploadResponse = onProgress
      ? await uploadAvatarWithProgress(payload.uploadUrl, uploadData, onProgress)
      : await fetch(payload.uploadUrl, { method: "POST", body: uploadData });
    if (!uploadResponse.ok) throw new AvatarUploadError("头像上传失败，请稍后重试。");
  } catch (error) {
    if (error instanceof AvatarUploadError) throw error;
    throw new AvatarUploadError("头像上传失败，请稍后重试。");
  }

  return payload.objectKey;
}

function uploadAvatarWithProgress(uploadUrl: string, body: FormData, onProgress: (percentage: number) => void): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", uploadUrl);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => resolve(new Response(null, { status: request.status }));
    request.onerror = () => reject(new Error("upload failed"));
    request.send(body);
  });
}

async function readAvatarSignaturePayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new AvatarUploadError(avatarPreparationError);
  }
}

function getVerifiedAvatarUploadError(payload: unknown): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string" &&
    verifiedAvatarUploadErrors.has(payload.error)
  ) {
    return payload.error;
  }

  return avatarPreparationError;
}

function isAvatarUploadSignature(payload: unknown): payload is AvatarUploadSignature {
  if (typeof payload !== "object" || payload === null) return false;

  const candidate = payload as Partial<AvatarUploadSignature>;
  return (
    typeof candidate.objectKey === "string" &&
    typeof candidate.uploadUrl === "string" &&
    typeof candidate.fields === "object" &&
    candidate.fields !== null &&
    Object.values(candidate.fields).every((value) => typeof value === "string")
  );
}

function formValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function cloneFormData(formData: FormData): FormData {
  const copy = new FormData();
  for (const [key, value] of formData.entries()) copy.append(key, value);
  return copy;
}

function revokeAvatarPreview(previewObjectUrlRef: React.MutableRefObject<string | null>) {
  if (!previewObjectUrlRef.current) return;
  URL.revokeObjectURL(previewObjectUrlRef.current);
  previewObjectUrlRef.current = null;
}
