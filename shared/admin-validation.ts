import { z } from "zod";
import { INSTRUCTOR_LICENSE_STATUSES } from "./instructor-compliance";
import { CLASS_INTENSITIES, DEFAULT_CLASS_INTENSITY } from "./schema";
import { MAX_WEEKLY_OCCURRENCES } from "./session-schedule";
import { SESSION_TERMS_MAX_LENGTH } from "./session-terms";

const licenseStatusValues = INSTRUCTOR_LICENSE_STATUSES.map((s) => s.value) as [
  string,
  ...string[],
];

const instructorQrImageField = z
  .string()
  .trim()
  .min(1, "Onboarding QR image is required")
  .refine(
    (v) => v.startsWith("data:image/") || /^https:\/\/.+/i.test(v),
    "Upload a QR image or provide a valid https URL",
  );

/** Optional URL: empty → null; https, data:image/, or /attached_assets/ when set */
const optionalImageUrl = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v === "" || v == null ? null : v))
  .refine(
    (v) =>
      v === null ||
      /^https:\/\/.+/i.test(v) ||
      v.startsWith("data:image/") ||
      v.startsWith("/attached_assets/"),
    {
      message: "Upload an image or provide a valid https:// URL",
    },
  );

/** Required session-type image — upload or https URL. */
const requiredSessionTypeImageUrl = z
  .string()
  .trim()
  .min(1, "Session image is required — upload a file or paste an https:// image URL")
  .refine(
    (v) =>
      /^https:\/\/.+/i.test(v) ||
      v.startsWith("data:image/") ||
      v.startsWith("/attached_assets/"),
    {
      message: "Upload an image or provide a valid https:// URL",
    },
  );

/** Optional URL: empty string → null; must be https when set */
const optionalHttpsUrl = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v === "" || v == null ? null : v))
  .refine((v) => v === null || /^https:\/\/.+/i.test(v), {
    message: "URL must start with https://",
  });

const optionalMeetUrl = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v === "" || v == null ? null : v))
  .refine((v) => v === null || v.length <= 2048, {
    message: "Meet link is too long (max 2048 characters)",
  })
  .refine((v) => v === null || /^https:\/\/.+/i.test(v), {
    message: "Meet link must start with https://",
  });

const razorpayLinkField = z
  .string()
  .trim()
  .min(1, "Payment link is required")
  .max(2048, "Payment link is too long (max 2048 characters)")
  .refine((v) => /^https:\/\/.+/i.test(v), {
    message: "Payment link must start with https://",
  });

/** Admin datetime-local or ISO string → Date */
const requiredDateTime = z
  .union([z.string(), z.date()])
  .transform((v) => {
    if (v instanceof Date) return v;
    const s = String(v).trim();
    if (!s) return new Date(NaN);
    return new Date(s);
  })
  .refine((d) => !Number.isNaN(d.getTime()), {
    message: "Enter a valid date and time",
  });

const optionalDateTime = z
  .union([z.string(), z.date()])
  .optional()
  .nullable()
  .transform((v) => {
    if (v == null || v === "") return null;
    if (v instanceof Date) return v;
    const s = String(v).trim();
    if (!s) return null;
    return new Date(s);
  });

const tenDigitPhoneField = z
  .string()
  .trim()
  .regex(/^\d{10}$/, "Enter a valid 10-digit phone number");

/** @deprecated Use tenDigitPhoneField — admin contact phones are India 10-digit only */
const qrPhoneField = tenDigitPhoneField;

const qrEmailField = z
  .string()
  .trim()
  .min(1, "Contact email is required")
  .email("Enter a valid email address");

const priceField = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "number" ? v.toFixed(2) : v.trim()))
  .pipe(
    z
      .string()
      .min(1, "Price is required")
      .refine((s) => !Number.isNaN(parseFloat(s)) && parseFloat(s) > 0, {
        message: "Enter a valid price greater than 0",
      }),
  );

