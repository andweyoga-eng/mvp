import { z } from "zod";

/** Soft safety rail for admin UI/API — not the member's configured target. */
export const FUEL_SAFETY_FLOOR_CAL = 1200;

/** Support off-ramp (OI-2). */
export const FUEL_SUPPORT_TEL = "9513022331";
export const FUEL_SUPPORT_HREF = `tel:+91${FUEL_SUPPORT_TEL}`;

export type FuelMealSlot = {
  index: number;
  label: string;
  /** Local wall-clock HH:mm (24h). */
  startTime: string;
  /** Local wall-clock HH:mm (24h), exclusive end of band. */
  endTime: string;
};

export type FuelMealPlan = FuelMealSlot[];

export type DayVerdictStatus = "on_track" | "over" | "under" | "pending";

export type PepPhrase = { pre: string; accent: string; post: string };

/** Default editable meal plan for new Fuel members. */
export const DEFAULT_FUEL_MEAL_PLAN: FuelMealPlan = [
  { index: 0, label: "Breakfast", startTime: "06:00", endTime: "10:30" },
  { index: 1, label: "Lunch", startTime: "11:30", endTime: "15:00" },
  { index: 2, label: "Snack", startTime: "15:00", endTime: "18:00" },
  { index: 3, label: "Dinner", startTime: "18:00", endTime: "22:30" },
];

export const FUEL_PEP_PHRASES: PepPhrase[] = [
  { pre: "Progress over ", accent: "perfection", post: ". One mindful meal at a time." },
  { pre: "You showed up today. That's ", accent: "enough", post: "." },
  { pre: "Small steady choices build a ", accent: "steady", post: " you." },
  { pre: "No guilt, just ", accent: "awareness", post: ". Reset and go again." },
  { pre: "Every bowl is a little step toward ", accent: "balance", post: "." },
];

export const FUEL_MEDICAL_DISCLAIMER =
  "andWeDiet is a self-awareness aid and not medical or nutritional advice.";

export const FUEL_SUPPORT_COPY =
  "If tracking food feels stressful, here is support";

/** Accept a raw id or a full YouTube URL (watch, youtu.be, shorts, embed). */
export function extractYoutubeEmbedId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^[\w-]{6,64}$/.test(raw) && !/[/:.]/.test(raw)) return raw;
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{6,64}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = url.searchParams.get("v");
      if (v && /^[\w-]{6,64}$/.test(v)) return v;
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && ["shorts", "embed", "live", "v"].includes(parts[0]!)) {
        const id = parts[1]!;
        return /^[\w-]{6,64}$/.test(id) ? id : null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** Accept a raw id or Instagram /p/ /reel/ URL. */
export function extractInstagramEmbedId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^[\w-]+$/.test(raw) && !/[/:.]/.test(raw)) return raw;
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "instagram.com" && host !== "instagr.am") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && ["p", "reel", "tv"].includes(parts[0]!)) {
      return parts[1] || null;
    }
  } catch {
    return null;
  }
  return null;
}

export function normalizeFuelMediaEmbedId(
  provider: "youtube" | "instagram",
  input: string,
): string | null {
  return provider === "youtube" ? extractYoutubeEmbedId(input) : extractInstagramEmbedId(input);
}

const hhmmRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const fuelMealSlotSchema = z.object({
  index: z.number().int().min(0).max(20),
  label: z.string().trim().min(1).max(64),
  startTime: z.string().regex(hhmmRegex, "Use HH:mm"),
  endTime: z.string().regex(hhmmRegex, "Use HH:mm"),
});

export const fuelMealPlanSchema = z
  .array(fuelMealSlotSchema)
  .min(1)
  .max(12)
  .superRefine((plan, ctx) => {
    const indexes = plan.map((s) => s.index);
    if (new Set(indexes).size !== indexes.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Meal slot indexes must be unique" });
    }
  });

