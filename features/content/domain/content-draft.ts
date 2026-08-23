import { z } from "zod";

const objectKeySchema = z
  .string()
  .regex(/^(photos|videos)\/\d{4}\/\d{2}\/[a-z0-9-]+\.(jpg|png|webp|mp4)$/i, {
    message: "Enter a valid media object key.",
  });

const storyImageObjectKeySchema = z.string().regex(/^stories\/\d{4}\/\d{2}\/[a-z0-9-]+\.(jpg|png|webp)$/i);

const draftSchema = z
  .object({
    kind: z.enum(["photo", "video", "story"]),
    title: z.string().trim().min(1).max(160),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    excerpt: z.string().trim().max(360).optional(),
    markdownBody: z.string().optional(),
    isFeatured: z.boolean(),
    publishNow: z.boolean(),
    objectKey: objectKeySchema.optional(),
    storyImageObjectKeys: z.array(storyImageObjectKeySchema).default([]),
    aperture: z.number().optional(),
    shutterSpeed: z.string().max(30).optional(),
    iso: z.number().optional(),
    focalLengthMm: z.number().optional(),
    cameraMake: z.string().max(100).optional(),
    cameraModel: z.string().max(100).optional(),
    lens: z.string().max(160).optional(),
    capturedAt: z.string().datetime().optional(),
    locationVisibility: z.enum(["precise", "city", "hidden"]).default("hidden"),
    locationLabel: z.string().trim().max(200).optional(),
    city: z.string().trim().max(100).optional(),
    region: z.string().trim().max(100).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .superRefine((draft, context) => {
    if (draft.kind !== "story" && !draft.objectKey) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["objectKey"],
        message: "A media object key is required for photos and videos.",
      });
    }

    if (draft.kind !== "story" && draft.storyImageObjectKeys.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["storyImageObjectKeys"], message: "Story image object keys are only valid for stories." });
    }

    if (draft.locationVisibility === "city" && (!draft.city || !draft.region)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["city"],
        message: "A city location requires both city and region.",
      });
    }

    if (
      draft.locationVisibility === "precise" &&
      (!draft.locationLabel ||
        !draft.city ||
        !draft.region ||
        draft.latitude === undefined ||
        draft.longitude === undefined)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["locationLabel"],
        message: "A precise location requires a label, city, region, latitude, and longitude.",
      });
    }
  });

export type AdminContentDraft = z.infer<typeof draftSchema>;

export function parseAdminContentDraft(input: unknown): AdminContentDraft {
  return draftSchema.parse(input);
}