export const adminCreateClassTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description is too long"),
  price: priceField,
  duration: z.coerce
    .number({ invalid_type_error: "Duration must be a number" })
    .int("Duration must be a whole number of minutes")
    .min(1, "Duration must be at least 1 minute")
    .max(480, "Duration cannot exceed 8 hours"),
  imageUrl: requiredSessionTypeImageUrl,
  intensity: z.enum(CLASS_INTENSITIES).default(DEFAULT_CLASS_INTENSITY),
  strictNoTo: z
    .string()
    .trim()
    .max(120, `Not Suitable must be ${120} characters or fewer`)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v == null ? null : v)),
  termsAndConditions: z
    .string()
    .trim()
    .min(10, "Terms & conditions must be at least 10 characters")
    .max(SESSION_TERMS_MAX_LENGTH, "Terms & conditions are too long")
    .optional()
    .nullable()
    .transform((v) => (v === "" || v == null ? null : v)),
});

export const adminCreateInstructorSchema = z.object({
  name: z.string().trim().min(1, "Instructor name is required").max(120, "Name is too long"),
  bio: z
    .string()
    .trim()
    .max(5000, "Bio is too long")
    .optional()
    .nullable()
    .transform((v) => (v === "" || v == null ? null : v)),
  imageUrl: optionalHttpsUrl,
  specialties: z
    .array(z.string().trim().min(1))
    .max(20, "Too many specialties")
    .optional()
    .nullable(),
  email: qrEmailField,
  phone: qrPhoneField,
  onboardingQrImageUrl: instructorQrImageField,
  ycbRegistrationNumber: z
    .string()
    .trim()
    .min(1, "YCB registration number is required")
    .max(80, "YCB registration number is too long"),
  ycbLicenseStatus: z.enum(licenseStatusValues).default("pending"),
  ycbAdminComment: z
    .string()
    .trim()
    .max(2000, "Comment is too long")
    .optional()
    .nullable()
    .transform((v) => (v === "" || v == null ? null : v)),
  yogaAllianceRegistrationNumber: z
    .string()
    .trim()
    .min(1, "Yoga Alliance registration number is required")
    .max(80, "Registration number is too long"),
  yogaAllianceLicenseStatus: z.enum(licenseStatusValues).default("pending"),
  yogaAllianceAdminComment: z
    .string()
    .trim()
    .max(2000, "Comment is too long")
    .optional()
    .nullable()
    .transform((v) => (v === "" || v == null ? null : v)),
});

/** Full profile update from admin (same fields as create). */
export const adminUpdateInstructorSchema = adminCreateInstructorSchema;

export const adminUpdateInstructorStatusSchema = z.object({
  status: z.enum(["pending", "active", "suspended", "blacklisted", "expired"]),
  statusNotes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v == null ? null : v)),
});

export const adminInstructorEmailOtpSchema = z.object({
  otp: z
    .string()
    .trim()
    .length(6, "Enter the 6-digit code")
    .regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const adminPaymentQrCodeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  imageUrl: z
    .string()
    .trim()
    .min(1, "QR image is required")
    .refine(
      (v) => v.startsWith("data:image/") || /^https:\/\/.+/i.test(v),
      "Upload a QR image or provide a valid https URL",
    ),
  contactPhone: qrPhoneField,
  contactEmail: qrEmailField,
});