export const adminFuelConfigSchema = z
  .object({
    dailyCalorieTargetCal: z.number().int().min(1).max(20000).optional(),
    dailyDeficitCal: z.number().int().min(0).max(5000).optional(),
    fuelMealPlan: fuelMealPlanSchema.optional(),
    /** Required when effective floor (target − deficit) is below FUEL_SAFETY_FLOOR_CAL. */
    overrideReason: z.string().trim().min(3).max(500).optional(),
    clearConfig: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.clearConfig) return;
    if (val.dailyCalorieTargetCal == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Target is required", path: ["dailyCalorieTargetCal"] });
    }
    if (val.dailyDeficitCal == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Deficit is required", path: ["dailyDeficitCal"] });
    }
  });

export const fuelLogMealSchema = z.object({
  name: z.string().trim().min(1).max(200),
  calories: z.number().int().min(0).max(20000),
  /** Member-local calendar date the meal counts toward (YYYY-MM-DD). */
  clientLocalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Member-local wall time HH:mm when logged. */
  clientLocalTime: z.string().regex(hhmmRegex),
  /** Optional explicit slot; otherwise inferred from clientLocalTime. */
  mealSlotIndex: z.number().int().min(0).max(20).nullable().optional(),
  /** IANA tz or offset minutes for display/audit; optional. */
  clientTimeZone: z.string().trim().max(64).optional(),
});

export const fuelMacrosSchema = z.object({
  protein: z.number().min(0).max(500),
  carbs: z.number().min(0).max(1000),
  fat: z.number().min(0).max(500),
  fiber: z.number().min(0).max(200),
});

export type FuelMacros = z.infer<typeof fuelMacrosSchema>;

export const fuelCaptureMethodSchema = z.enum(["capture", "upload", "manual"]);
export type FuelCaptureMethod = z.infer<typeof fuelCaptureMethodSchema>;

export const fuelLogMealBatchItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  calories: z.number().int().min(0).max(20000),
  weightG: z.number().int().min(1).max(50000).nullable().optional(),
  captureMethod: fuelCaptureMethodSchema,
  confidence: z.number().min(0).max(1).nullable().optional(),
  macros: fuelMacrosSchema.nullable().optional(),
  /** When logging late into a slot: member-local HH:mm they actually ate. */
  eatenLocalTime: z.string().regex(hhmmRegex).nullable().optional(),
});

export const fuelLogMealBatchSchema = z.object({
  mealGroupId: z.string().trim().min(8).max(64),
  mealTitle: z.string().trim().min(1).max(200),
  mealSlotIndex: z.number().int().min(0).max(20).nullable(),
  clientLocalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clientLocalTime: z.string().regex(hhmmRegex),
  clientTimeZone: z.string().trim().max(64).optional(),
  items: z.array(fuelLogMealBatchItemSchema).min(1).max(40),
});

export const fuelAppendMealItemSchema = fuelLogMealBatchItemSchema.extend({
  clientLocalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clientLocalTime: z.string().regex(hhmmRegex),
  clientTimeZone: z.string().trim().max(64).optional(),
  /** When appending outside the slot window into the group, pass eaten time in-window. */
  eatenLocalTime: z.string().regex(hhmmRegex).nullable().optional(),
});

export const fuelEstimateSchema = z.object({
  /** base64 data URL or raw base64 — transit only, never persisted. */
  imageBase64: z.string().min(1).max(8_000_000).optional(),
  mimeType: z.string().trim().max(64).optional(),
  /** Weight-only path (no photo). */
  name: z.string().trim().min(1).max(200).optional(),
  weightGrams: z.number().int().min(1).max(50000).optional(),
});

/** Grams ↔ oz for Track Diet confirm UI (canonical store is grams). */
export const FUEL_OZ_TO_G = 28.3495;

export function gramsToOz(grams: number): number {
  return grams / FUEL_OZ_TO_G;
}

export function ozToGrams(oz: number): number {
  return oz * FUEL_OZ_TO_G;
}

export const FUEL_DRAFT_UNDER_NOTE =
  "We’ll keep a draft on this device while you build this meal. It clears on its own at the end of the day.";

