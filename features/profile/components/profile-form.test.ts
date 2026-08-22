import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const formPath = resolve(import.meta.dirname, "profile-form.tsx");

describe("ProfileForm", () => {
  it("提供完整资料字段、公开开关与头像对象键提交契约", async () => {
    const source = await readFile(formPath, "utf8");

    for (const field of [
      "displayName",
      "realName",
      "phone",
      "address",
      "birthDate",
      "gender",
      "publicGender",
      "publicRealName",
      "publicPhone",
      "publicAddress",
      "publicBirthDate",
      "avatarObjectKey",
    ]) {
      expect(source).toContain(field);
    }
    expect(source).toContain('"/api/profile/avatar/upload-signature"');
    expect(source).toContain("updateProfileAction");
  });

  it("在浏览器端限制头像格式和文件大小，并给出简体中文提示", async () => {
    const source = await readFile(formPath, "utf8");

    expect(source).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(source).toContain("changeAvatarSelection");
    expect(source).toContain("评论区仅显示头像和昵称");
  });

  it("不将浏览器或网络异常的原始错误文案显示给用户", async () => {
    const source = await readFile(formPath, "utf8");

    expect(source).not.toContain("error instanceof Error ? error.message");
    expect(source).toContain("头像上传准备失败，请稍后重试。");
  });

  it("提交前校验字段并在无效时阻止上传和服务端提交", async () => {
    const source = await readFile(formPath, "utf8");

    expect(source).toContain("validateProfileFormValues");
    expect(source).toContain("if (Object.keys(validationErrors).length > 0) return;");
    expect(source).toContain("aria-invalid={Boolean(fieldErrors.displayName)}");
    expect(source).toContain("aria-invalid={Boolean(fieldErrors.gender)}");
  });

  it("在上传或保存期间锁定可编辑控件", async () => {
    const source = await readFile(formPath, "utf8");

    expect(source).toContain("<fieldset aria-busy={isSaving} disabled={isSaving}>");
  });

  it("邮箱地址只读时仍允许切换公开邮箱开关", async () => {
    const source = await readFile(formPath, "utf8");

    expect(source).toContain('visibilityDisabled={isSaving}');
    expect(source).toContain("disabled={disabled} id={id}");
    expect(source).toContain(
      "<VisibilitySwitch defaultChecked={publicDefault} description={description} disabled={visibilityDisabled}",
    );
  });

  it("使用受控开关同步保存后的公开状态", async () => {
    const source = await readFile(formPath, "utf8");

    expect(source).toContain("const [checked, setChecked] = useState(defaultChecked);");
    expect(source).toContain("useEffect(() => setChecked(defaultChecked), [defaultChecked]);");
    expect(source).toContain("checked={checked}");
    expect(source).toContain("onCheckedChange={(nextChecked) => setChecked(nextChecked)}");
  });

  it("在异步头像上传完成后通过 transition 调用资料保存 action", async () => {
    const source = await readFile(formPath, "utf8");

    expect(source).toContain("const [isSubmitting, startSubmit] = useTransition();");
    expect(source).toContain("startSubmit(() => submitAction(submittedFormData));");
    expect(source).toContain("const isSaving = isPending || isUploading || isSubmitting || isSubmissionLocked;");
  });

  it("释放临时头像预览 URL 并关联头像错误提示", async () => {
    const source = await readFile(formPath, "utf8");

    expect(source).toContain("URL.revokeObjectURL");
    expect(source).toContain('const avatarErrorId = "avatar-error"');
    expect(source).toContain('aria-describedby={avatarError ? avatarErrorId : undefined}');
    expect(source).toContain('<FieldError id={avatarErrorId}>{avatarError}</FieldError>');
  });
});