export const adminCreateClassSessionSchema = z
  .object({
    classTypeId: z.string().trim().min(1, "Select a class type").max(64, "Invalid class type"),
    instructorId: z.string().trim().min(1, "Select an instructor").max(64, "Invalid instructor"),
    date: requiredDateTime,
    maxCapacity: z
      .union([z.string(), z.number()])
      .transform((v) => (typeof v === "number" ? String(v) : v.trim()))
      .pipe(
        z
          .string()
          .min(1, "Max capacity is required")
          .pipe(z.coerce.number())
          .pipe(
            z
              .number()
              .int("Capacity must be a whole number")
              .min(1, "Capacity must be at least 1")
              .max(500, "Capacity cannot exceed 500"),
          ),
      ),
    googleMeetLink: optionalMeetUrl,
    deliveryMode: z.enum(["online", "offline", "hybrid"]).default("online"),
    sessionFrequency: z.enum(["recurring", "drop_in", "trial"]).default("recurring"),
    venueAddress: z.string().trim().optional().nullable(),
    venueMapLink: optionalHttpsUrl,
    venueContactPhone: z.string().trim().optional().nullable(),
    paymentMethod: z.enum(["razorpay_link", "razorpay_gateway", "qr"], {
      required_error: "Select a payment method",
    }),
    razorpayLink: optionalHttpsUrl,
    paymentQrCodeId: z.string().optional().nullable(),
    qrContactPhone: z.string().trim().optional().nullable(),
    qrContactEmail: z.string().trim().optional().nullable(),
    publishMode: z.enum(["now", "later"]).default("now"),
    publishAt: optionalDateTime,
    status: z.enum(["draft", "scheduled", "published", "paused"]).optional(),
    recurrenceKind: z.enum(["once", "weekly"]).default("once"),
    occurrenceCount: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === "") return 1;
        const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
        return Number.isFinite(n) ? n : 1;
      })
      .pipe(z.number().int().min(1).max(MAX_WEEKLY_OCCURRENCES)),
    recurrenceWeekdays: z
      .union([z.array(z.number().int().min(0).max(6)), z.string()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === "") return [] as number[];
        if (Array.isArray(v)) {
          return [...new Set(v.filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b);
        }
        const days = String(v)
          .split(",")
          .map((x) => parseInt(x.trim(), 10))
          .filter((d) => Number.isFinite(d) && d >= 0 && d <= 6);
        return [...new Set(days)].sort((a, b) => a - b);
      }),
    flexiEnabled: z.boolean().optional().default(false),
    flexiSelectionCount: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .optional()
      .transform((v) => {
        if (v == null || v === "") return null;
        const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
        return Number.isFinite(n) ? n : null;
      }),
  })
  .superRefine((data, ctx) => {
    if (data.recurrenceKind === "weekly" && data.occurrenceCount < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recurring series needs at least 2 weeks (or choose One-time)",
        path: ["occurrenceCount"],
      });
    }
    if (data.recurrenceKind === "weekly" && data.recurrenceWeekdays.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one day of the week",
        path: ["recurrenceWeekdays"],
      });
    }
    if (data.flexiEnabled && data.recurrenceKind !== "weekly") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Flexi Mode is only available for weekly schedules",
        path: ["flexiEnabled"],
      });
    }
    if (data.flexiEnabled) {
      const requiredSelections = data.flexiSelectionCount ?? data.recurrenceWeekdays.length;
      if (!requiredSelections || requiredSelections < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Flexi selection count must be at least 1",
          path: ["flexiSelectionCount"],
        });
      }
      if (requiredSelections > 7) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Flexi selection count cannot exceed 7",
          path: ["flexiSelectionCount"],
        });
      }
    }
    if (data.date.getTime() < Date.now() - 60_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Session cannot be scheduled in the past",
        path: ["date"],
      });
    }
    if (data.publishMode === "later") {
      if (!data.publishAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Go-live date and time is required",
          path: ["publishAt"],
        });
      } else if (data.publishAt.getTime() < Date.now() - 60_000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Publish time cannot be in the past",
          path: ["publishAt"],
        });
      }
    }
    if (data.deliveryMode === "online") {
      if (!data.googleMeetLink?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Meet link is required for online sessions",
          path: ["googleMeetLink"],
        });
      }
    } else if (data.deliveryMode === "offline") {
      if (!data.venueAddress?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Studio/Gym address is required for offline sessions",
          path: ["venueAddress"],
        });
      }
      const mapRes = optionalHttpsUrl.safeParse(data.venueMapLink ?? null);
      if (!mapRes.success || !mapRes.data) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Map link is required and must start with https://",
          path: ["venueMapLink"],
        });
      }
      const phoneRes = tenDigitPhoneField.safeParse(data.venueContactPhone ?? "");
      if (!phoneRes.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: phoneRes.error.errors[0]?.message ?? "Invalid venue contact phone",
          path: ["venueContactPhone"],
        });
      }
    } else if (data.deliveryMode === "hybrid") {
      if (!data.googleMeetLink?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Meet link is required for hybrid sessions",
          path: ["googleMeetLink"],
        });
      }
      if (!data.venueAddress?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Studio/Gym address is required for hybrid sessions",
          path: ["venueAddress"],
        });
      }
      const mapRes = optionalHttpsUrl.safeParse(data.venueMapLink ?? null);
      if (!mapRes.success || !mapRes.data) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Map link is required and must start with https://",
          path: ["venueMapLink"],
        });
      }
      const phoneRes = tenDigitPhoneField.safeParse(data.venueContactPhone ?? "");
      if (!phoneRes.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: phoneRes.error.errors[0]?.message ?? "Invalid venue contact phone",
          path: ["venueContactPhone"],
        });
      }
    }
    if (data.paymentMethod === "razorpay_link") {
      const linkResult = razorpayLinkField.safeParse(data.razorpayLink ?? "");
      if (!linkResult.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: linkResult.error.errors[0]?.message ?? "Invalid Razorpay link",
          path: ["razorpayLink"],
        });
      }
    }
    if (data.paymentMethod === "qr") {
      if (!(data.paymentQrCodeId ?? "").trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select a payment QR code",
          path: ["paymentQrCodeId"],
        });
      }
      const phoneResult = qrPhoneField.safeParse(data.qrContactPhone ?? "");
      if (!phoneResult.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: phoneResult.error.errors[0]?.message ?? "Invalid contact phone",
          path: ["qrContactPhone"],
        });
      }
      const emailResult = qrEmailField.safeParse(data.qrContactEmail ?? "");
      if (!emailResult.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: emailResult.error.errors[0]?.message ?? "Invalid contact email",
          path: ["qrContactEmail"],
        });
      }
    }
  })
  .transform((data) => {
    const publishedAt =
      data.publishMode === "now"
        ? new Date()
        : data.publishAt instanceof Date
          ? data.publishAt
          : new Date(data.publishAt!);
    const status =
      data.publishMode === "now"
        ? ("published" as const)
        : publishedAt.getTime() <= Date.now()
          ? ("published" as const)
          : ("scheduled" as const);

    return {
      classTypeId: data.classTypeId,
      instructorId: data.instructorId,
      date: data.date,
      maxCapacity: data.maxCapacity,
      googleMeetLink: data.deliveryMode === "offline" ? null : data.googleMeetLink,
      deliveryMode: data.deliveryMode,
      sessionFrequency: data.sessionFrequency,
      venueAddress:
        data.deliveryMode === "online" ? null : (data.venueAddress ?? "").trim() || null,
      venueMapLink: data.deliveryMode === "online" ? null : data.venueMapLink,
      venueContactPhone:
        data.deliveryMode === "online" ? null : (data.venueContactPhone ?? "").trim() || null,
      paymentMethod: data.paymentMethod,
      razorpayLink: data.paymentMethod === "razorpay_link" ? data.razorpayLink : null,
      paymentQrCodeId: data.paymentMethod === "qr" ? data.paymentQrCodeId : null,
      qrContactPhone: data.paymentMethod === "qr" ? (data.qrContactPhone ?? "").trim() : null,
      qrContactEmail: data.paymentMethod === "qr" ? (data.qrContactEmail ?? "").trim() : null,
      status,
      publishedAt,
      recurrenceKind: data.recurrenceKind,
      occurrenceCount: data.occurrenceCount,
      recurrenceWeekdays:
        data.recurrenceKind === "weekly" ? data.recurrenceWeekdays : [],
      flexiEnabled: data.recurrenceKind === "weekly" ? data.flexiEnabled : false,
      flexiSelectionCount:
        data.recurrenceKind === "weekly" && data.flexiEnabled
          ? data.flexiSelectionCount ?? data.recurrenceWeekdays.length
          : null,
      scheduleSource: "manual" as const,
    };
  });

/** Full session update (admin) — same fields as create; date may change if no bookings. */
export const adminUpdateClassSessionSchema = adminCreateClassSessionSchema;

export type AdminCreateClassTypeInput = z.input<typeof adminCreateClassTypeSchema>;
export type AdminCreateInstructorInput = z.input<typeof adminCreateInstructorSchema>;
export type AdminCreateClassSessionInput = z.input<typeof adminCreateClassSessionSchema>;

export function zodErrorsToFieldMap(
  issues: z.ZodIssue[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0]?.toString() ?? "_form";
    if (!map[key]) map[key] = issue.message;
  }
  return map;
}

export function formatZodErrorsForDisplay(issues: z.ZodIssue[]): string[] {
  return issues.map((i) => {
    const field = i.path.length ? i.path.join(".") : "form";
    return `${field}: ${i.message}`;
  });
}