/** Fallback meal plan when admin plan is missing (Track Diet select step). */
export function resolveFuelMealPlanForTracking(plan: FuelMealPlan | null | undefined): FuelMealPlan {
  return plan?.length ? plan : DEFAULT_FUEL_MEAL_PLAN;
}

/** Empty / whitespace → null; optional absolute http(s) URL for pasted recipe images. */
const optionalHttpUrl = z.preprocess(
  (val) => {
    if (val == null) return null;
    if (typeof val !== "string") return val;
    const trimmed = val.trim();
    return trimmed === "" ? null : trimmed;
  },
  z
    .string()
    .max(2000)
    .url({ message: "Image URL must be a full link starting with http:// or https://" })
    .refine((u) => /^https?:\/\//i.test(u), {
      message: "Image URL must start with http:// or https://",
    })
    .nullable(),
);

const optionalApproxKcal = z.preprocess((val) => {
  if (val == null || val === "") return null;
  if (typeof val === "string" && val.trim() === "") return null;
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n)) return val;
  return Math.round(n);
}, z.number().int().min(0).max(5000).nullable());

export const adminFuelRecipeSchema = z.object({
  forDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().trim().min(1).max(200),
  teaser: z.string().trim().min(1).max(500),
  ingredients: z.string().trim().min(1).max(8000),
  method: z.string().trim().min(1).max(8000),
  imageUrl: optionalHttpUrl.optional(),
  approxKcal: optionalApproxKcal.optional(),
});

export const adminFuelDailyMediaSchema = z
  .object({
    forDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    provider: z.enum(["youtube", "instagram"]),
    /** Raw embed id OR a full YouTube/Instagram URL — normalized on parse. */
    embedId: z.string().trim().min(1).max(500),
    title: z.string().trim().min(1).max(200),
  })
  .superRefine((val, ctx) => {
    const normalized = normalizeFuelMediaEmbedId(val.provider, val.embedId);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["embedId"],
        message:
          val.provider === "youtube"
            ? "Paste a YouTube video id or full URL (watch, youtu.be, or shorts)"
            : "Paste an Instagram post/reel id or full URL",
      });
    }
  })
  .transform((val) => ({
    ...val,
    embedId: normalizeFuelMediaEmbedId(val.provider, val.embedId)!,
  }));

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Pick the slot whose [start, end) contains localTime; null if none match. */
export function matchMealSlot(
  plan: FuelMealPlan,
  localTimeHhmm: string,
): FuelMealSlot | null {
  const t = hhmmToMinutes(localTimeHhmm);
  const ordered = [...plan].sort((a, b) => a.index - b.index);
  for (const slot of ordered) {
    const start = hhmmToMinutes(slot.startTime);
    const end = hhmmToMinutes(slot.endTime);
    if (start <= end) {
      if (t >= start && t < end) return slot;
    } else {
      // overnight band
      if (t >= start || t < end) return slot;
    }
  }
  return null;
}

export function lastMealSlotIndex(plan: FuelMealPlan): number {
  return Math.max(...plan.map((s) => s.index));
}

export function effectiveFloor(target: number, deficit: number): number {
  return target - deficit;
}

export function assertFuelConfigSafe(
  target: number,
  deficit: number,
  overrideReason?: string | null,
): { ok: true } | { ok: false; message: string } {
  const floor = effectiveFloor(target, deficit);
  if (floor < 0) {
    return { ok: false, message: "Deficit cannot exceed the daily target." };
  }
  if (floor < FUEL_SAFETY_FLOOR_CAL && !(overrideReason && overrideReason.trim().length >= 3)) {
    return {
      ok: false,
      message: `Effective floor (${floor}) is below the safety rail (${FUEL_SAFETY_FLOOR_CAL}). Provide an override reason to continue.`,
    };
  }
  return { ok: true };
}

export function dayStatus(
  dayTotal: number,
  target: number,
  deficit: number,
): Exclude<DayVerdictStatus, "pending"> {
  const floor = effectiveFloor(target, deficit);
  if (dayTotal > target) return "over";
  if (dayTotal < floor) return "under";
  return "on_track";
}

