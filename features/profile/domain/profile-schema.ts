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

const profileDraftSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  realName: optionalProfileText(80),
  phone: optionalProfileText(32),
  address: optionalProfileText(240),
  gender: profileGenderSchema.nullable(),
  publicGender: z.boolean(),
  publicRealName: z.boolean(),
  publicPhone: z.boolean(),
  publicAddress: z.boolean(),
  publicEmail: z.boolean().optional(),
});

export type ProfileDraft = z.infer<typeof profileDraftSchema>;

export function parseProfileDraft(input: unknown): ProfileDraft {
  return profileDraftSchema.parse(input);
}
