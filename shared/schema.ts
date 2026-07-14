import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import type { HealthHistoryEntry } from "./health-disclosure";
import { healthMediaLinkSchema } from "./health-media-links";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  primaryMobile: text("primary_mobile"),
  primaryMobileCountryCode: text("primary_mobile_country_code").default("+91"),
  secondaryMobile: text("secondary_mobile"),
  secondaryMobileCountryCode: text("secondary_mobile_country_code").default("+91"),
  emergencyMobile: text("emergency_mobile"),
  emergencyMobileCountryCode: text("emergency_mobile_country_code").default("+91"),
  // Health Update fields - mandatory for booking sessions
  healthUpdateText: text("health_update_text"),
  healthDocumentUrls: text("health_document_urls").array(),
  /** Google Drive / Docs links only — no file bytes stored */
  healthMediaLinks: jsonb("health_media_links").$type<import("./health-media-links").HealthMediaLink[]>(),
  profileCompletionStatus: text("profile_completion_status").default("incomplete"), // 'incomplete', 'complete'
  healthUpdateLastModified: timestamp("health_update_last_modified"),
  /** Archived health notes (max 5); see HealthHistoryEntry */
  healthUpdateHistory: jsonb("health_update_history").$type<HealthHistoryEntry[]>(),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  isActive: boolean("is_active").notNull().default(true),
  sessionAttendanceCount: integer("session_attendance_count").notNull().default(0),
  /** Required for DPDPA age gate; collected at onboarding consent (Ch. 7). */
  dateOfBirth: text("date_of_birth"),
  /** WhatsApp contact consent (primary mobile); audit trail also in consent_audit_logs. */
  whatsappConsent: boolean("whatsapp_consent").notNull().default(false),
  whatsappConsentAt: timestamp("whatsapp_consent_at"),
  whatsappConsentSource: text("whatsapp_consent_source"),
  addressStreet: text("address_street"),
  addressLine2: text("address_line2"),
  addressCity: text("address_city"),
  /** ISO 3166-1 alpha-2 (e.g. IN, US) */
  addressCountry: text("address_country").default("IN"),
  addressState: text("address_state"),
  addressPincode: text("address_pincode"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Practice intensity used for filtering on the member Calendar. */
export const CLASS_INTENSITIES = ["Gentle", "Moderate", "Dynamic", "Restorative"] as const;
export type ClassIntensity = (typeof CLASS_INTENSITIES)[number];
export const DEFAULT_CLASS_INTENSITY: ClassIntensity = "Moderate";

export const classTypes = pgTable("class_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull(), // in minutes
  imageUrl: text("image_url"),
  /** Gentle | Moderate | Dynamic | Restorative */
  intensity: varchar("intensity", { length: 24 }).notNull().default(DEFAULT_CLASS_INTENSITY),
  /** Set when a super admin retires the type; hidden from catalogue pickers. */
  retiredAt: timestamp("retired_at"),
  retirementReason: text("retirement_reason"),
  /** Comma-separated contraindications shown as "Not Suitable" tags (E-01). */
  strictNoTo: text("strict_no_to"),
  /** Booking terms shown at checkout; defaults applied in app when empty. */
  termsAndConditions: text("terms_and_conditions"),
});

/** Max characters for class_types.strict_no_to (admin + server validation). */
export const STRICT_NO_TO_MAX_LENGTH = 120;