export function signedDelta(dayTotal: number, target: number): number {
  return dayTotal - target;
}

export function formatSignedDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

export function caloriesLeftCopy(dayTotal: number, target: number): string {
  const left = target - dayTotal;
  if (left >= 0) return `${left} left to stay within today’s budget`;
  return `${Math.abs(left)} over today’s budget`;
}

export function coachingCopyForDay(
  status: Exclude<DayVerdictStatus, "pending">,
): string {
  if (status === "on_track") {
    return "You're within today's fuel band. A calm place to be.";
  }
  if (status === "over") {
    return "Over target today. No judgement. Reset tomorrow.";
  }
  return "That's a big gap under target. Make sure you're fuelling enough today.";
}

/** Whether the day colour verdict may show (last slot logged, or caller marks day closed). */
export function shouldShowDayVerdict(params: {
  plan: FuelMealPlan;
  loggedSlotIndexes: Array<number | null | undefined>;
  dayClosed?: boolean;
}): boolean {
  if (params.dayClosed) return true;
  if (!params.plan.length) return false;
  const last = lastMealSlotIndex(params.plan);
  return params.loggedSlotIndexes.some((idx) => idx === last);
}

export function buildYoutubeEmbedUrl(embedId: string): string {
  const id = extractYoutubeEmbedId(embedId) ?? embedId.trim();
  return `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
}

export function buildInstagramEmbedUrl(embedId: string): string {
  const id = extractInstagramEmbedId(embedId) ?? embedId.trim();
  return `https://www.instagram.com/p/${encodeURIComponent(id)}/embed`;
}

export function averageDailyTotalsVsTarget(
  dailyTotals: number[],
  target: number,
): number | null {
  if (!dailyTotals.length) return null;
  const avg = dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length;
  return Math.round(avg - target);
}

/** Photo estimation (SPEC-FUEL v3 / Gemini handoff). */
export const FUEL_ESTIMATE_MAX_BYTES = 4 * 1024 * 1024;
export const FUEL_ESTIMATE_ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export type FuelEstimateMime = (typeof FUEL_ESTIMATE_ALLOWED_MIMES)[number];
export const FUEL_ESTIMATE_CONFIDENCE_SUCCESS = 0.75;
export const FUEL_ESTIMATE_CONFIDENCE_LOW = 0.4;
export const FUEL_ESTIMATE_TIMEOUT_MS = 8000;
export const FUEL_ESTIMATE_KCAL_MIN = 1;
export const FUEL_ESTIMATE_KCAL_MAX = 4000;
export const FUEL_ESTIMATE_KCAL_ROUND = 5;
export const FUEL_ESTIMATE_NAME_MAX = 60;

export type FuelEstimateReviewState = "success" | "low" | "failure";

export function roundFuelCalories(kcal: number): number {
  const rounded = Math.round(kcal / FUEL_ESTIMATE_KCAL_ROUND) * FUEL_ESTIMATE_KCAL_ROUND;
  return Math.max(FUEL_ESTIMATE_KCAL_MIN, Math.min(FUEL_ESTIMATE_KCAL_MAX, rounded));
}

export function clampFuelMealName(name: string): string {
  return name.trim().slice(0, FUEL_ESTIMATE_NAME_MAX);
}

/** Maps model confidence to member review UI band (v3 handoff §4). */
export function fuelEstimateReviewState(
  confidence: number | null | undefined,
): FuelEstimateReviewState {
  if (confidence == null || !Number.isFinite(confidence)) return "low";
  if (confidence >= FUEL_ESTIMATE_CONFIDENCE_SUCCESS) return "success";
  if (confidence >= FUEL_ESTIMATE_CONFIDENCE_LOW) return "low";
  return "failure";
}

export const FUEL_ESTIMATE_SUCCESS_COPY =
  "Advisory estimate. Check it before saving.";
export const FUEL_ESTIMATE_LOW_COPY =
  "The plate was hard to read. We filled in a rough guess only. Please correct both fields.";
