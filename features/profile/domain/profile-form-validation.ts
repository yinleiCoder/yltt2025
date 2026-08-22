import { profileBirthDateSchema, profileGenderSchema } from "@/features/profile/domain/profile-schema";

export type ProfileFormFieldErrors = Partial<
  Record<"displayName" | "realName" | "phone" | "address" | "birthDate" | "gender", string>
>;

type ProfileFormValues = {
  displayName: string;
  realName: string;
  phone: string;
  address: string;
  birthDate?: string;
  gender: string;
};

export function validateProfileFormValues(values: ProfileFormValues): ProfileFormFieldErrors {
  const errors: ProfileFormFieldErrors = {};
  const displayName = values.displayName.trim();

  if (!displayName) errors.displayName = "请输入昵称。";
  else if (displayName.length > 80) errors.displayName = "昵称不能超过 80 个字符。";

  validateOptionalText(values.realName, 80, "真实姓名", "realName", errors);
  validateOptionalText(values.phone, 32, "手机号", "phone", errors);
  validateOptionalText(values.address, 240, "住址", "address", errors);

  if (values.birthDate && !profileBirthDateSchema.safeParse(values.birthDate).success) {
    errors.birthDate = "请输入有效的出生日期。";
  }

  const gender = values.gender.trim();
  if (gender && !profileGenderSchema.safeParse(gender).success) {
    errors.gender = "请选择有效的性别选项。";
  }

  return errors;
}

function validateOptionalText(
  value: string,
  maxLength: number,
  label: string,
  field: "realName" | "phone" | "address",
  errors: ProfileFormFieldErrors,
) {
  if (value.trim().length > maxLength) errors[field] = `${label}不能超过 ${maxLength} 个字符。`;
}
