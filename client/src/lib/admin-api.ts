import {
  adminCreateClassTypeSchema,
  adminCreateInstructorSchema,
  adminCreateClassSessionSchema,
  zodErrorsToFieldMap,
  formatZodErrorsForDisplay,
} from "@shared/admin-validation";
import type { ZodIssue } from "zod";

export function adminHeaders(): Record<string, string> {
  return { "Content-Type": "application/json" };
}

export async function parseAdminApiError(res: Response): Promise<{
  message: string;
  fieldErrors: Record<string, string>;
}> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const hint =
      res.status === 200
        ? "Server returned HTML instead of JSON. Restart the dev server (npm run dev) and try again."
        : `Request failed (${res.status})`;
    return { message: hint, fieldErrors: {} };
  }
  try {
    const body = await res.json();
    const issues = body.errors as ZodIssue[] | undefined;
    if (issues?.length) {
      return {
        message: body.message || formatZodErrorsForDisplay(issues)[0] || "Please check the form",
        fieldErrors: zodErrorsToFieldMap(issues),
      };
    }
    return { message: body.message || `Request failed (${res.status})`, fieldErrors: {} };
  } catch {
    return { message: `Request failed (${res.status})`, fieldErrors: {} };
  }
}

export function validateClassTypeForm(form: {
  name: string;
  description: string;
  duration: string;
  imageUrl: string;
  intensity: string;
  strictNoTo?: string;
}) {
  const result = adminCreateClassTypeSchema.safeParse({
    name: form.name,
    description: form.description,
    duration: form.duration,
    imageUrl: form.imageUrl.trim(),
    intensity: form.intensity,
    strictNoTo: form.strictNoTo?.trim() || null,
  });
  if (result.success) return { ok: true as const, data: result.data, errors: {} };
  return { ok: false as const, data: null, errors: zodErrorsToFieldMap(result.error.issues) };
}

export function validateInstructorForm(form: {
  name: string;
  bio: string;
  imageUrl: string;
  specialties: string;
  email: string;
  phone: string;
  onboardingQrImageUrl: string;
  ycbRegistrationNumber: string;
  ycbLicenseStatus: string;
  ycbAdminComment: string;
  yogaAllianceRegistrationNumber: string;
  yogaAllianceLicenseStatus: string;
  yogaAllianceAdminComment: string;
}) {
  const specialtiesArr = form.specialties.trim()
    ? form.specialties.split(",").map((s) => s.trim()).filter(Boolean)
    : null;
  const result = adminCreateInstructorSchema.safeParse({
    name: form.name,
    bio: form.bio || null,
    imageUrl: form.imageUrl || null,
    specialties: specialtiesArr,
    email: form.email.trim(),
    phone: form.phone.trim(),
    onboardingQrImageUrl: form.onboardingQrImageUrl.trim(),
    ycbRegistrationNumber: form.ycbRegistrationNumber.trim(),
    ycbLicenseStatus: form.ycbLicenseStatus,
    ycbAdminComment: form.ycbAdminComment || null,
    yogaAllianceRegistrationNumber: form.yogaAllianceRegistrationNumber.trim(),
    yogaAllianceLicenseStatus: form.yogaAllianceLicenseStatus,
    yogaAllianceAdminComment: form.yogaAllianceAdminComment || null,
  });
  if (result.success) return { ok: true as const, data: result.data, errors: {} };
  return { ok: false as const, data: null, errors: zodErrorsToFieldMap(result.error.issues) };
}

export function validateSessionForm(form: {
  classTypeId: string;
  instructorId: string;
  date: string;
  maxCapacity: string;
  googleMeetLink: string;
  deliveryMode?: "online" | "offline" | "hybrid";
  sessionFrequency?: "recurring" | "drop_in" | "trial";
  venueAddress?: string;
  venueMapLink?: string;
  venueContactPhone?: string;
  paymentMethod: "razorpay_link" | "razorpay_gateway" | "qr";
  razorpayLink: string;
  paymentQrCodeId: string;
  qrContactPhone: string;
  qrContactEmail: string;
  publishMode: "now" | "later";
  publishAt: string;
  recurrenceKind: "once" | "weekly";
  occurrenceCount: string;
  recurrenceWeekdays: number[];
  flexiEnabled?: boolean;
}) {
  const result = adminCreateClassSessionSchema.safeParse({
    classTypeId: form.classTypeId.trim(),
    instructorId: form.instructorId.trim(),
    date: form.date.trim(),
    maxCapacity: form.maxCapacity.trim(),
    googleMeetLink: form.googleMeetLink.trim(),
    deliveryMode: form.deliveryMode ?? "online",
    sessionFrequency: form.sessionFrequency ?? "recurring",
    venueAddress:
      (form.deliveryMode ?? "online") === "online" ? null : (form.venueAddress ?? "").trim() || null,
    venueMapLink:
      (form.deliveryMode ?? "online") === "online" ? null : (form.venueMapLink ?? "").trim() || null,
    venueContactPhone:
      (form.deliveryMode ?? "online") === "online"
        ? null
        : (form.venueContactPhone ?? "").trim() || null,
    paymentMethod: form.paymentMethod,
    razorpayLink:
      form.paymentMethod === "razorpay_link" ? form.razorpayLink.trim() || null : null,
    paymentQrCodeId: form.paymentMethod === "qr" ? form.paymentQrCodeId.trim() || null : null,
    qrContactPhone: form.paymentMethod === "qr" ? form.qrContactPhone.trim() || null : null,
    qrContactEmail: form.paymentMethod === "qr" ? form.qrContactEmail.trim() || null : null,
    publishMode: form.publishMode,
    publishAt: form.publishMode === "later" ? form.publishAt.trim() || null : null,
    recurrenceKind: form.recurrenceKind ?? "once",
    occurrenceCount:
      (form.recurrenceKind ?? "once") === "weekly"
        ? form.occurrenceCount.trim() || "2"
        : 1,
    recurrenceWeekdays:
      (form.recurrenceKind ?? "once") === "weekly"
        ? form.recurrenceWeekdays
        : [],
    flexiEnabled:
      (form.recurrenceKind ?? "once") === "weekly" ? !!form.flexiEnabled : false,
  });
  if (result.success) return { ok: true as const, data: result.data, errors: {} };
  return { ok: false as const, data: null, errors: zodErrorsToFieldMap(result.error.issues) };
}