export const FUEL_ESTIMATE_FAILURE_COPY =
  "We could not read this photo well enough to guess. Enter your meal manually.";
export const FUEL_ESTIMATE_TRANSIENT_COPY =
  "Couldn’t reach estimate just now. No stress. Retry later, or type name and weight.";
export const FUEL_ESTIMATE_NETWORK_COPY =
  "Couldn’t reach estimate just now. No stress. Retry later, or type name and weight.";
export const FUEL_ESTIMATE_QUOTA_COPY =
  "Estimate is busy right now. No stress. Try again shortly, or type name and weight.";
export const FUEL_ESTIMATE_NO_FOOD_COPY =
  "No food detected in this photo. Retake a clearer shot of your meal.";
/** Photo of a screen / secondary photo of food (not the plate in front of you). */
export const FUEL_ESTIMATE_SCREEN_FOOD_COPY =
  "Cute try. That looks like food on a screen, not on a plate. Snap the real meal when you can, or type it in by hand.";
/** Member-facing; hints studio/admin without naming models. */
export const FUEL_ESTIMATE_MODEL_UNAVAILABLE_COPY =
  "Estimate isn’t available right now. No stress. Enter name and weight. If this keeps happening, ask your studio to check estimate setup.";
export const FUEL_ESTIMATE_PHOTO_FORMATS_COPY = "JPG, PNG, or WebP only · max 4 MB";
export const FUEL_ESTIMATE_PHOTO_HEIC_COPY =
  "iPhone HEIC photos are not supported. Save as JPG first.";

export const FUEL_OUTSIDE_SLOTS_TITLE = "Outside slots";
export const FUEL_CUSTOM_MEAL_NAME_PLACEHOLDER =
  "Eg Late Lunch, Early Dinner, Chilling with Bro ..";

/** Whether local HH:mm falls in [start, end). Overnight bands supported. */
export function isLocalTimeInSlot(localTime: string, startTime: string, endTime: string): boolean {
  const t = hhmmToMinutes(localTime);
  const start = hhmmToMinutes(startTime);
  const end = hhmmToMinutes(endTime);
  if (start === end) return true;
  if (start < end) return t >= start && t < end;
  return t >= start || t < end;
}

export function midpointHhmm(startTime: string, endTime: string): string {
  const start = hhmmToMinutes(startTime);
  let end = hhmmToMinutes(endTime);
  if (end <= start) end += 24 * 60;
  const mid = Math.round((start + end) / 2) % (24 * 60);
  const h = Math.floor(mid / 60);
  const m = mid % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function estimateErrorCopy(code: string | null | undefined): string {
  if (code === "no_food") return FUEL_ESTIMATE_NO_FOOD_COPY;
  if (code === "screen_food") return FUEL_ESTIMATE_SCREEN_FOOD_COPY;
  if (code === "quota") return FUEL_ESTIMATE_QUOTA_COPY;
  if (code === "model_unavailable") return FUEL_ESTIMATE_MODEL_UNAVAILABLE_COPY;
  if (code === "provider_down" || code === "unreadable" || code === "schema") {
    return FUEL_ESTIMATE_NETWORK_COPY;
  }
  return FUEL_ESTIMATE_TRANSIENT_COPY;
}

/** Client-side guard before upload; server still validates MIME and magic bytes. */
export function fuelEstimatePhotoFileError(file: File): string | null {
  if (file.size === 0) return "Could not read this photo.";
  if (file.size > FUEL_ESTIMATE_MAX_BYTES) return "Photo must be 4 MB or smaller.";

  const mime = file.type?.toLowerCase() ?? "";
  const allowed = new Set<string>(FUEL_ESTIMATE_ALLOWED_MIMES);
  if (mime && allowed.has(mime)) return null;

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!mime && (ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp")) {
    return null;
  }

  if (
    mime === "image/heic" ||
    mime === "image/heif" ||
    ext === "heic" ||
    ext === "heif"
  ) {
    return FUEL_ESTIMATE_PHOTO_HEIC_COPY;
  }

  return `Use a JPG, PNG, or WebP photo (max 4 MB).`;
}