export const instructors = pgTable("instructors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  bio: text("bio"),
  imageUrl: text("image_url"),
  specialties: text("specialties").array(),
  email: text("email"),
  phone: text("phone"),
  emailVerified: boolean("email_verified").notNull().default(false),
  /** pending | otp-verified | admin-override */
  verificationMethod: varchar("verification_method", { length: 32 }).notNull().default("pending"),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  emailOtpHash: text("email_otp_hash"),
  emailOtpExpiresAt: timestamp("email_otp_expires_at"),
  emailVerificationToken: text("email_verification_token"),
  /** One-off UPI/payment QR captured at instructor onboarding (separate from session payment QR library). */
  onboardingQrImageUrl: text("onboarding_qr_image_url"),
  /** pending | active | suspended | blacklisted | expired */
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  statusNotes: text("status_notes"),
  ycbRegistrationNumber: text("ycb_registration_number"),
  ycbLicenseStatus: varchar("ycb_license_status", { length: 32 }).notNull().default("pending"),
  ycbAdminComment: text("ycb_admin_comment"),
  yogaAllianceRegistrationNumber: text("yoga_alliance_registration_number"),
  yogaAllianceLicenseStatus: varchar("yoga_alliance_license_status", { length: 32 })
    .notNull()
    .default("pending"),
  yogaAllianceAdminComment: text("yoga_alliance_admin_comment"),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const paymentQrCodes = pgTable("payment_qr_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  contactPhone: text("contact_phone").notNull(),
  contactEmail: text("contact_email").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const classes = pgTable("classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classTypeId: varchar("class_type_id").notNull().references(() => classTypes.id),
  instructorId: varchar("instructor_id").notNull().references(() => instructors.id),
  date: timestamp("date").notNull(),
  maxCapacity: integer("max_capacity").notNull().default(20),
  currentBookings: integer("current_bookings").notNull().default(0),
  googleMeetLink: text("google_meet_link"),
  razorpayLink: text("razorpay_link"),
  /** razorpay_link | razorpay_gateway | qr */
  paymentMethod: varchar("payment_method", { length: 24 }).notNull().default("razorpay_link"),
  paymentQrCodeId: varchar("payment_qr_code_id").references(() => paymentQrCodes.id),
  qrContactPhone: text("qr_contact_phone"),
  qrContactEmail: text("qr_contact_email"),
  status: varchar("status", { length: 20 }).notNull().default("published"), // draft | scheduled | published | paused
  publishedAt: timestamp("published_at"),
  pausedAt: timestamp("paused_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  scheduleSource: varchar("schedule_source", { length: 32 }).notNull().default("manual"),
  recurrenceKind: varchar("recurrence_kind", { length: 16 }).notNull().default("once"),
  /** Comma-separated weekday indices 0–6 (Sun–Sat) for weekly series */
  recurrenceWeekdays: varchar("recurrence_weekdays", { length: 32 }),
  /** Calendar weeks in a weekly series (from admin form) */
  seriesWeekCount: integer("series_week_count"),
  /** online | offline | hybrid */
  deliveryMode: varchar("delivery_mode", { length: 16 }).notNull().default("online"),
  /** recurring | drop_in | trial */
  sessionFrequency: varchar("session_frequency", { length: 16 }).notNull().default("recurring"),
  venueAddress: text("venue_address"),
  venueMapLink: text("venue_map_link"),
  venueContactPhone: text("venue_contact_phone"),
  /** Flexi Mode lets registered members mix eligible recurring schedule days/times. */
  flexiEnabled: boolean("flexi_enabled").notNull().default(false),
  /** Exact number of weekly selections required when starting checkout from this schedule. */
  flexiSelectionCount: integer("flexi_selection_count"),
  seriesId: varchar("series_id"),
  externalProvider: varchar("external_provider", { length: 32 }),
  externalEventId: text("external_event_id"),
});

/**
 * Manually curated "Available Today" carousel promotions (super admin only).
 * When one or more promotions are live (enabled & now within [startAt, endAt]),
 * the referenced sessions are merged into the home carousel at their `position`.
 * When none are live the public site falls back to the regular today's sessions.
 */
export const carouselPromotions = pgTable("carousel_promotions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull().references(() => classes.id),
  /** 0-based placement within the carousel rotation */
  position: integer("position").notNull().default(0),
  /** When the promotion goes live (date + time of making it live) */
  startAt: timestamp("start_at").notNull(),
  /** When the promotion expires */
  endAt: timestamp("end_at").notNull(),
  /** Manual on/off without deleting */
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull().references(() => classes.id),
  userId: varchar("user_id").references(() => users.id),
  /** Trial/drop-in checkout without a member account */
  isGuestCheckout: boolean("is_guest_checkout").notNull().default(false),
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  guestPhone: text("guest_phone"),
  /** When set, a failed gateway payment holds the spot until this time (SPEC-01). */
  heldUntil: timestamp("held_until"),
  /** pending | paid | waived | failed | hold_expired | cancelled_by_user */
  paymentStatus: varchar("payment_status", { length: 24 }).notNull().default("pending"),
  paymentMethod: varchar("payment_method", { length: 20 }),
  transactionAckNumber: text("transaction_ack_number"),
  /** pending | confirmed — manual QR verification */
  verificationStatus: varchar("verification_status", { length: 20 }),
  ackSubmittedAt: timestamp("ack_submitted_at"),
  /** Guest checkout consent flags (Ch. 7 §3) — one row per booking, not user. */
  guestConsentProfile: boolean("guest_consent_profile"),
  guestConsentTerms: boolean("guest_consent_terms"),
  guestConsentAge: boolean("guest_consent_age"),
  guestConsentAt: timestamp("guest_consent_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Append-only consent audit trail (Ch. 7 §5). Never update or delete rows. */
export const consentAuditLogs = pgTable("consent_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  bookingId: varchar("booking_id").references(() => bookings.id),
  consentType: varchar("consent_type", { length: 32 }).notNull(),
  action: varchar("action", { length: 16 }).notNull(),
  consentVersion: varchar("consent_version", { length: 64 }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestampUtc: timestamp("timestamp_utc").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Account erasure requests — processed within 30 days (Ch. 5). */
export const erasureRequests = pgTable("erasure_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  requestedAt: timestamp("requested_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  scheduledErasureAt: timestamp("scheduled_erasure_at").notNull(),
  completedAt: timestamp("completed_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  /** Nullable so class/booking hard-delete can detach rows (Companies Act s.128 retention). */
  bookingId: varchar("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  classId: varchar("class_id").references(() => classes.id, { onDelete: "set null" }),
  amountPaise: integer("amount_paise").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  razorpaySignature: text("razorpay_signature"),
  gatewayProvider: varchar("gateway_provider", { length: 32 }),
  gatewayReference: text("gateway_reference"),
  payerName: text("payer_name"),
  payerEmail: text("payer_email"),
  payerPhone: text("payer_phone"),
  /** Razorpay instrument: upi, card, netbanking, wallet, etc. */
  gatewayPaymentMethod: varchar("gateway_payment_method", { length: 32 }),
  /** pending | received | failed | dispute */
  adminDisposition: varchar("admin_disposition", { length: 20 }).notNull().default("pending"),
  /** created | pending | paid | failed | refunded */
  status: varchar("status", { length: 20 }).notNull().default("created"),
  receiptUrl: text("receipt_url"),
  invoiceUrl: text("invoice_url"),
  failureReason: text("failure_reason"),
  couponId: varchar("coupon_id"),
  originalAmountPaise: integer("original_amount_paise"),
  discountAmountPaise: integer("discount_amount_paise").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  paidAt: timestamp("paid_at"),
});

export const contactMessages = pgTable("contact_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Health Document Management - vendor-neutral file metadata
export const userDocuments = pgTable("user_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  fileType: varchar("file_type", { length: 255 }).notNull(), // Fixed: MIME types can be long (e.g., application/vnd.openxmlformats-officedocument.wordprocessingml.document)
  fileSize: integer("file_size").notNull(),
  storageProvider: varchar("storage_provider", { length: 50 }).notNull().default("s3"), // 's3', 'gcs', 'local'
  storageKey: text("storage_key").notNull(), // provider-specific file identifier
  checksum: varchar("checksum", { length: 64 }).notNull(), // file integrity verification
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Session-User Mapping for tracking session history
export const userSessionMappings = pgTable("user_session_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  classId: varchar("class_id").notNull().references(() => classes.id),
  status: varchar("status", { length: 20 }).notNull().default("upcoming"), // 'upcoming', 'completed', 'cancelled'
  bookedAt: timestamp("booked_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  attendedAt: timestamp("attended_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Audit trail for compliance and security
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  action: varchar("action", { length: 50 }).notNull(),
  resourceType: varchar("resource_type", { length: 50 }).notNull(),
  resourceId: varchar("resource_id"),
  metadata: text("metadata"), // JSON string for flexible data
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Pre/post session mood (instructor aggregate API — see awy.md backlog) */
export const sessionMoodCheckins = pgTable("session_mood_checkins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  classId: varchar("class_id").notNull().references(() => classes.id),
  phase: varchar("phase", { length: 10 }).notNull(), // 'pre' | 'post'
  moodId: varchar("mood_id", { length: 32 }).notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Shadow attendance when member opens Meet link (not Google Meet API attendance) */
export const sessionJoinEvents = pgTable("session_join_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  classId: varchar("class_id").notNull().references(() => classes.id),
  joinedAt: timestamp("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Runtime platform flags controlled by super admin (SPEC-GG-01). */
export const platformSettings = pgTable("platform_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: varchar("updated_by").references(() => adminUsers.id),
});

// Admin users for admin console access
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("admin"), // 'admin', 'super_admin'
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const adminProfiles = pgTable("admin_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: varchar("admin_user_id").notNull().references(() => adminUsers.id),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  governmentIdImageUrl: text("government_id_image_url"),
  verificationStatus: varchar("verification_status", { length: 20 }).notNull().default("pending"),
  verificationNotes: text("verification_notes"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const classTypeNotifyRequests = pgTable("class_type_notify_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classTypeId: varchar("class_type_id").notNull().references(() => classTypes.id),
  userId: varchar("user_id").references(() => users.id),
  email: text("email").notNull(),
  whatsapp: text("whatsapp"),
  source: varchar("source", { length: 20 }).notNull().default("WL-G"),
  emailSendStatus: varchar("email_send_status", { length: 20 }).default("pending"),
  emailSendError: text("email_send_error"),
  emailSendCount: integer("email_send_count").notNull().default(0),
  lastEmailedAt: timestamp("last_emailed_at"),
  unsubscribedAt: timestamp("unsubscribed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  classTypeId: varchar("class_type_id").notNull().references(() => classTypes.id),
  bookingId: varchar("booking_id").references(() => bookings.id),
  flexiBookingId: varchar("flexi_booking_id"),
  subscriptionType: varchar("subscription_type", { length: 16 }).notNull(), // drop_in | trial | recurring
  totalSessions: integer("total_sessions").notNull().default(1),
  utilizedSessions: integer("utilized_sessions").notNull().default(0),
  refundedSessions: integer("refunded_sessions").notNull().default(0),
  disputedSessions: integer("disputed_sessions").notNull().default(0),
  disputesResolved: integer("disputes_resolved").notNull().default(0),
  waivedSessions: integer("waived_sessions").notNull().default(0),
  totalAmountPaise: integer("total_amount_paise").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const flexiBookings = pgTable("flexi_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  anchorClassId: varchar("anchor_class_id").notNull().references(() => classes.id),
  classTypeId: varchar("class_type_id").notNull().references(() => classTypes.id),
  instructorId: varchar("instructor_id").notNull().references(() => instructors.id),
  subscriptionId: varchar("subscription_id"),
  bookingId: varchar("booking_id").references(() => bookings.id),
  selectionCount: integer("selection_count").notNull(),
  horizonStartAt: timestamp("horizon_start_at").notNull(),
  horizonEndAt: timestamp("horizon_end_at").notNull(),
  holdExpiresAt: timestamp("hold_expires_at"),
  paymentStatus: varchar("payment_status", { length: 24 }).notNull().default("pending"),
  paymentMethod: varchar("payment_method", { length: 20 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  editCount: integer("edit_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const flexiBookingSelections = pgTable("flexi_booking_selections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  flexiBookingId: varchar("flexi_booking_id")
    .notNull()
    .references(() => flexiBookings.id),
  weekday: integer("weekday").notNull(),
  sourceSeriesId: varchar("source_series_id").notNull(),
  sourceClassId: varchar("source_class_id").notNull().references(() => classes.id),
  sourceTimeLabel: text("source_time_label"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const flexiBookingOccurrences = pgTable("flexi_booking_occurrences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  flexiBookingId: varchar("flexi_booking_id")
    .notNull()
    .references(() => flexiBookings.id),
  classId: varchar("class_id").notNull().references(() => classes.id),
  weekday: integer("weekday").notNull(),
  occurrenceDate: timestamp("occurrence_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("reserved"),
  holdExpiresAt: timestamp("hold_expires_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Checkout discount codes — admin-created, OTP-gated, strict expiry. */
export const couponCodes = pgTable("coupon_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 32 }).notNull().unique(),
  discountType: varchar("discount_type", { length: 16 }).notNull(), // fixed | percent
  /** Paise for fixed; 0–100 for percent */
  discountValue: integer("discount_value").notNull(),
  classTypeId: varchar("class_type_id").references(() => classTypes.id),
  classId: varchar("class_id").references(() => classes.id),
  expiresAt: timestamp("expires_at").notNull(),
  maxUses: integer("max_uses"),
  useCount: integer("use_count").notNull().default(0),
  status: varchar("status", { length: 16 }).notNull().default("active"), // active | revoked
  createdByAdminId: varchar("created_by_admin_id").notNull().references(() => adminUsers.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const couponRedemptions = pgTable("coupon_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  couponId: varchar("coupon_id").notNull().references(() => couponCodes.id),
  userId: varchar("user_id").references(() => users.id),
  bookingId: varchar("booking_id").references(() => bookings.id),
  paymentId: varchar("payment_id").references(() => payments.id),
  classTypeId: varchar("class_type_id").references(() => classTypes.id),
  classId: varchar("class_id").references(() => classes.id),
  originalAmountPaise: integer("original_amount_paise").notNull(),
  discountAmountPaise: integer("discount_amount_paise").notNull(),
  finalAmountPaise: integer("final_amount_paise").notNull(),
  redeemedAt: timestamp("redeemed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const couponShareLogs = pgTable("coupon_share_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  couponId: varchar("coupon_id").notNull().references(() => couponCodes.id),
  adminId: varchar("admin_id").notNull().references(() => adminUsers.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  channel: varchar("channel", { length: 16 }).notNull(), // email | sms | whatsapp
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  emailVerified: true,
  emailVerificationToken: true,
  profileCompletionStatus: true,
  healthUpdateLastModified: true,
  healthUpdateHistory: true,
  healthMediaLinks: true,
  createdAt: true,
  updatedAt: true,
});

export const registerUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = createInsertSchema(users)
  .pick({
    name: true,
    primaryMobile: true,
    primaryMobileCountryCode: true,
    secondaryMobile: true,
    secondaryMobileCountryCode: true,
    emergencyMobile: true,
    emergencyMobileCountryCode: true,
    healthUpdateText: true,
    healthDocumentUrls: true,
    dateOfBirth: true,
    whatsappConsent: true,
    addressStreet: true,
    addressLine2: true,
    addressCity: true,
    addressCountry: true,
    addressState: true,
    addressPincode: true,
  })
  .partial();

/** Partial profile update (e.g. save phone as soon as entered). */
export const updateProfilePartialSchema = updateProfileSchema.extend({
  whatsappConsentSource: z.string().trim().max(80).optional().nullable(),
});

// Health Update validation schema with mandatory text field
export const healthUpdateSchema = z.object({
  healthUpdateText: z.string().min(1, "Health update is required. Enter 'None' if no health concerns to share."),
  healthDocumentUrls: z.array(z.string()).optional(),
  healthMediaLinks: z.array(healthMediaLinkSchema).optional(),
});

// User document management schemas
export const insertUserDocumentSchema = createInsertSchema(userDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Session mapping schemas
export const insertUserSessionMappingSchema = createInsertSchema(userSessionMappings).omit({
  id: true,
  bookedAt: true,
  updatedAt: true,
});

// Audit logging schema
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// Admin user schemas
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  passwordHash: true,
  createdAt: true,
});
export const insertAdminProfileSchema = createInsertSchema(adminProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verifiedAt: true,
});
export const insertNotifyRequestSchema = createInsertSchema(classTypeNotifyRequests).omit({
  id: true,
  createdAt: true,
  unsubscribedAt: true,
});
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertFlexiBookingSchema = createInsertSchema(flexiBookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertFlexiBookingSelectionSchema = createInsertSchema(flexiBookingSelections).omit({
  id: true,
  createdAt: true,
});
export const insertFlexiBookingOccurrenceSchema = createInsertSchema(flexiBookingOccurrences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createCouponCodeSchema = z
  .object({
    code: z.string().trim().min(4).max(32).optional(),
    discountType: z.enum(["fixed", "percent"]),
    /** Rupees for fixed; 1–100 for percent */
    discountValue: z.coerce.number().positive(),
    classTypeId: z.string().min(1).optional().nullable(),
    classId: z.string().min(1).optional().nullable(),
    expiresAt: z.coerce.date(),
    maxUses: z.coerce.number().int().positive().optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
    otp: z.string().trim().length(6, "Enter the 6-digit OTP"),
  })
  .refine((v) => v.expiresAt.getTime() > Date.now(), {
    message: "Deadline must be in the future",
    path: ["expiresAt"],
  })
  .refine(
    (v) =>
      v.discountType !== "percent" ||
      (v.discountValue >= 1 && v.discountValue <= 100),
    { message: "Percent discount must be between 1 and 100", path: ["discountValue"] },
  );

export const shareCouponSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, "Select at least one member"),
  channels: z
    .array(z.enum(["email", "sms", "whatsapp"]))
    .min(1, "Select at least one channel"),
});

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1),
  classId: z.string().min(1),
});

export const insertCouponCodeSchema = createInsertSchema(couponCodes).omit({
  id: true,
  useCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClassTypeSchema = createInsertSchema(classTypes, {
  intensity: z.enum(CLASS_INTENSITIES).default(DEFAULT_CLASS_INTENSITY),
}).omit({
  id: true,
});

export const insertInstructorSchema = createInsertSchema(instructors).omit({
  id: true,
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  currentBookings: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

/** Member POST /api/bookings — only classId; userId is taken from the auth session. */
export const memberBookingBodySchema = z.object({
  classId: z.string().min(1, "Class is required"),
});

/** Guest phone on POST /api/bookings (required only for guest checkout). */
export const guestPhoneSchema = z
  .string()
  .min(1, "A valid 10-digit mobile number is required to complete your booking.")
  .transform((v) => v.replace(/\D/g, "").slice(0, 10))
  .refine((v) => v.length === 10, {
    message: "A valid 10-digit mobile number is required to complete your booking.",
  });

/** POST /api/bookings — members send classId only; guests add contact + consent fields. */
export const createBookingRequestSchema = memberBookingBodySchema.extend({
  guestEmail: z.string().trim().email().max(120).optional(),
  guestName: z.string().trim().min(1).max(80).optional(),
  guestPhone: guestPhoneSchema.optional(),
  guestConsentProfile: z.boolean().optional(),
  guestConsentTerms: z.boolean().optional(),
  guestConsentAge: z.boolean().optional(),
  consentVersion: z.string().optional(),
  flexiSelections: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        sourceSeriesId: z.string().min(1),
        sourceClassId: z.string().min(1),
        timeLabel: z.string().min(1),
      }),
    )
    .optional(),
});

export const memberPaymentAckSchema = z.object({
  transactionAckNumber: z
    .string()
    .trim()
    .length(4, "Enter exactly 4 characters from your payment reference or payment ID")
    .regex(
      /^[A-Za-z0-9]{4}$/,
      "Use 4 letters or numbers from your payment reference or payment ID",
    ),
});

export const insertPaymentQrCodeSchema = createInsertSchema(paymentQrCodes).omit({
  id: true,
  createdAt: true,
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true,
});

export const insertCarouselPromotionSchema = createInsertSchema(carouselPromotions, {
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  position: z.coerce.number().int().min(0).max(99),
})
  .omit({ id: true, createdAt: true, updatedAt: true })
  .refine((v) => v.endAt > v.startAt, {
    message: "End time must be after the start time",
    path: ["endAt"],
  });

export const updateCarouselPromotionSchema = createInsertSchema(carouselPromotions, {
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  position: z.coerce.number().int().min(0).max(99),
})
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial()
  .refine((v) => !(v.startAt && v.endAt) || v.endAt > v.startAt, {
    message: "End time must be after the start time",
    path: ["endAt"],
  });

// Original types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type HealthUpdate = z.infer<typeof healthUpdateSchema>;

export type ClassType = typeof classTypes.$inferSelect;
export type InsertClassType = z.infer<typeof insertClassTypeSchema>;
export type Instructor = typeof instructors.$inferSelect;
export type InsertInstructor = z.infer<typeof insertInstructorSchema>;
export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
export type MemberBookingBody = z.infer<typeof memberBookingBodySchema>;
export type MemberPaymentAck = z.infer<typeof memberPaymentAckSchema>;
export type PaymentQrCode = typeof paymentQrCodes.$inferSelect;
export type InsertPaymentQrCode = z.infer<typeof insertPaymentQrCodeSchema>;
export type CarouselPromotion = typeof carouselPromotions.$inferSelect;
export type InsertCarouselPromotion = z.infer<typeof insertCarouselPromotionSchema>;
export type UpdateCarouselPromotion = z.infer<typeof updateCarouselPromotionSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;

// New health data management types
export type UserDocument = typeof userDocuments.$inferSelect;
export type InsertUserDocument = z.infer<typeof insertUserDocumentSchema>;
export type UserSessionMapping = typeof userSessionMappings.$inferSelect;
export type InsertUserSessionMapping = z.infer<typeof insertUserSessionMappingSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type PlatformSetting = typeof platformSettings.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminProfile = typeof adminProfiles.$inferSelect;
export type InsertAdminProfile = z.infer<typeof insertAdminProfileSchema>;
export type ClassTypeNotifyRequest = typeof classTypeNotifyRequests.$inferSelect;
export type InsertNotifyRequest = z.infer<typeof insertNotifyRequestSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type FlexiBooking = typeof flexiBookings.$inferSelect;
export type InsertFlexiBooking = z.infer<typeof insertFlexiBookingSchema>;
export type FlexiBookingSelection = typeof flexiBookingSelections.$inferSelect;
export type InsertFlexiBookingSelection = z.infer<typeof insertFlexiBookingSelectionSchema>;
export type FlexiBookingOccurrence = typeof flexiBookingOccurrences.$inferSelect;
export type InsertFlexiBookingOccurrence = z.infer<typeof insertFlexiBookingOccurrenceSchema>;
export type CouponCode = typeof couponCodes.$inferSelect;
export type InsertCouponCode = z.infer<typeof insertCouponCodeSchema>;
export type CouponRedemption = typeof couponRedemptions.$inferSelect;
export type CouponShareLog = typeof couponShareLogs.$inferSelect;
export type ConsentAuditLog = typeof consentAuditLogs.$inferSelect;
export type ErasureRequest = typeof erasureRequests.$inferSelect;
