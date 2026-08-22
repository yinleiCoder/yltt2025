import { z } from "zod";

export const profileGenderSchema = z.enum(["male", "female", "other", "unknown"]);

export type ProfileGender = z.infer<typeof profileGenderSchema>;

function optionalProfileText(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => value || null)
    .pipe(z.string().min(1).max(maxLength).nullable());
}

function isCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isNotFutureDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  return Date.UTC(year, month - 1, day) <= todayUtc;
}

export const profileBirthDateSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() || null : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Birth date must use YYYY-MM-DD")
    .refine(isCalendarDate, "Birth date must be a real calendar date")
    .refine(isNotFutureDate, "Birth date cannot be in the future")
    .nullable(),
);

const profileDraftSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  realName: optionalProfileText(80),
  phone: optionalProfileText(32),
  address: optionalProfileText(240),
  birthDate: profileBirthDateSchema,
  gender: profileGenderSchema.nullable(),
  publicGender: z.boolean(),
  publicRealName: z.boolean(),
  publicPhone: z.boolean(),
  publicAddress: z.boolean(),
  publicBirthDate: z.boolean(),
  publicEmail: z.boolean().optional(),
});

export type ProfileDraft = z.infer<typeof profileDraftSchema>;

export function parseProfileDraft(input: unknown): ProfileDraft {
  return profileDraftSchema.parse(input);
}
