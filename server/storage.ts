import { 
  type User, 
  type InsertUser,
  type RegisterUser,
  type UpdateProfile,
  type ClassType,
  type InsertClassType,
  type Instructor,
  type InsertInstructor,
  type Class,
  type InsertClass,
  type Booking,
  type InsertBooking,
  type Payment,
  type InsertPayment,
  type ContactMessage,
  type InsertContactMessage,
  type AdminUser,
  type InsertAdminUser,
  type AdminProfile,
  type InsertAdminProfile,
  type ClassTypeNotifyRequest,
  type InsertNotifyRequest,
  type Subscription,
  type InsertSubscription,
  type CouponCode,
  type InsertCouponCode,
  type CouponRedemption,
  type CouponShareLog,
  type PaymentQrCode,
  type InsertPaymentQrCode,
  type CarouselPromotion,
  type InsertCarouselPromotion,
  type UpdateCarouselPromotion,
  type PlatformSetting,
  type InsertAuditLog,
  users,
  classTypes,
  instructors,
  classes,
  bookings,
  payments,
  paymentQrCodes,
  contactMessages,
  adminUsers,
  adminProfiles,
  classTypeNotifyRequests,
  subscriptions,
  couponCodes,
  couponRedemptions,
  couponShareLogs,
  carouselPromotions,
  platformSettings,
  sessionMoodCheckins,
  sessionJoinEvents,
  userSessionMappings,
  auditLogs,
  consentAuditLogs,
  erasureRequests,
  userDocuments,
  DEFAULT_CLASS_INTENSITY,
} from "@shared/schema";
import { consentVersion, scheduledErasureDate, type ConsentLogInput } from "./consent";
import type { ConsentType } from "@shared/consent";
import { db } from "./db";
import { eq, and, gte, lte, sql, or, isNull, desc, inArray, notInArray, gt, count, lt, not, like } from "drizzle-orm";
import {
  QA_AGENT_CLASS_TYPE_PREFIX,
  QA_FIXTURE_CLASS_TYPE_PREFIX,
  QA_SMOKE_CLASS_TYPE_PREFIX,
  SEED_CLASS_TYPE_NAMES,
} from "../shared/seed-catalog";
import { BOOKING_PAYMENT_STATUS, canResumePaymentCheckout, bookingCountsTowardCapacity } from "@shared/booking-payment-hold";
import { paginationOffset } from "@shared/admin-pagination";
import {
  computeProfileCompletionStatus,
  isAccountProfileComplete,
  getAccountProfileIncompleteReasons,
  isHealthDisclosureComplete,
} from "@shared/profileCompleteness";
import type { HealthHistoryEntry } from "@shared/health-disclosure";
import { classifyMemberSessionStatus } from "@shared/member-session-status";
import {
  bookingIsResumableCheckout,
  existingBookingBlocksNewBooking,
} from "@shared/member-booking-duplicate";
import { getMeetJoinState } from "@shared/session-meet-access";
import { dispositionFromPaymentStatus, normalizeSessionPaymentMethod, usesHostedCheckout } from "@shared/payment-gateway";
import {
  evaluateCouponApplicability,
  isCouponNotExpired,
  normalizeCouponCode,
} from "@shared/coupons";
import { hashPassword, verifyPassword } from "./auth";
import {
  getAdminBootstrapConfig,
  normalizeAdminEmail,
  normalizeAdminPassword,
} from "./admin-bootstrap";
import { deleteHealthDocumentObject } from "./health-document-upload";
import { hasHealthSupportingMaterials, type HealthMediaLink } from "@shared/health-media-links";

/** Resolves after first DB init + admin bootstrap sync (await before handling traffic). */
let resolveStorageReady: () => void = () => {};
export const storageReady = new Promise<void>((resolve) => {
  resolveStorageReady = resolve;
});

/** SQL filter shared by all member-facing session catalog queries. */
function bookableClassSqlConditions(now: Date = new Date()) {
  return and(
    isNull(classes.pausedAt),
    isNull(classes.cancelledAt),
    not(inArray(classes.status, ["paused", "cancelled", "draft"])),
    or(
      eq(classes.status, "published"),
      and(eq(classes.status, "scheduled"), lte(classes.publishedAt, now)),
    ),
  );
}

// Profile completeness interface for admin console
export interface MemberSessionRow {
  id: string;
  bookingId: string;
  classId: string;
  className: string;
  instructorName: string;
  sessionDate: string;
  googleMeetLink: string | null;
  status: "upcoming" | "completed" | "cancelled";
  isLive: boolean;
  cancellationReason: string | null;
  paymentStatus: string;
  paymentMethod: string | null;
  verificationStatus: string | null;
  paidAt: string | null;
  receiptUrl: string | null;
  invoiceUrl: string | null;
  amountPaise: number | null;
  bookedAt: string;
  sessionDurationMinutes: number;
  meetJoinState: "hidden" | "disabled" | "active";
}

export interface PendingQrBookingRow {
  bookingId: string;
  verificationStatus: string;
  transactionAckNumber: string | null;
  ackSubmittedAt: string | null;
  paymentStatus: string;
  userId: string;
  userName: string;
  userEmail: string;
  classId: string;
  className: string;
  sessionDate: string;
  instructorName: string;
  price: string;
}

export interface PaymentHistoryRow {
  id: string;
  bookingId: string;
  userId: string | null;
  userName: string;
  userEmail: string;
  className: string;
  sessionDate: string;
  amountPaise: number | null;
  currency: string;
  paymentMethod: string | null;
  gatewayProvider: string | null;
  gatewayReference: string | null;
  payerName: string | null;
  payerEmail: string | null;
  payerPhone: string | null;
  gatewayPaymentMethod: string | null;
  status: string;
  adminDisposition: string;
  bookingPaymentStatus: string | null;
  verificationStatus: string | null;
  transactionAckNumber: string | null;
  receiptUrl: string | null;
  invoiceUrl: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface SubscriptionSummaryRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  classTypeId: string;
  classTypeName: string;
  subscriptionType: string;
  totalAmountPaise: number;
  totalSessions: number;
  utilizedSessions: number;
  refundedSessions: number;
  disputedSessions: number;
  disputesResolved: number;
  waivedSessions: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface CouponAdminSummaryRow {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  classTypeId: string | null;
  classTypeName: string | null;
  classId: string | null;
  sessionLabel: string | null;
  expiresAt: string;
  maxUses: number | null;
  useCount: number;
  status: string;
  createdByAdminName: string;
  notes: string | null;
  createdAt: string;
  isExpired: boolean;
  redemptionCount: number;
  totalDiscountPaise: number;
}

export interface CouponRedemptionRow {
  id: string;
  couponId: string;
  couponCode: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  bookingId: string | null;
  paymentId: string | null;
  classTypeId: string | null;
  classTypeName: string | null;
  classId: string | null;
  sessionDate: string | null;
  originalAmountPaise: number;
  discountAmountPaise: number;
  finalAmountPaise: number;
  redeemedAt: string;
}

export interface AdminWaitlistRow {
  id: string;
  classTypeId: string;
  classTypeName: string;
  userId: string | null;
  userName: string | null;
  email: string;
  whatsapp: string | null;
  source: string;
  emailSendStatus: string | null;
  emailSendError: string | null;
  emailSendCount: number;
  lastEmailedAt: string | null;
  createdAt: string;
}

export interface ProfileCompleteness {
  isComplete: boolean;
  healthUpdateComplete: boolean;  // ≥10 characters
  documentsComplete: boolean;     // Valid uploaded files
  emailVerified: boolean;
  completionPercentage: number;   // 0-100%
  flags: string[];               // Array of flag descriptions
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpdateProfile>): Promise<User | undefined>;
  updateUserHealthData(id: string, healthData: { 
    healthUpdateText: string; 
    healthDocumentUrls: string[]; 
    healthMediaLinks?: HealthMediaLink[];
    healthUpdateHistory?: HealthHistoryEntry[];
    profileCompletionStatus: string;
    healthUpdateLastModified: string;
  }): Promise<User | undefined>;
  /** Re-reads user, sets profile_completion_status from mandatory profile + health rules */
  recomputeProfileCompletionStatus(id: string): Promise<User | undefined>;
  verifyUserEmail(id: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  findUserByEmail(email: string): Promise<User | undefined>;
  updateUserResetToken(id: string, token: string, expiry: Date): Promise<User | undefined>;
  findUserByResetToken(token: string): Promise<User | undefined>;
  updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined>;
  clearUserResetToken(id: string): Promise<User | undefined>;
  getUserDocuments(userId: string): Promise<(typeof userDocuments.$inferSelect)[]>;
  
  // Class Types
  getAllClassTypes(): Promise<ClassType[]>;
  getClassType(id: string): Promise<ClassType | undefined>;
  createClassType(classType: InsertClassType): Promise<ClassType>;
  updateClassType(id: string, updates: Partial<InsertClassType>): Promise<ClassType | undefined>;
  deleteClassType(id: string): Promise<{ ok: boolean; message?: string }>;
  retireClassTypeWithSessionCancellation(
    classTypeId: string,
    reason: string,
  ): Promise<{
    ok: boolean;
    message?: string;
    sessionsCancelled?: number;
    hardDeleted?: boolean;
    classTypeName?: string;
    noticePayloads?: Array<{
      recipients: Array<{
        key: string;
        name: string;
        email: string | null;
        phone: string | null;
        phoneCountryCode: string | null;
        whatsappConsent: boolean;
      }>;
      sessionDateIso?: string;
      instructorName?: string;
    }>;
  }>;
  countClassesByClassTypeId(classTypeId: string): Promise<number>;
  getClassTypeIdsWithUpcomingSessions(): Promise<string[]>;

  // Carousel promotions (super admin curated "Available Today" cards)
  getCarouselPromotions(): Promise<CarouselPromotion[]>;
  getActiveCarouselPromotions(now?: Date): Promise<CarouselPromotion[]>;
  getCarouselPromotion(id: string): Promise<CarouselPromotion | undefined>;
  createCarouselPromotion(promotion: InsertCarouselPromotion): Promise<CarouselPromotion>;
  updateCarouselPromotion(
    id: string,
    updates: UpdateCarouselPromotion,
  ): Promise<CarouselPromotion | undefined>;
  deleteCarouselPromotion(id: string): Promise<{ ok: boolean; message?: string }>;

  // Platform settings (SPEC-GG-01)
  getPlatformSetting(key: string): Promise<PlatformSetting | undefined>;
  getAllPlatformSettings(): Promise<PlatformSetting[]>;
  upsertPlatformSetting(
    key: string,
    value: unknown,
    updatedBy: string | null,
  ): Promise<PlatformSetting>;

  createNotifyRequest(data: InsertNotifyRequest): Promise<ClassTypeNotifyRequest>;
  getActiveNotifyRequestsByClassTypeId(classTypeId: string): Promise<ClassTypeNotifyRequest[]>;
  updateNotifyRequestEmailStatus(
    id: string,
    status: "sent" | "failed",
    options?: { error?: string | null; sentAt?: Date | null },
  ): Promise<ClassTypeNotifyRequest | undefined>;
  getNotifyRequestsForAdmin(): Promise<AdminWaitlistRow[]>;
  getRecurringSeriesBounds(
    seriesId: string,
  ): Promise<{ startAt: Date; endAt: Date } | undefined>;
  countClassesInSeries(seriesId: string): Promise<number>;
  findNextRecurringClassAfter(
    classTypeId: string,
    afterDate: Date,
    excludeSeriesId?: string | null,
  ): Promise<Class | undefined>;
  
  // Instructors
  getAllInstructors(): Promise<Instructor[]>;
  getPublicInstructors(): Promise<Instructor[]>;
  getSessionEligibleInstructors(): Promise<Instructor[]>;
  getInstructor(id: string): Promise<Instructor | undefined>;
  createInstructor(instructor: InsertInstructor): Promise<Instructor>;
  updateInstructor(id: string, updates: Partial<InsertInstructor>): Promise<Instructor | undefined>;
  setInstructorEmailOtp(
    id: string,
    hash: string,
    expiresAt: Date,
    linkToken: string,
  ): Promise<Instructor | undefined>;
  getInstructorByEmailVerificationToken(token: string): Promise<Instructor | undefined>;
  markInstructorEmailVerified(
    id: string,
    method: "otp-verified" | "admin-override",
    options?: { clearOtp?: boolean },
  ): Promise<Instructor | undefined>;
  markInstructorPhoneVerified(id: string): Promise<Instructor | undefined>;
  updateInstructorStatus(
    id: string,
    status: string,
    statusNotes: string | null,
  ): Promise<Instructor | undefined>;
  reconcileInstructorStatus(id: string): Promise<Instructor | undefined>;
  
  // Classes
  getAllClasses(): Promise<Class[]>;
  getPublishedClasses(): Promise<Class[]>;
  getClass(id: string): Promise<Class | undefined>;
  getClassesByDate(date: Date): Promise<Class[]>;
  getBookableClassesByDate(date: Date): Promise<Class[]>;
  getClassesInRange(start: Date, end: Date): Promise<Class[]>;
  createClass(classData: InsertClass & { status?: string; publishedAt?: Date | null; pausedAt?: Date | null }): Promise<Class>;
  updateClassSession(id: string, updates: Partial<InsertClass & { status?: string; publishedAt?: Date | null; pausedAt?: Date | null }>): Promise<Class | undefined>;
  pauseClassSession(id: string): Promise<Class | undefined>;
  resumeClassSession(id: string): Promise<Class | undefined>;
  deleteClassSession(id: string): Promise<{ ok: boolean; message?: string }>;
  hardDeleteClassSession(
    id: string,
    reason: string,
  ): Promise<{
    ok: boolean;
    message?: string;
    classTypeName?: string;
    instructorName?: string;
    sessionDateIso?: string;
    bookingCount?: number;
    recipients?: Array<{
      key: string;
      name: string;
      email: string | null;
      phone: string | null;
      phoneCountryCode: string | null;
      whatsappConsent: boolean;
    }>;
  }>;
  cancelClassSession(
    id: string,
    reason: string,
  ): Promise<{
    ok: boolean;
    message?: string;
    classTypeName?: string;
    instructorName?: string;
    sessionDateIso?: string;
    recipients?: Array<{
      key: string;
      name: string;
      email: string | null;
      phone: string | null;
      phoneCountryCode: string | null;
      whatsappConsent: boolean;
    }>;
  }>;
  /** @deprecated Prefer cancelClassSession after OTP check in routes. */
  cancelClassSessionWithBookings(
    id: string,
    reason: string,
    ownerOtp: string,
  ): Promise<{ ok: boolean; message?: string }>;
  findNextSessionForClassType(
    classTypeId: string,
    after: Date,
    sessionFrequencies?: string[],
  ): Promise<Class | undefined>;
  countBookingsForClass(classId: string): Promise<number>;
  setUserActive(id: string, isActive: boolean): Promise<User | undefined>;
  deleteUserPermanently(id: string): Promise<{ ok: boolean; message?: string }>;
  deleteUsersPermanently(
    ids: string[],
  ): Promise<{ deleted: string[]; failed: Array<{ id: string; message: string }> }>;
  recordSessionJoin(userId: string, classId: string): Promise<void>;
  recordMoodCheckin(userId: string, classId: string, phase: "pre" | "post", moodId: string): Promise<void>;
  updateClassBookingCount(id: string, count: number): Promise<Class | undefined>;
  
  // Bookings
  getAllBookings(): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingsByClass(classId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  countActiveBookingsForClass(classId: string): Promise<number>;
  syncClassBookingCount(classId: string): Promise<number>;
  findResumableBookingForClass(userId: string, classId: string): Promise<Booking | undefined>;
  findResumableGuestBookingForClass(
    guestEmail: string,
    classId: string,
  ): Promise<Booking | undefined>;
  getUserBookings(userId: string): Promise<Booking[]>;
  userHasUpcomingBookingForClass(userId: string, classId: string): Promise<boolean>;
  guestHasUpcomingBookingForClass(guestEmail: string, classId: string): Promise<boolean>;
  getGuestBookingConflict(
    guestEmail: string,
    classId: string,
  ): Promise<{
    state: import("@shared/guest-booking-conflict").GuestBookingConflictState;
    booking?: Booking;
    canResumePayment?: boolean;
  }>;
  linkGuestBookingsToUser(userId: string, email: string): Promise<number>;
  updateBookingPaymentStatus(
    bookingId: string,
    paymentStatus: string,
  ): Promise<Booking | undefined>;
  updateBookingPaymentHold(
    bookingId: string,
    data: { paymentStatus?: string; heldUntil?: string | null },
  ): Promise<Booking | undefined>;
  findBookingsWithExpiredPaymentHold(): Promise<Booking[]>;
  ensureUserSessionMapping(userId: string, classId: string): Promise<void>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentById(id: string): Promise<Payment | undefined>;
  getPaymentByBookingId(bookingId: string): Promise<Payment | undefined>;
  getPaymentByRazorpayOrderId(orderId: string): Promise<Payment | undefined>;
  updatePayment(id: string, updates: Partial<InsertPayment>): Promise<Payment | undefined>;
  ensurePaymentStubForBooking(params: {
    bookingId: string;
    userId: string | null;
    classId: string;
    amountPaise: number;
    gatewayProvider: string;
    payerName?: string | null;
    payerEmail?: string | null;
    payerPhone?: string | null;
    gatewayReference?: string | null;
  }): Promise<Payment>;
  getPaymentHistoryForAdmin(): Promise<PaymentHistoryRow[]>;
  getPaymentHistoryForUser(userId: string): Promise<PaymentHistoryRow[]>;
  updatePaymentAdminDisposition(
    paymentId: string,
    disposition: string,
  ): Promise<Payment | undefined>;
  getMemberSessions(userId: string): Promise<MemberSessionRow[]>;
  getAllPaymentQrCodes(): Promise<PaymentQrCode[]>;
  getPaymentQrCode(id: string): Promise<PaymentQrCode | undefined>;
  createPaymentQrCode(data: InsertPaymentQrCode): Promise<PaymentQrCode>;
  updatePaymentQrCode(id: string, updates: Partial<InsertPaymentQrCode>): Promise<PaymentQrCode | undefined>;
  deletePaymentQrCode(id: string): Promise<{ ok: boolean; message?: string }>;
  countClassesByPaymentQrCodeId(qrId: string): Promise<number>;
  submitBookingPaymentAck(
    bookingId: string,
    actorUserId: string | null,
    guestCheckoutBookingId: string | null,
    transactionAckNumber: string,
  ): Promise<Booking | undefined>;
  getPendingQrBookings(): Promise<PendingQrBookingRow[]>;
  confirmQrBooking(bookingId: string): Promise<Booking | undefined>;

  // Contact Messages
  getAllContactMessages(): Promise<ContactMessage[]>;
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  
  // Admin Users
  getAdminByEmail(email: string): Promise<AdminUser | undefined>;
  getAdminById(id: string): Promise<AdminUser | undefined>;
  createAdminUser(admin: InsertAdminUser, passwordHash: string): Promise<AdminUser>;
  updateAdminPasswordHash(id: string, passwordHash: string): Promise<AdminUser | undefined>;
  verifyAdminCredentials(email: string, password: string): Promise<AdminUser | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersWithCompleteness(): Promise<(User & { completeness: ProfileCompleteness })[]>;
  getUsersWithCompletenessPaginated(
    page: number,
    pageSize: number,
  ): Promise<{ rows: (User & { completeness: ProfileCompleteness })[]; total: number }>;
  getAllClassesPaginated(
    page: number,
    pageSize: number,
  ): Promise<{ rows: Class[]; total: number }>;
  getAllInstructorsPaginated(
    page: number,
    pageSize: number,
  ): Promise<{ rows: Instructor[]; total: number }>;
  getAllClassTypesPaginated(
    page: number,
    pageSize: number,
    options?: { excludeQaFixtures?: boolean },
  ): Promise<{ rows: ClassType[]; total: number }>;
  getAllBookingsPaginated(
    page: number,
    pageSize: number,
  ): Promise<{ rows: Booking[]; total: number }>;
  getAdminProfile(adminUserId: string): Promise<AdminProfile | undefined>;
  upsertAdminProfile(
    adminUserId: string,
    profile: Omit<InsertAdminProfile, "adminUserId">,
  ): Promise<AdminProfile>;
  updateAdminProfileVerification(
    adminUserId: string,
    status: "pending" | "verified" | "rejected",
    notes?: string | null,
  ): Promise<AdminProfile | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  getSubscriptionSummariesForAdmin(): Promise<SubscriptionSummaryRow[]>;
  getSubscriptionSummariesForUser(userId: string): Promise<SubscriptionSummaryRow[]>;
  incrementSubscriptionUtilization(userId: string, classId: string): Promise<void>;

  // Coupon codes
  createCouponCode(data: InsertCouponCode): Promise<CouponCode>;
  getCouponById(id: string): Promise<CouponCode | undefined>;
  getActiveCouponByCode(code: string): Promise<CouponCode | undefined>;
  getCouponSummariesForAdmin(): Promise<CouponAdminSummaryRow[]>;
  getCouponRedemptionsForAdmin(couponId?: string): Promise<CouponRedemptionRow[]>;
  revokeCoupon(id: string): Promise<CouponCode | undefined>;
  recordCouponShareLog(data: {
    couponId: string;
    adminId: string;
    userId: string;
    channel: string;
    status: string;
    errorMessage?: string | null;
    sentAt?: Date | null;
  }): Promise<CouponShareLog>;
  finalizeCouponRedemption(params: {
    couponId: string;
    userId: string | null;
    bookingId: string;
    paymentId: string;
    classTypeId: string;
    classId: string;
    originalAmountPaise: number;
    discountAmountPaise: number;
    finalAmountPaise: number;
  }): Promise<CouponRedemption | null>;

  insertAuditLog(entry: InsertAuditLog): Promise<void>;

  // Consent & erasure (DPDPA Ch. 7)
  insertConsentLog(input: ConsentLogInput): Promise<void>;
  getConsentLogsForUser(userId: string): Promise<(typeof consentAuditLogs.$inferSelect)[]>;
  userHasActiveConsent(userId: string, consentType: ConsentType): Promise<boolean>;
  recordRegistrationConsents(params: {
    userId: string;
    dateOfBirth: string;
    consentVersion: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void>;
  recordGuestBookingConsents(params: {
    bookingId: string;
    consentVersion: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void>;
  withdrawHealthDataConsent(params: {
    userId: string;
    consentVersion: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<User | undefined>;
  requestAccountErasure(params: {
    userId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{ erasureRequestId: string; scheduledErasureAt: Date }>;
  getPendingErasureForUser(userId: string): Promise<(typeof erasureRequests.$inferSelect) | undefined>;
  userHasErasureHistory(userId: string): Promise<boolean>;
  reopenAccountAfterSelfErasure(userId: string): Promise<User | undefined>;
  processDueAccountErasures(now?: Date): Promise<number>;
  getAdminConsentLogs(limit?: number): Promise<(typeof consentAuditLogs.$inferSelect)[]>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    void this.initializeData().finally(() => resolveStorageReady());
  }

  private async initializeData() {
    try {
      const existingClassTypes = await db.select().from(classTypes).limit(1);
      if (existingClassTypes.length > 0) {
        console.log('[DB] Database already initialized');
        await this.syncAdminFromEnv();
        return;
      }

      console.log(
        '[DB] Empty database — no demo seed data inserted. Create session types and sessions via the admin panel.',
      );
      await this.syncAdminFromEnv();
    } catch (error) {
      console.error('[DB] Error initializing database:', error);
    }
  }

  private async collectHealthDocumentReferences(userId: string): Promise<string[]> {
    const [user, documents] = await Promise.all([
      this.getUser(userId),
      this.getUserDocuments(userId),
    ]);

    return [...new Set([
      ...(user?.healthDocumentUrls ?? []),
      ...documents.map((document) => document.storageKey),
    ])].filter((value) => Boolean(value));
  }

  private async deleteHealthDocumentReferences(references: string[]): Promise<void> {
    for (const reference of references) {
      await deleteHealthDocumentObject(reference);
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error('[DB] Error getting user:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      // Make email lookup case-insensitive and trim whitespace
      const normalizedEmail = email.trim().toLowerCase();
      console.log(`[DB] Looking up user by email: "${normalizedEmail}"`);
      
      const [user] = await db.select().from(users).where(sql`LOWER(TRIM(${users.email})) = ${normalizedEmail}`);
      
      if (user) {
        console.log(`[DB] Found user: ${user.id} (${user.email})`);
      } else {
        console.log(`[DB] No user found with email: "${normalizedEmail}"`);
      }
      
      return user || undefined;
    } catch (error) {
      console.error('[DB] Error getting user by email:', error);
      return undefined;
    }
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    return this.getUserByEmail(email);
  }

  async getUserDocuments(userId: string) {
    return db
      .select()
      .from(userDocuments)
      .where(eq(userDocuments.userId, userId))
      .orderBy(desc(userDocuments.createdAt));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const { healthUpdateHistory: _history, ...rest } = insertUser as InsertUser & {
        healthUpdateHistory?: unknown;
      };
      const normalizedUser = {
        ...rest,
        email: rest.email.trim().toLowerCase(),
      };

      const [user] = await db.insert(users).values(normalizedUser).returning();
      console.log(`[DB] Created user: ${user.id} (${user.email})`);
      return user;
    } catch (error) {
      console.error('[DB] Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<UpdateProfile>): Promise<User | undefined> {
    try {
      const [user] = await db.update(users)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return user || undefined;
    } catch (error) {
      console.error('[DB] Error updating user:', error);
      return undefined;
    }
  }

  async updateUserHealthData(id: string, healthData: { 
    healthUpdateText: string; 
    healthDocumentUrls: string[]; 
    healthMediaLinks?: HealthMediaLink[];
    healthUpdateHistory?: HealthHistoryEntry[];
    profileCompletionStatus: string;
    healthUpdateLastModified: string;
  }): Promise<User | undefined> {
    try {
      const [user] = await db.update(users)
        .set({ 
          healthUpdateText: healthData.healthUpdateText,
          healthDocumentUrls: healthData.healthDocumentUrls,
          ...(healthData.healthMediaLinks !== undefined
            ? { healthMediaLinks: healthData.healthMediaLinks }
            : {}),
          ...(healthData.healthUpdateHistory !== undefined
            ? { healthUpdateHistory: healthData.healthUpdateHistory }
            : {}),
          profileCompletionStatus: healthData.profileCompletionStatus,
          healthUpdateLastModified: new Date(healthData.healthUpdateLastModified),
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();
      return user || undefined;
    } catch (error) {
      console.error('[DB] Error updating user health data:', error);
      return undefined;
    }
  }

  async recomputeProfileCompletionStatus(id: string): Promise<User | undefined> {
    try {
      const user = await this.getUser(id);
      if (!user) return undefined;
      const next = computeProfileCompletionStatus(user);
      if (user.profileCompletionStatus === next) {
        return user;
      }
      const [row] = await db
        .update(users)
        .set({ profileCompletionStatus: next, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return row || undefined;
    } catch (error) {
      console.error("[DB] Error recomputing profile completion:", error);
      return undefined;
    }
  }

  async verifyUserEmail(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.update(users)
        .set({ emailVerified: true, emailVerificationToken: null, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return user || undefined;
    } catch (error) {
      console.error('[DB] Error verifying user email:', error);
      return undefined;
    }
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
      return user || undefined;
    } catch (error) {
      console.error('[DB] Error getting user by verification token:', error);
      return undefined;
    }
  }

  async updateUserResetToken(id: string, token: string, expiry: Date): Promise<User | undefined> {
    try {
      const [user] = await db.update(users)
        .set({ resetToken: token, resetTokenExpiry: expiry, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return user || undefined;
    } catch (error) {
      console.error('[DB] Error updating user reset token:', error);
      return undefined;
    }
  }

  async findUserByResetToken(token: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.resetToken, token));
      return user || undefined;
    } catch (error) {
      console.error('[DB] Error finding user by reset token:', error);
      return undefined;
    }
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined> {
    try {
      const [user] = await db.update(users)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return user || undefined;
    } catch (error) {
      console.error('[DB] Error updating user password:', error);
      return undefined;
    }
  }

  async clearUserResetToken(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.update(users)
        .set({ resetToken: null, resetTokenExpiry: null, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return user || undefined;
    } catch (error) {
      console.error('[DB] Error clearing user reset token:', error);
      return undefined;
    }
  }

  // Class Types
  async getAllClassTypes(): Promise<ClassType[]> {
    try {
      return await db
        .select()
        .from(classTypes)
        .where(isNull(classTypes.retiredAt))
        .orderBy(classTypes.name);
    } catch (error) {
      console.error('[DB] Error getting class types:', error);
      return [];
    }
  }

  async getClassType(id: string): Promise<ClassType | undefined> {
    try {
      const [classType] = await db.select().from(classTypes).where(eq(classTypes.id, id));
      return classType || undefined;
    } catch (error) {
      console.error('[DB] Error getting class type:', error);
      return undefined;
    }
  }

  async createClassType(classType: InsertClassType): Promise<ClassType> {
    try {
      const [newClassType] = await db.insert(classTypes).values(classType).returning();
      return newClassType;
    } catch (error) {
      console.error('[DB] Error creating class type:', error);
      throw error;
    }
  }

  async updateClassType(
    id: string,
    updates: Partial<InsertClassType>,
  ): Promise<ClassType | undefined> {
    try {
      const [updated] = await db
        .update(classTypes)
        .set(updates)
        .where(eq(classTypes.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error("[DB] Error updating class type:", error);
      throw error;
    }
  }

  async countClassesByClassTypeId(classTypeId: string): Promise<number> {
    try {
      const rows = await db
        .select({ id: classes.id })
        .from(classes)
        .where(eq(classes.classTypeId, classTypeId));
      return rows.length;
    } catch (error) {
      console.error("[DB] Error counting classes for class type:", error);
      return 0;
    }
  }

  async getClassTypeIdsWithUpcomingSessions(): Promise<string[]> {
    try {
      const now = new Date();
      const rows = await db
        .select({
          classTypeId: classes.classTypeId,
          date: classes.date,
          duration: classTypes.duration,
        })
        .from(classes)
        .innerJoin(classTypes, eq(classes.classTypeId, classTypes.id))
        .where(bookableClassSqlConditions(now));
      const nowMs = now.getTime();
      const open = new Set<string>();
      for (const row of rows) {
        const durationMinutes =
          typeof row.duration === "number" && row.duration > 0 ? row.duration : 60;
        if (new Date(row.date).getTime() + durationMinutes * 60_000 > nowMs) {
          open.add(row.classTypeId);
        }
      }
      return [...open];
    } catch (error) {
      console.error("[DB] Error loading class type availability:", error);
      return [];
    }
  }

  // Carousel promotions
  async getCarouselPromotions(): Promise<CarouselPromotion[]> {
    try {
      return await db
        .select()
        .from(carouselPromotions)
        .orderBy(carouselPromotions.position, carouselPromotions.startAt);
    } catch (error) {
      console.error("[DB] Error getting carousel promotions:", error);
      return [];
    }
  }

  async getActiveCarouselPromotions(now: Date = new Date()): Promise<CarouselPromotion[]> {
    try {
      return await db
        .select()
        .from(carouselPromotions)
        .where(
          and(
            eq(carouselPromotions.enabled, true),
            lte(carouselPromotions.startAt, now),
            gte(carouselPromotions.endAt, now),
          ),
        )
        .orderBy(carouselPromotions.position, carouselPromotions.startAt);
    } catch (error) {
      console.error("[DB] Error getting active carousel promotions:", error);
      return [];
    }
  }

  async getCarouselPromotion(id: string): Promise<CarouselPromotion | undefined> {
    try {
      const [promotion] = await db
        .select()
        .from(carouselPromotions)
        .where(eq(carouselPromotions.id, id));
      return promotion || undefined;
    } catch (error) {
      console.error("[DB] Error getting carousel promotion:", error);
      return undefined;
    }
  }

  async createCarouselPromotion(
    promotion: InsertCarouselPromotion,
  ): Promise<CarouselPromotion> {
    try {
      const [created] = await db
        .insert(carouselPromotions)
        .values(promotion)
        .returning();
      return created;
    } catch (error) {
      console.error("[DB] Error creating carousel promotion:", error);
      throw error;
    }
  }

  async updateCarouselPromotion(
    id: string,
    updates: UpdateCarouselPromotion,
  ): Promise<CarouselPromotion | undefined> {
    try {
      const [updated] = await db
        .update(carouselPromotions)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(carouselPromotions.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error("[DB] Error updating carousel promotion:", error);
      throw error;
    }
  }

  async deleteCarouselPromotion(id: string): Promise<{ ok: boolean; message?: string }> {
    try {
      await db.delete(carouselPromotions).where(eq(carouselPromotions.id, id));
      return { ok: true };
    } catch (error) {
      console.error("[DB] Error deleting carousel promotion:", error);
      return { ok: false, message: "Failed to delete promotion" };
    }
  }

  async getPlatformSetting(key: string): Promise<PlatformSetting | undefined> {
    try {
      const [row] = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, key))
        .limit(1);
      return row;
    } catch (error) {
      console.error("[DB] Error reading platform setting:", error);
      return undefined;
    }
  }

  async getAllPlatformSettings(): Promise<PlatformSetting[]> {
    try {
      return await db.select().from(platformSettings).orderBy(platformSettings.key);
    } catch (error) {
      console.error("[DB] Error listing platform settings:", error);
      return [];
    }
  }

  async upsertPlatformSetting(
    key: string,
    value: unknown,
    updatedBy: string | null,
  ): Promise<PlatformSetting> {
    try {
      const now = new Date();
      const [row] = await db
        .insert(platformSettings)
        .values({ key, value, updatedBy, updatedAt: now })
        .onConflictDoUpdate({
          target: platformSettings.key,
          set: { value, updatedBy, updatedAt: now },
        })
        .returning();
      if (!row) {
        throw new Error(`Failed to save platform setting "${key}"`);
      }
      return row;
    } catch (error) {
      console.error("[DB] Error upserting platform setting:", key, error);
      throw error;
    }
  }

  async createNotifyRequest(data: InsertNotifyRequest): Promise<ClassTypeNotifyRequest> {
    const normalizedEmail = data.email.trim().toLowerCase();
    const existing = await db
      .select()
      .from(classTypeNotifyRequests)
      .where(
        and(
          eq(classTypeNotifyRequests.classTypeId, data.classTypeId),
          eq(classTypeNotifyRequests.email, normalizedEmail),
          isNull(classTypeNotifyRequests.unsubscribedAt),
        ),
      )
      .limit(1);
    if (existing[0]) return existing[0];
    const [row] = await db
      .insert(classTypeNotifyRequests)
      .values({ ...data, email: normalizedEmail })
      .returning();
    return row;
  }

  async getActiveNotifyRequestsByClassTypeId(classTypeId: string): Promise<ClassTypeNotifyRequest[]> {
    try {
      return await db
        .select()
        .from(classTypeNotifyRequests)
        .where(
          and(
            eq(classTypeNotifyRequests.classTypeId, classTypeId),
            isNull(classTypeNotifyRequests.unsubscribedAt),
          ),
        )
        .orderBy(desc(classTypeNotifyRequests.createdAt));
    } catch (error) {
      console.error("[DB] Error loading notify requests:", error);
      return [];
    }
  }

  async updateNotifyRequestEmailStatus(
    id: string,
    status: "sent" | "failed",
    options?: { error?: string | null; sentAt?: Date | null },
  ): Promise<ClassTypeNotifyRequest | undefined> {
    const [row] = await db
      .update(classTypeNotifyRequests)
      .set({
        emailSendStatus: status,
        emailSendError: options?.error ?? null,
        lastEmailedAt: status === "sent" ? options?.sentAt ?? new Date() : null,
        emailSendCount: sql`${classTypeNotifyRequests.emailSendCount} + 1`,
      })
      .where(eq(classTypeNotifyRequests.id, id))
      .returning();
    return row ?? undefined;
  }

  async getNotifyRequestsForAdmin(): Promise<AdminWaitlistRow[]> {
    const rows = await db
      .select({
        id: classTypeNotifyRequests.id,
        classTypeId: classTypeNotifyRequests.classTypeId,
        classTypeName: classTypes.name,
        userId: classTypeNotifyRequests.userId,
        userName: users.name,
        email: classTypeNotifyRequests.email,
        whatsapp: classTypeNotifyRequests.whatsapp,
        source: classTypeNotifyRequests.source,
        emailSendStatus: classTypeNotifyRequests.emailSendStatus,
        emailSendError: classTypeNotifyRequests.emailSendError,
        emailSendCount: classTypeNotifyRequests.emailSendCount,
        lastEmailedAt: classTypeNotifyRequests.lastEmailedAt,
        createdAt: classTypeNotifyRequests.createdAt,
      })
      .from(classTypeNotifyRequests)
      .innerJoin(classTypes, eq(classTypeNotifyRequests.classTypeId, classTypes.id))
      .leftJoin(users, eq(classTypeNotifyRequests.userId, users.id))
      .where(isNull(classTypeNotifyRequests.unsubscribedAt))
      .orderBy(desc(classTypeNotifyRequests.createdAt));

    return rows.map((row) => ({
      ...row,
      userName: row.userName ?? null,
      lastEmailedAt: row.lastEmailedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async getRecurringSeriesBounds(
    seriesId: string,
  ): Promise<{ startAt: Date; endAt: Date } | undefined> {
    const [row] = await db
      .select({
        startAt: sql<Date>`MIN(${classes.date})`,
        endAt: sql<Date>`MAX(${classes.date})`,
      })
      .from(classes)
      .where(eq(classes.seriesId, seriesId));
    if (!row?.startAt || !row?.endAt) return undefined;
    return row;
  }

  async countClassesInSeries(seriesId: string): Promise<number> {
    const [{ total }] = await db
      .select({ total: count() })
      .from(classes)
      .where(eq(classes.seriesId, seriesId));
    return Math.max(1, Number(total));
  }

  async findNextRecurringClassAfter(
    classTypeId: string,
    afterDate: Date,
    excludeSeriesId?: string | null,
  ): Promise<Class | undefined> {
    const now = new Date();
    const visibility = bookableClassSqlConditions(now);
    const whereClause = excludeSeriesId
      ? and(
          eq(classes.classTypeId, classTypeId),
          eq(classes.sessionFrequency, "recurring"),
          gte(classes.date, afterDate),
          visibility,
          sql`${classes.seriesId} IS DISTINCT FROM ${excludeSeriesId}`,
        )
      : and(
          eq(classes.classTypeId, classTypeId),
          eq(classes.sessionFrequency, "recurring"),
          gte(classes.date, afterDate),
          visibility,
        );
    const [row] = await db.select().from(classes).where(whereClause).orderBy(classes.date).limit(1);
    return row ?? undefined;
  }

  async deleteClassType(id: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const ct = await this.getClassType(id);
      if (!ct) return { ok: false, message: "Class type not found" };
      if (ct.retiredAt) return { ok: false, message: "This session type is already retired." };
      const used = await this.countClassesByClassTypeId(id);
      if (used > 0) {
        return {
          ok: false,
          message: `${used} session(s) still reference this type. Retire it instead to cancel upcoming sessions.`,
        };
      }
      const result = await db.delete(classTypes).where(eq(classTypes.id, id)).returning({ id: classTypes.id });
      if (result.length === 0) {
        return { ok: false, message: "Class type not found" };
      }
      return { ok: true };
    } catch (error) {
      console.error("[DB] Error deleting class type:", error);
      throw error;
    }
  }

  async getCancellationRecipientsForClass(classId: string) {
    const rows = await db
      .select({
        userId: bookings.userId,
        guestName: bookings.guestName,
        guestEmail: bookings.guestEmail,
        guestPhone: bookings.guestPhone,
        userName: users.name,
        userEmail: users.email,
        primaryMobile: users.primaryMobile,
        primaryMobileCountryCode: users.primaryMobileCountryCode,
        whatsappConsent: users.whatsappConsent,
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.userId, users.id))
      .where(
        and(
          eq(bookings.classId, classId),
          or(
            inArray(bookings.paymentStatus, [
              BOOKING_PAYMENT_STATUS.PAID,
              BOOKING_PAYMENT_STATUS.WAIVED,
              BOOKING_PAYMENT_STATUS.PENDING,
            ]),
            and(
              eq(bookings.paymentStatus, BOOKING_PAYMENT_STATUS.FAILED),
              gt(bookings.heldUntil, sql`NOW()`),
            ),
          ),
        ),
      );

    const recipients: Array<{
      key: string;
      name: string;
      email: string | null;
      phone: string | null;
      phoneCountryCode: string | null;
      whatsappConsent: boolean;
    }> = [];

    for (const row of rows) {
      const email = (row.userEmail ?? row.guestEmail)?.trim().toLowerCase() || null;
      const phone = row.primaryMobile ?? row.guestPhone ?? null;
      const key = email ?? phone ?? row.userId ?? `guest-${row.guestEmail ?? row.guestName ?? "unknown"}`;
      recipients.push({
        key,
        name: row.userName ?? row.guestName ?? "Member",
        email,
        phone,
        phoneCountryCode: row.primaryMobileCountryCode ?? "+91",
        whatsappConsent: Boolean(row.whatsappConsent),
      });
    }
    return recipients;
  }

  async cancelClassSession(id: string, reason: string) {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      return { ok: false as const, message: "Please enter a cancellation reason (at least 3 characters)." };
    }

    try {
      const cls = await this.getClass(id);
      if (!cls) return { ok: false as const, message: "Session not found" };
      if (cls.cancelledAt) return { ok: false as const, message: "This session is already cancelled." };

      const [classType, instructor] = await Promise.all([
        this.getClassType(cls.classTypeId),
        this.getInstructor(cls.instructorId),
      ]);

      const now = new Date();
      await db
        .update(classes)
        .set({
          cancelledAt: now,
          cancellationReason: trimmedReason,
          pausedAt: now,
          status: "paused",
        })
        .where(eq(classes.id, id));

      await db
        .update(userSessionMappings)
        .set({
          status: "cancelled",
          cancelledAt: now,
          cancellationReason: trimmedReason,
          updatedAt: now,
        })
        .where(eq(userSessionMappings.classId, id));

      await db.delete(carouselPromotions).where(eq(carouselPromotions.classId, id));

      const recipients = await this.getCancellationRecipientsForClass(id);

      return {
        ok: true as const,
        classTypeName: classType?.name ?? "Session",
        instructorName: instructor?.name,
        sessionDateIso: cls.date.toISOString(),
        recipients,
      };
    } catch (error) {
      console.error("[DB] Error cancelling class session:", error);
      return { ok: false as const, message: "Failed to cancel session" };
    }
  }

  async retireClassTypeWithSessionCancellation(classTypeId: string, reason: string) {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      return { ok: false as const, message: "Please enter a reason (at least 3 characters)." };
    }

    const classType = await this.getClassType(classTypeId);
    if (!classType) return { ok: false as const, message: "Session type not found" };
    if (classType.retiredAt) {
      return { ok: false as const, message: "This session type is already retired." };
    }

    const sessions = await db
      .select()
      .from(classes)
      .where(and(eq(classes.classTypeId, classTypeId), isNull(classes.cancelledAt)));

    let sessionsCancelled = 0;
    const noticePayloads: Array<{
      recipients: Array<{
        key: string;
        name: string;
        email: string | null;
        phone: string | null;
        phoneCountryCode: string | null;
        whatsappConsent: boolean;
      }>;
      sessionDateIso?: string;
      instructorName?: string;
    }> = [];

    for (const sess of sessions) {
      const cancelled = await this.cancelClassSession(sess.id, trimmedReason);
      if (cancelled.ok) {
        sessionsCancelled += 1;
        if (cancelled.recipients?.length) {
          noticePayloads.push({
            recipients: cancelled.recipients,
            sessionDateIso: cancelled.sessionDateIso,
            instructorName: cancelled.instructorName,
          });
        }
      }
    }

    const deletable = await db
      .select({ id: classes.id })
      .from(classes)
      .where(eq(classes.classTypeId, classTypeId));

    for (const row of deletable) {
      const bookingCount = await this.countBookingsForClass(row.id);
      if (bookingCount === 0) {
        await db.delete(classes).where(eq(classes.id, row.id));
      }
    }

    const stillUsed = await this.countClassesByClassTypeId(classTypeId);
    if (stillUsed > 0) {
      await db
        .update(classTypes)
        .set({
          retiredAt: new Date(),
          retirementReason: trimmedReason,
        })
        .where(eq(classTypes.id, classTypeId));
      await db
        .delete(classTypeNotifyRequests)
        .where(eq(classTypeNotifyRequests.classTypeId, classTypeId));

      return {
        ok: true as const,
        sessionsCancelled,
        hardDeleted: false,
        classTypeName: classType.name,
        noticePayloads,
        message: `${sessionsCancelled} session(s) cancelled. Session type retired (${stillUsed} past session(s) kept for booking history).`,
      };
    }

    await db
      .delete(classTypeNotifyRequests)
      .where(eq(classTypeNotifyRequests.classTypeId, classTypeId));
    await db.delete(classTypes).where(eq(classTypes.id, classTypeId));

    return {
      ok: true as const,
      sessionsCancelled,
      hardDeleted: true,
      classTypeName: classType.name,
      noticePayloads,
      message: `${sessionsCancelled} session(s) cancelled. Session type removed.`,
    };
  }

  // Instructors
  async getAllInstructors(): Promise<Instructor[]> {
    try {
      return await db.select().from(instructors).orderBy(instructors.name);
    } catch (error) {
      console.error('[DB] Error getting instructors:', error);
      return [];
    }
  }

  async getPublicInstructors(): Promise<Instructor[]> {
    const { isInstructorPublicVisible } = await import("@shared/instructor-compliance");
    const all = await this.getAllInstructors();
    return all.filter(isInstructorPublicVisible);
  }

  async getSessionEligibleInstructors(): Promise<Instructor[]> {
    const { isInstructorSessionPoolEligible } = await import("@shared/instructor-compliance");
    const all = await this.getAllInstructors();
    return all.filter(isInstructorSessionPoolEligible);
  }

  async getInstructor(id: string): Promise<Instructor | undefined> {
    try {
      const [instructor] = await db.select().from(instructors).where(eq(instructors.id, id));
      return instructor || undefined;
    } catch (error) {
      console.error('[DB] Error getting instructor:', error);
      return undefined;
    }
  }

  async createInstructor(instructor: InsertInstructor): Promise<Instructor> {
    try {
      const payload = {
        ...instructor,
        email: instructor.email?.trim().toLowerCase() ?? null,
        phone: instructor.phone?.trim() ?? null,
        status: instructor.status ?? "pending",
        updatedAt: new Date(),
      };
      const [newInstructor] = await db.insert(instructors).values(payload).returning();
      return newInstructor;
    } catch (error) {
      console.error('[DB] Error creating instructor:', error);
      throw error;
    }
  }

  async updateInstructor(
    id: string,
    updates: Partial<InsertInstructor>,
  ): Promise<Instructor | undefined> {
    try {
      const patch: Partial<InsertInstructor> & { updatedAt: Date } = {
        ...updates,
        updatedAt: new Date(),
      };
      if (updates.email != null) {
        patch.email = updates.email.trim().toLowerCase();
      }
      if (updates.phone != null) {
        patch.phone = updates.phone.trim();
      }
      const [row] = await db
        .update(instructors)
        .set(patch)
        .where(eq(instructors.id, id))
        .returning();
      return row;
    } catch (error) {
      console.error("[DB] Error updating instructor:", error);
      return undefined;
    }
  }

  async setInstructorEmailOtp(
    id: string,
    hash: string,
    expiresAt: Date,
    linkToken: string,
  ): Promise<Instructor | undefined> {
    try {
      const [row] = await db
        .update(instructors)
        .set({
          emailOtpHash: hash,
          emailOtpExpiresAt: expiresAt,
          emailVerificationToken: linkToken,
          updatedAt: new Date(),
        })
        .where(eq(instructors.id, id))
        .returning();
      return row;
    } catch (error) {
      console.error("[DB] Error setting instructor OTP:", error);
      return undefined;
    }
  }

  async getInstructorByEmailVerificationToken(
    token: string,
  ): Promise<Instructor | undefined> {
    try {
      const [row] = await db
        .select()
        .from(instructors)
        .where(eq(instructors.emailVerificationToken, token));
      return row;
    } catch (error) {
      console.error("[DB] Error fetching instructor by verification token:", error);
      return undefined;
    }
  }

  async markInstructorEmailVerified(
    id: string,
    method: "otp-verified" | "admin-override",
    options?: { clearOtp?: boolean },
  ): Promise<Instructor | undefined> {
    const clearOtp = options?.clearOtp ?? true;
    try {
      const [row] = await db
        .update(instructors)
        .set({
          emailVerified: true,
          verificationMethod: method,
          ...(clearOtp
            ? {
                emailOtpHash: null,
                emailOtpExpiresAt: null,
                emailVerificationToken: null,
              }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(instructors.id, id))
        .returning();
      if (row) return (await this.reconcileInstructorStatus(id)) ?? row;
      return row;
    } catch (error) {
      console.error("[DB] Error marking instructor email verified:", error);
      return undefined;
    }
  }

  async markInstructorPhoneVerified(id: string): Promise<Instructor | undefined> {
    try {
      const [row] = await db
        .update(instructors)
        .set({ phoneVerified: true, updatedAt: new Date() })
        .where(eq(instructors.id, id))
        .returning();
      if (row) return (await this.reconcileInstructorStatus(id)) ?? row;
      return row;
    } catch (error) {
      console.error("[DB] Error marking instructor phone verified:", error);
      return undefined;
    }
  }

  async updateInstructorStatus(
    id: string,
    status: string,
    statusNotes: string | null,
  ): Promise<Instructor | undefined> {
    try {
      const [row] = await db
        .update(instructors)
        .set({ status, statusNotes, updatedAt: new Date() })
        .where(eq(instructors.id, id))
        .returning();
      return row;
    } catch (error) {
      console.error("[DB] Error updating instructor status:", error);
      return undefined;
    }
  }

  async reconcileInstructorStatus(id: string): Promise<Instructor | undefined> {
    const { computeInstructorOperationalStatus } = await import(
      "@shared/instructor-compliance"
    );
    const instructor = await this.getInstructor(id);
    if (!instructor) return undefined;

    const { status, statusNotes } = computeInstructorOperationalStatus(instructor);
    if (instructor.status === status && instructor.statusNotes === statusNotes) {
      return this.getInstructor(id);
    }
    return this.updateInstructorStatus(id, status, statusNotes);
  }

  // Classes
  async getAllClasses(): Promise<Class[]> {
    try {
      return await db.select().from(classes).orderBy(classes.date);
    } catch (error) {
      console.error('[DB] Error getting classes:', error);
      return [];
    }
  }

  async getPublishedClasses(): Promise<Class[]> {
    try {
      return await db
        .select()
        .from(classes)
        .where(bookableClassSqlConditions())
        .orderBy(classes.date);
    } catch (error) {
      console.error("[DB] Error getting published classes:", error);
      return [];
    }
  }

  async getClass(id: string): Promise<Class | undefined> {
    try {
      const [class_] = await db.select().from(classes).where(eq(classes.id, id));
      return class_ || undefined;
    } catch (error) {
      console.error('[DB] Error getting class:', error);
      return undefined;
    }
  }

  async getClassesByDate(date: Date): Promise<Class[]> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      return await db
        .select()
        .from(classes)
        .where(and(gte(classes.date, startOfDay), lte(classes.date, endOfDay)));
    } catch (error) {
      console.error('[DB] Error getting classes by date:', error);
      return [];
    }
  }

  async getBookableClassesByDate(date: Date): Promise<Class[]> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      return await db
        .select()
        .from(classes)
        .where(
          and(
            gte(classes.date, startOfDay),
            lte(classes.date, endOfDay),
            bookableClassSqlConditions(),
          ),
        );
    } catch (error) {
      console.error("[DB] Error getting bookable classes by date:", error);
      return [];
    }
  }

  async getClassesInRange(start: Date, end: Date): Promise<Class[]> {
    try {
      return await db
        .select()
        .from(classes)
        .where(and(gte(classes.date, start), lte(classes.date, end)))
        .orderBy(classes.date);
    } catch (error) {
      console.error("[DB] Error getting classes in range:", error);
      return [];
    }
  }

  async createClass(
    classData: InsertClass & {
      status?: string;
      publishedAt?: Date | null;
      pausedAt?: Date | null;
    },
  ): Promise<Class> {
    try {
      const [newClass] = await db.insert(classes).values(classData).returning();
      return newClass;
    } catch (error) {
      console.error('[DB] Error creating class:', error);
      throw error;
    }
  }

  async updateClassSession(
    id: string,
    updates: Partial<InsertClass & { status?: string; publishedAt?: Date | null; pausedAt?: Date | null }>,
  ): Promise<Class | undefined> {
    try {
      const [row] = await db.update(classes).set(updates).where(eq(classes.id, id)).returning();
      return row || undefined;
    } catch (error) {
      console.error("[DB] Error updating class session:", error);
      return undefined;
    }
  }

  async pauseClassSession(id: string): Promise<Class | undefined> {
    const cls = await this.updateClassSession(id, {
      status: "paused",
      pausedAt: new Date(),
    });
    if (cls) {
      await db.delete(carouselPromotions).where(eq(carouselPromotions.classId, id));
    }
    return cls;
  }

  async resumeClassSession(id: string): Promise<Class | undefined> {
    return this.updateClassSession(id, {
      status: "published",
      pausedAt: null,
    });
  }

  async countBookingsForClass(classId: string): Promise<number> {
    try {
      const rows = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(eq(bookings.classId, classId));
      return rows.length;
    } catch (error) {
      console.error("[DB] Error counting bookings for class:", error);
      return 0;
    }
  }

  async deleteClassSession(id: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const bookingCount = await this.countBookingsForClass(id);
      if (bookingCount > 0) {
        return {
          ok: false,
          message: `Cannot delete: ${bookingCount} booking(s) exist for this session.`,
        };
      }
      const result = await db.delete(classes).where(eq(classes.id, id)).returning({ id: classes.id });
      return { ok: result.length > 0, message: result.length ? undefined : "Session not found" };
    } catch (error) {
      console.error("[DB] Error deleting class session:", error);
      return { ok: false, message: "Failed to delete session" };
    }
  }

  private async deleteClassDependents(classId: string): Promise<void> {
    const classBookings = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.classId, classId));
    const bookingIds = classBookings.map((row) => row.id);

    if (bookingIds.length) {
      await db.delete(consentAuditLogs).where(inArray(consentAuditLogs.bookingId, bookingIds));
      await db.delete(payments).where(inArray(payments.bookingId, bookingIds));
      await db.delete(bookings).where(inArray(bookings.id, bookingIds));
    }

    await db.delete(carouselPromotions).where(eq(carouselPromotions.classId, classId));
    await db.delete(sessionMoodCheckins).where(eq(sessionMoodCheckins.classId, classId));
    await db.delete(sessionJoinEvents).where(eq(sessionJoinEvents.classId, classId));
    await db.delete(userSessionMappings).where(eq(userSessionMappings.classId, classId));
    await db.delete(classes).where(eq(classes.id, classId));
  }

  async hardDeleteClassSession(id: string, reason: string) {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      return {
        ok: false as const,
        message: "Please enter a deletion reason (at least 3 characters).",
      };
    }

    try {
      const cls = await this.getClass(id);
      if (!cls) return { ok: false as const, message: "Session not found" };

      const [classType, instructor, bookingCount, recipients] = await Promise.all([
        this.getClassType(cls.classTypeId),
        this.getInstructor(cls.instructorId),
        this.countBookingsForClass(id),
        this.getCancellationRecipientsForClass(id),
      ]);

      await this.deleteClassDependents(id);

      return {
        ok: true as const,
        classTypeName: classType?.name ?? "Session",
        instructorName: instructor?.name,
        sessionDateIso: cls.date.toISOString(),
        bookingCount,
        recipients,
      };
    } catch (error) {
      console.error("[DB] Error hard-deleting class session:", error);
      return { ok: false as const, message: "Failed to delete session" };
    }
  }

  async cancelClassSessionWithBookings(
    id: string,
    reason: string,
    ownerOtp: string,
  ): Promise<{ ok: boolean; message?: string }> {
    const { validateOwnerCancelOtp } = await import("./session-cancellation-notify");
    const otp = validateOwnerCancelOtp(ownerOtp);
    if (!otp.ok) return { ok: false, message: otp.message };
    const result = await this.cancelClassSession(id, reason);
    return { ok: result.ok, message: result.message };
  }

  async findNextSessionForClassType(
    classTypeId: string,
    after: Date,
    sessionFrequencies?: string[],
  ): Promise<Class | undefined> {
    try {
      const now = new Date();
      const rows = await db
        .select()
        .from(classes)
        .where(
          and(
            eq(classes.classTypeId, classTypeId),
            gte(classes.date, after),
            bookableClassSqlConditions(now),
          ),
        )
        .orderBy(classes.date);

      for (const row of rows) {
        if (
          sessionFrequencies?.length &&
          !sessionFrequencies.includes(row.sessionFrequency ?? "")
        ) {
          continue;
        }
        if (row.date.getTime() > after.getTime()) {
          return row;
        }
      }
      return undefined;
    } catch (error) {
      console.error("[DB] Error finding next session:", error);
      return undefined;
    }
  }

  async setUserActive(id: string, isActive: boolean): Promise<User | undefined> {
    try {
      const [row] = await db
        .update(users)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return row || undefined;
    } catch (error) {
      console.error("[DB] Error setting user active:", error);
      return undefined;
    }
  }

  private async deleteUserRecordsPermanently(
    id: string,
    options: { preserveCompletedErasureIds?: string[]; completedAt?: Date } = {},
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      const user = await this.getUser(id);
      if (!user) return { ok: false, message: "User not found" };

      const documentReferences = await this.collectHealthDocumentReferences(id);
      await this.deleteHealthDocumentReferences(documentReferences);

      const completedAt = options.completedAt ?? new Date();

      await db.transaction(async (tx) => {
        const userBookings = await tx
          .select({
            id: bookings.id,
            classId: bookings.classId,
            paymentStatus: bookings.paymentStatus,
            heldUntil: bookings.heldUntil,
          })
          .from(bookings)
          .where(eq(bookings.userId, id));
        const bookingIds = userBookings.map((row) => row.id);

        if (bookingIds.length > 0) {
          await tx.delete(payments).where(inArray(payments.bookingId, bookingIds));
          await tx
            .update(consentAuditLogs)
            .set({ bookingId: null })
            .where(inArray(consentAuditLogs.bookingId, bookingIds));
        }

        await tx
          .update(consentAuditLogs)
          .set({ userId: null })
          .where(eq(consentAuditLogs.userId, id));

        for (const booking of userBookings) {
          if (
            bookingCountsTowardCapacity(
              booking.paymentStatus,
              booking.heldUntil ?? null,
            )
          ) {
            await tx
              .update(classes)
              .set({
                currentBookings: sql`GREATEST(0, ${classes.currentBookings} - 1)`,
              })
              .where(eq(classes.id, booking.classId));
          }
        }

        await tx.delete(subscriptions).where(eq(subscriptions.userId, id));
        await tx.delete(sessionMoodCheckins).where(eq(sessionMoodCheckins.userId, id));
        await tx.delete(sessionJoinEvents).where(eq(sessionJoinEvents.userId, id));
        await tx.delete(userSessionMappings).where(eq(userSessionMappings.userId, id));
        await tx.delete(classTypeNotifyRequests).where(eq(classTypeNotifyRequests.userId, id));

        if (options.preserveCompletedErasureIds?.length) {
          await tx
            .update(erasureRequests)
            .set({ status: "completed", completedAt, userId: null })
            .where(
              and(
                eq(erasureRequests.userId, id),
                inArray(erasureRequests.id, options.preserveCompletedErasureIds),
              ),
            );
          await tx
            .delete(erasureRequests)
            .where(
              and(
                eq(erasureRequests.userId, id),
                notInArray(erasureRequests.id, options.preserveCompletedErasureIds),
              ),
            );
        } else {
          await tx.delete(erasureRequests).where(eq(erasureRequests.userId, id));
        }

        await tx.delete(userDocuments).where(eq(userDocuments.userId, id));
        await tx.delete(bookings).where(eq(bookings.userId, id));
        await tx.delete(auditLogs).where(eq(auditLogs.userId, id));
        await tx.delete(users).where(eq(users.id, id));
      });

      return { ok: true };
    } catch (error) {
      console.error("[DB] Error deleting user permanently:", error);
      return { ok: false, message: "Failed to delete user" };
    }
  }

  async deleteUserPermanently(id: string): Promise<{ ok: boolean; message?: string }> {
    return this.deleteUserRecordsPermanently(id);
  }

  async deleteUsersPermanently(
    ids: string[],
  ): Promise<{ deleted: string[]; failed: Array<{ id: string; message: string }> }> {
    const deleted: string[] = [];
    const failed: Array<{ id: string; message: string }> = [];
    for (const id of ids) {
      const result = await this.deleteUserPermanently(id);
      if (result.ok) deleted.push(id);
      else failed.push({ id, message: result.message ?? "Delete failed" });
    }
    return { deleted, failed };
  }

  async recordSessionJoin(userId: string, classId: string): Promise<void> {
    try {
      await db.insert(sessionJoinEvents).values({ userId, classId });
      await db
        .update(users)
        .set({
          sessionAttendanceCount: sql`${users.sessionAttendanceCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
      await db
        .update(userSessionMappings)
        .set({ attendedAt: new Date(), status: "completed", updatedAt: new Date() })
        .where(
          and(eq(userSessionMappings.userId, userId), eq(userSessionMappings.classId, classId)),
        );
      await this.incrementSubscriptionUtilization(userId, classId);
    } catch (error) {
      console.error("[DB] Error recording session join:", error);
    }
  }

  async recordMoodCheckin(
    userId: string,
    classId: string,
    phase: "pre" | "post",
    moodId: string,
  ): Promise<void> {
    try {
      await db.insert(sessionMoodCheckins).values({ userId, classId, phase, moodId });
    } catch (error) {
      console.error("[DB] Error recording mood check-in:", error);
      throw error;
    }
  }

  async updateClassBookingCount(id: string, count: number): Promise<Class | undefined> {
    try {
      const [updatedClass] = await db.update(classes)
        .set({ currentBookings: count })
        .where(eq(classes.id, id))
        .returning();
      return updatedClass || undefined;
    } catch (error) {
      console.error('[DB] Error updating class booking count:', error);
      return undefined;
    }
  }

  // Bookings
  async getAllBookings(): Promise<Booking[]> {
    try {
      return await db.select().from(bookings);
    } catch (error) {
      console.error('[DB] Error getting bookings:', error);
      return [];
    }
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    try {
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
      return booking || undefined;
    } catch (error) {
      console.error('[DB] Error getting booking:', error);
      return undefined;
    }
  }

  async getBookingsByClass(classId: string): Promise<Booking[]> {
    try {
      return await db.select().from(bookings).where(eq(bookings.classId, classId));
    } catch (error) {
      console.error('[DB] Error getting bookings by class:', error);
      return [];
    }
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    try {
      const cls = await this.getClass(booking.classId);
      const paymentMethod = booking.paymentMethod ?? cls?.paymentMethod ?? "razorpay_link";
      const [newBooking] = await db
        .insert(bookings)
        .values({ ...booking, paymentMethod })
        .returning();

      if (booking.userId) {
        await this.ensureUserSessionMapping(booking.userId, booking.classId);
      }
      await this.syncClassBookingCount(booking.classId);

      return newBooking;
    } catch (error) {
      console.error("[DB] Error creating booking:", error);
      throw error;
    }
  }

  async countActiveBookingsForClass(classId: string): Promise<number> {
    try {
      const capacityFilter = or(
        inArray(bookings.paymentStatus, [
          BOOKING_PAYMENT_STATUS.PAID,
          BOOKING_PAYMENT_STATUS.WAIVED,
        ]),
        and(
          eq(bookings.paymentStatus, BOOKING_PAYMENT_STATUS.PENDING),
          or(isNull(bookings.heldUntil), gt(bookings.heldUntil, sql`NOW()`)),
        ),
        and(
          eq(bookings.paymentStatus, BOOKING_PAYMENT_STATUS.FAILED),
          gt(bookings.heldUntil, sql`NOW()`),
        ),
      );

      const rows = await db
        .select({ id: bookings.id })
        .from(bookings)
        .leftJoin(
          userSessionMappings,
          and(
            eq(userSessionMappings.userId, bookings.userId),
            eq(userSessionMappings.classId, bookings.classId),
          ),
        )
        .where(
          and(
            eq(bookings.classId, classId),
            capacityFilter,
            or(isNull(userSessionMappings.status), sql`${userSessionMappings.status} <> 'cancelled'`),
          ),
        );
      return rows.length;
    } catch (error) {
      console.error("[DB] Error counting active bookings:", error);
      return 0;
    }
  }

  async syncClassBookingCount(classId: string): Promise<number> {
    const count = await this.countActiveBookingsForClass(classId);
    await this.updateClassBookingCount(classId, count);
    return count;
  }

  async findResumableBookingForClass(
    userId: string,
    classId: string,
  ): Promise<Booking | undefined> {
    try {
      const rows = await db
        .select({
          booking: bookings,
          mappingStatus: userSessionMappings.status,
          sessionDate: classes.date,
        })
        .from(bookings)
        .innerJoin(classes, eq(bookings.classId, classes.id))
        .leftJoin(
          userSessionMappings,
          and(
            eq(userSessionMappings.userId, bookings.userId),
            eq(userSessionMappings.classId, bookings.classId),
          ),
        )
        .where(
          and(
            eq(bookings.userId, userId),
            eq(bookings.classId, classId),
            eq(bookings.paymentStatus, "pending"),
          ),
        )
        .orderBy(desc(bookings.createdAt))
        .limit(1);

      const row = rows[0];
      if (!row) return undefined;

      if (
        !bookingIsResumableCheckout({
          paymentStatus: row.booking.paymentStatus,
          mappingStatus: row.mappingStatus,
          classSessionStartMs: new Date(row.sessionDate).getTime(),
        })
      ) {
        return undefined;
      }

      return row.booking;
    } catch (error) {
      console.error("[DB] Error finding resumable booking:", error);
      return undefined;
    }
  }

  async findResumableGuestBookingForClass(
    guestEmail: string,
    classId: string,
  ): Promise<Booking | undefined> {
    try {
      const normalized = guestEmail.trim().toLowerCase();
      const rows = await db
        .select({
          booking: bookings,
          sessionDate: classes.date,
        })
        .from(bookings)
        .innerJoin(classes, eq(bookings.classId, classes.id))
        .where(
          and(
            eq(bookings.isGuestCheckout, true),
            sql`lower(${bookings.guestEmail}) = ${normalized}`,
            eq(bookings.classId, classId),
            eq(bookings.paymentStatus, "pending"),
          ),
        )
        .orderBy(desc(bookings.createdAt))
        .limit(1);

      const row = rows[0];
      if (!row) return undefined;

      if (
        !bookingIsResumableCheckout({
          paymentStatus: row.booking.paymentStatus,
          mappingStatus: null,
          classSessionStartMs: new Date(row.sessionDate).getTime(),
        })
      ) {
        return undefined;
      }

      return row.booking;
    } catch (error) {
      console.error("[DB] Error finding resumable guest booking:", error);
      return undefined;
    }
  }

  async getUserBookings(userId: string): Promise<Booking[]> {
    try {
      return await db.select().from(bookings).where(eq(bookings.userId, userId));
    } catch (error) {
      console.error("[DB] Error getting user bookings:", error);
      return [];
    }
  }

  async userHasUpcomingBookingForClass(userId: string, classId: string): Promise<boolean> {
    try {
      const cls = await this.getClass(classId);
      if (!cls || new Date(cls.date).getTime() < Date.now()) return false;

      const [row] = await db
        .select({
          mappingStatus: userSessionMappings.status,
          paymentStatus: bookings.paymentStatus,
        })
        .from(bookings)
        .leftJoin(
          userSessionMappings,
          and(
            eq(userSessionMappings.userId, bookings.userId),
            eq(userSessionMappings.classId, bookings.classId),
          ),
        )
        .where(and(eq(bookings.userId, userId), eq(bookings.classId, classId)))
        .limit(1);

      if (!row) return false;
      return existingBookingBlocksNewBooking({
        hasBookingRow: true,
        mappingStatus: row.mappingStatus,
        paymentStatus: row.paymentStatus,
        classSessionStartMs: new Date(cls.date).getTime(),
      });
    } catch (error) {
      console.error("[DB] Error checking existing booking:", error);
      return false;
    }
  }

  async guestHasUpcomingBookingForClass(
    guestEmail: string,
    classId: string,
  ): Promise<boolean> {
    const conflict = await this.getGuestBookingConflict(guestEmail, classId);
    return conflict.state === "confirmed";
  }

  async getGuestBookingConflict(
    guestEmail: string,
    classId: string,
  ): Promise<{
    state: import("@shared/guest-booking-conflict").GuestBookingConflictState;
    booking?: Booking;
    canResumePayment?: boolean;
  }> {
    try {
      const cls = await this.getClass(classId);
      if (!cls || new Date(cls.date).getTime() < Date.now()) {
        return { state: "none" };
      }

      const normalized = guestEmail.trim().toLowerCase();
      const [row] = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.isGuestCheckout, true),
            sql`lower(${bookings.guestEmail}) = ${normalized}`,
            eq(bookings.classId, classId),
            inArray(bookings.paymentStatus, [
              BOOKING_PAYMENT_STATUS.PENDING,
              BOOKING_PAYMENT_STATUS.PAID,
              BOOKING_PAYMENT_STATUS.WAIVED,
              BOOKING_PAYMENT_STATUS.FAILED,
            ]),
          ),
        )
        .orderBy(desc(bookings.createdAt))
        .limit(1);

      if (!row) return { state: "none" };

      if (row.paymentStatus === "paid" || row.paymentStatus === "waived") {
        return { state: "confirmed", booking: row };
      }

      if (
        row.paymentStatus === BOOKING_PAYMENT_STATUS.CANCELLED_BY_USER ||
        row.paymentStatus === BOOKING_PAYMENT_STATUS.HOLD_EXPIRED
      ) {
        return { state: "none" };
      }

      const sessionStartMs = new Date(cls.date).getTime();
      const sessionMethod = normalizeSessionPaymentMethod(row.paymentMethod ?? cls.paymentMethod);
      const canResume =
        usesHostedCheckout(sessionMethod) &&
        canResumePaymentCheckout({
          paymentStatus: row.paymentStatus,
          heldUntil: row.heldUntil,
          mappingStatus: null,
          classSessionStartMs: sessionStartMs,
        });

      if (
        row.paymentStatus === BOOKING_PAYMENT_STATUS.FAILED ||
        row.paymentStatus === BOOKING_PAYMENT_STATUS.PENDING
      ) {
        return {
          state: canResume ? "processing" : row.paymentStatus === "failed" ? "failed" : "none",
          booking: row,
          canResumePayment: canResume,
        };
      }

      return { state: "none" };
    } catch (error) {
      console.error("[DB] Error resolving guest booking conflict:", error);
      return { state: "none" };
    }
  }

  async linkGuestBookingsToUser(userId: string, email: string): Promise<number> {
    try {
      const normalized = email.trim().toLowerCase();
      const guestRows = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.isGuestCheckout, true),
            sql`lower(${bookings.guestEmail}) = ${normalized}`,
          ),
        );

      if (guestRows.length === 0) return 0;

      for (const booking of guestRows) {
        await db
          .update(bookings)
          .set({
            userId,
            isGuestCheckout: false,
          })
          .where(eq(bookings.id, booking.id));

        await this.ensureUserSessionMapping(userId, booking.classId);

        await db
          .update(payments)
          .set({ userId })
          .where(eq(payments.bookingId, booking.id));
      }

      return guestRows.length;
    } catch (error) {
      console.error("[DB] Error linking guest bookings:", error);
      return 0;
    }
  }

  async updateBookingPaymentStatus(
    bookingId: string,
    paymentStatus: string,
  ): Promise<Booking | undefined> {
    try {
      const [row] = await db
        .update(bookings)
        .set({ paymentStatus })
        .where(eq(bookings.id, bookingId))
        .returning();
      return row;
    } catch (error) {
      console.error("[DB] Error updating booking payment status:", error);
      return undefined;
    }
  }

  async updateBookingPaymentHold(
    bookingId: string,
    data: { paymentStatus?: string; heldUntil?: string | null },
  ): Promise<Booking | undefined> {
    try {
      const patch: Record<string, unknown> = {};
      if (data.paymentStatus !== undefined) patch.paymentStatus = data.paymentStatus;
      if (data.heldUntil !== undefined) {
        patch.heldUntil = data.heldUntil ? new Date(data.heldUntil) : null;
      }
      const [row] = await db
        .update(bookings)
        .set(patch)
        .where(eq(bookings.id, bookingId))
        .returning();
      return row;
    } catch (error) {
      console.error("[DB] Error updating booking payment hold:", error);
      return undefined;
    }
  }

  async findBookingsWithExpiredPaymentHold(): Promise<Booking[]> {
    try {
      return await db
        .select()
        .from(bookings)
        .where(
          and(
            sql`${bookings.heldUntil} IS NOT NULL`,
            lte(bookings.heldUntil, sql`NOW()`),
            inArray(bookings.paymentStatus, [
              BOOKING_PAYMENT_STATUS.PENDING,
              BOOKING_PAYMENT_STATUS.FAILED,
            ]),
          ),
        );
    } catch (error) {
      console.error("[DB] Error finding expired payment holds:", error);
      return [];
    }
  }

  async ensureUserSessionMapping(userId: string, classId: string): Promise<void> {
    try {
      const [existing] = await db
        .select()
        .from(userSessionMappings)
        .where(
          and(
            eq(userSessionMappings.userId, userId),
            eq(userSessionMappings.classId, classId),
          ),
        )
        .limit(1);
      if (existing) return;
      await db.insert(userSessionMappings).values({
        userId,
        classId,
        status: "upcoming",
      });
    } catch (error) {
      console.error("[DB] Error ensuring session mapping:", error);
    }
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [row] = await db.insert(payments).values(payment).returning();
    return row;
  }

  async getPaymentById(id: string): Promise<Payment | undefined> {
    const [row] = await db.select().from(payments).where(eq(payments.id, id));
    return row;
  }

  async getPaymentByBookingId(bookingId: string): Promise<Payment | undefined> {
    const [row] = await db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, bookingId))
      .orderBy(desc(payments.createdAt))
      .limit(1);
    return row;
  }

  async getPaymentByRazorpayOrderId(orderId: string): Promise<Payment | undefined> {
    const [row] = await db
      .select()
      .from(payments)
      .where(eq(payments.razorpayOrderId, orderId));
    return row;
  }

  async updatePayment(
    id: string,
    updates: Partial<InsertPayment>,
  ): Promise<Payment | undefined> {
    const [row] = await db
      .update(payments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return row;
  }

  async ensurePaymentStubForBooking(params: {
    bookingId: string;
    userId: string | null;
    classId: string;
    amountPaise: number;
    gatewayProvider: string;
    payerName?: string | null;
    payerEmail?: string | null;
    payerPhone?: string | null;
    gatewayReference?: string | null;
  }): Promise<Payment> {
    const existing = await this.getPaymentByBookingId(params.bookingId);
    if (existing) return existing;

    return this.createPayment({
      bookingId: params.bookingId,
      userId: params.userId,
      classId: params.classId,
      amountPaise: params.amountPaise,
      currency: "INR",
      status: "pending",
      gatewayProvider: params.gatewayProvider,
      gatewayReference: params.gatewayReference ?? null,
      payerName: params.payerName ?? null,
      payerEmail: params.payerEmail ?? null,
      payerPhone: params.payerPhone ?? null,
      adminDisposition: "pending",
    });
  }

  private mapPaymentHistoryRows(
    rows: Array<{
      id: string;
      bookingId: string;
      userId: string | null;
      userName: string | null;
      userEmail: string | null;
      className: string;
      sessionDate: Date;
      amountPaise: number | null;
      currency: string;
      paymentMethod: string | null;
      gatewayProvider: string | null;
      gatewayReference: string | null;
      payerName: string | null;
      payerEmail: string | null;
      payerPhone: string | null;
      gatewayPaymentMethod: string | null;
      status: string;
      adminDisposition: string | null;
      bookingPaymentStatus?: string | null;
      verificationStatus?: string | null;
      transactionAckNumber?: string | null;
      receiptUrl: string | null;
      invoiceUrl: string | null;
      paidAt: Date | null;
      createdAt: Date;
    }>,
  ): PaymentHistoryRow[] {
    return rows.map((r) => ({
      id: r.id,
      bookingId: r.bookingId,
      userId: r.userId,
      userName: r.userName ?? r.payerName ?? "Guest",
      userEmail: r.userEmail ?? r.payerEmail ?? "",
      className: r.className,
      sessionDate: r.sessionDate.toISOString(),
      amountPaise: r.amountPaise,
      currency: r.currency,
      paymentMethod: r.paymentMethod,
      gatewayProvider: r.gatewayProvider,
      gatewayReference: r.gatewayReference,
      payerName: r.payerName,
      payerEmail: r.payerEmail,
      payerPhone: r.payerPhone,
      gatewayPaymentMethod: r.gatewayPaymentMethod,
      status: r.status,
      adminDisposition:
        r.adminDisposition ?? dispositionFromPaymentStatus(r.status),
      bookingPaymentStatus: r.bookingPaymentStatus ?? null,
      verificationStatus: r.verificationStatus ?? null,
      transactionAckNumber: r.transactionAckNumber ?? null,
      receiptUrl: r.receiptUrl,
      invoiceUrl: r.invoiceUrl,
      paidAt: r.paidAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getPaymentHistoryForAdmin(): Promise<PaymentHistoryRow[]> {
    try {
      const rows = await db
        .select({
          id: payments.id,
          bookingId: payments.bookingId,
          userId: payments.userId,
          userName: users.name,
          userEmail: users.email,
          guestName: bookings.guestName,
          guestEmail: bookings.guestEmail,
          className: classTypes.name,
          sessionDate: classes.date,
          amountPaise: payments.amountPaise,
          currency: payments.currency,
          paymentMethod: bookings.paymentMethod,
          gatewayProvider: payments.gatewayProvider,
          gatewayReference: payments.gatewayReference,
          payerName: payments.payerName,
          payerEmail: payments.payerEmail,
          payerPhone: payments.payerPhone,
          gatewayPaymentMethod: payments.gatewayPaymentMethod,
          status: payments.status,
          adminDisposition: payments.adminDisposition,
          bookingPaymentStatus: bookings.paymentStatus,
          verificationStatus: bookings.verificationStatus,
          transactionAckNumber: bookings.transactionAckNumber,
          receiptUrl: payments.receiptUrl,
          invoiceUrl: payments.invoiceUrl,
          paidAt: payments.paidAt,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .innerJoin(bookings, eq(payments.bookingId, bookings.id))
        .leftJoin(users, eq(payments.userId, users.id))
        .innerJoin(classes, eq(payments.classId, classes.id))
        .innerJoin(classTypes, eq(classes.classTypeId, classTypes.id))
        .orderBy(desc(payments.createdAt));
      return this.mapPaymentHistoryRows(
        rows.map((r) => ({
          ...r,
          userName: r.userName ?? r.guestName ?? r.payerName,
          userEmail: r.userEmail ?? r.guestEmail ?? r.payerEmail,
        })),
      );
    } catch (error) {
      console.error("[DB] Error loading admin payment history:", error);
      return [];
    }
  }

  async getPaymentHistoryForUser(userId: string): Promise<PaymentHistoryRow[]> {
    try {
      const rows = await db
        .select({
          id: payments.id,
          bookingId: payments.bookingId,
          userId: payments.userId,
          userName: users.name,
          userEmail: users.email,
          className: classTypes.name,
          sessionDate: classes.date,
          amountPaise: payments.amountPaise,
          currency: payments.currency,
          paymentMethod: bookings.paymentMethod,
          gatewayProvider: payments.gatewayProvider,
          gatewayReference: payments.gatewayReference,
          payerName: payments.payerName,
          payerEmail: payments.payerEmail,
          payerPhone: payments.payerPhone,
          gatewayPaymentMethod: payments.gatewayPaymentMethod,
          status: payments.status,
          adminDisposition: payments.adminDisposition,
          receiptUrl: payments.receiptUrl,
          invoiceUrl: payments.invoiceUrl,
          paidAt: payments.paidAt,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .innerJoin(bookings, eq(payments.bookingId, bookings.id))
        .innerJoin(users, eq(payments.userId, users.id))
        .innerJoin(classes, eq(payments.classId, classes.id))
        .innerJoin(classTypes, eq(classes.classTypeId, classTypes.id))
        .where(eq(payments.userId, userId))
        .orderBy(desc(payments.createdAt));
      return this.mapPaymentHistoryRows(rows);
    } catch (error) {
      console.error("[DB] Error loading user payment history:", error);
      return [];
    }
  }

  async updatePaymentAdminDisposition(
    paymentId: string,
    disposition: string,
  ): Promise<Payment | undefined> {
    const [row] = await db
      .update(payments)
      .set({ adminDisposition: disposition, updatedAt: new Date() })
      .where(eq(payments.id, paymentId))
      .returning();
    return row;
  }

  async getMemberSessions(userId: string): Promise<MemberSessionRow[]> {
    try {
      const rows = await db
        .select({
          mappingId: userSessionMappings.id,
          bookingId: bookings.id,
          classId: classes.id,
          className: classTypes.name,
          instructorName: instructors.name,
          sessionDate: classes.date,
          sessionDurationMinutes: classTypes.duration,
          googleMeetLink: classes.googleMeetLink,
          mappingStatus: userSessionMappings.status,
          mappingCancellationReason: userSessionMappings.cancellationReason,
          classCancelledAt: classes.cancelledAt,
          classCancellationReason: classes.cancellationReason,
          paymentStatus: bookings.paymentStatus,
          paymentMethod: bookings.paymentMethod,
          verificationStatus: bookings.verificationStatus,
          paidAt: payments.paidAt,
          receiptUrl: payments.receiptUrl,
          invoiceUrl: payments.invoiceUrl,
          amountPaise: payments.amountPaise,
          bookedAt: bookings.createdAt,
        })
        .from(bookings)
        .innerJoin(classes, eq(bookings.classId, classes.id))
        .innerJoin(classTypes, eq(classes.classTypeId, classTypes.id))
        .innerJoin(instructors, eq(classes.instructorId, instructors.id))
        .leftJoin(
          userSessionMappings,
          and(
            eq(userSessionMappings.userId, bookings.userId),
            eq(userSessionMappings.classId, bookings.classId),
          ),
        )
        .leftJoin(payments, eq(payments.bookingId, bookings.id))
        .where(eq(bookings.userId, userId))
        .orderBy(sql`${bookings.createdAt} DESC`);

      const seen = new Set<string>();
      const unique = rows.filter((r) => {
        if (seen.has(r.bookingId)) return false;
        seen.add(r.bookingId);
        return true;
      });

      const now = new Date();
      return unique.map((r) => {
        const isPaid = r.paymentStatus === "paid" || r.paymentStatus === "waived";
        const { status, isLive } = classifyMemberSessionStatus({
          mappingStatus: r.mappingStatus ?? "upcoming",
          classCancelledAt: r.classCancelledAt,
          sessionStart: r.sessionDate,
          durationMinutes: r.sessionDurationMinutes,
          now,
        });
        const cancellationReason =
          r.mappingCancellationReason?.trim() ||
          r.classCancellationReason?.trim() ||
          null;

        const duration = r.sessionDurationMinutes ?? 60;
        const meetJoinState = getMeetJoinState({
          sessionStart: r.sessionDate,
          sessionDurationMinutes: duration,
          isPaid,
          hasMeetLink: !!r.googleMeetLink?.trim(),
        });

        return {
          id: r.mappingId ?? r.bookingId,
          bookingId: r.bookingId,
          classId: r.classId,
          className: r.className,
          instructorName: r.instructorName,
          sessionDate: r.sessionDate.toISOString(),
          googleMeetLink: isPaid ? r.googleMeetLink : null,
          status,
          isLive,
          cancellationReason,
          paymentStatus: r.paymentStatus ?? "pending",
          paymentMethod: r.paymentMethod ?? null,
          verificationStatus: r.verificationStatus ?? null,
          paidAt: r.paidAt?.toISOString() ?? null,
          receiptUrl: r.receiptUrl,
          invoiceUrl: r.invoiceUrl,
          amountPaise: r.amountPaise,
          bookedAt: r.bookedAt.toISOString(),
          sessionDurationMinutes: duration,
          meetJoinState,
        };
      });
    } catch (error) {
      console.error("[DB] Error getting member sessions:", error);
      return [];
    }
  }

  async getAllPaymentQrCodes(): Promise<PaymentQrCode[]> {
    try {
      return await db.select().from(paymentQrCodes).orderBy(desc(paymentQrCodes.createdAt));
    } catch (error) {
      console.error("[DB] Error getting payment QR codes:", error);
      return [];
    }
  }

  async getPaymentQrCode(id: string): Promise<PaymentQrCode | undefined> {
    const [row] = await db.select().from(paymentQrCodes).where(eq(paymentQrCodes.id, id));
    return row;
  }

  async createPaymentQrCode(data: InsertPaymentQrCode): Promise<PaymentQrCode> {
    const [row] = await db.insert(paymentQrCodes).values(data).returning();
    return row;
  }

  async updatePaymentQrCode(
    id: string,
    updates: Partial<InsertPaymentQrCode>,
  ): Promise<PaymentQrCode | undefined> {
    const [row] = await db
      .update(paymentQrCodes)
      .set(updates)
      .where(eq(paymentQrCodes.id, id))
      .returning();
    return row;
  }

  async deletePaymentQrCode(id: string): Promise<{ ok: boolean; message?: string }> {
    const inUse = await this.countClassesByPaymentQrCodeId(id);
    if (inUse > 0) {
      return { ok: false, message: "This QR code is linked to scheduled sessions and cannot be deleted." };
    }
    await db.delete(paymentQrCodes).where(eq(paymentQrCodes.id, id));
    return { ok: true };
  }

  async countClassesByPaymentQrCodeId(qrId: string): Promise<number> {
    const rows = await db
      .select({ id: classes.id })
      .from(classes)
      .where(eq(classes.paymentQrCodeId, qrId));
    return rows.length;
  }

  async submitBookingPaymentAck(
    bookingId: string,
    actorUserId: string | null,
    guestCheckoutBookingId: string | null,
    transactionAckNumber: string,
  ): Promise<Booking | undefined> {
    const booking = await this.getBooking(bookingId);
    if (!booking) return undefined;

    const memberOk = actorUserId && booking.userId === actorUserId;
    const guestOk =
      guestCheckoutBookingId &&
      booking.isGuestCheckout &&
      booking.id === guestCheckoutBookingId;
    if (!memberOk && !guestOk) return undefined;
    const method = normalizeSessionPaymentMethod(booking.paymentMethod);
    if (method !== "qr" && method !== "razorpay_link") return undefined;
    if (booking.paymentStatus === "paid") return booking;

    const [row] = await db
      .update(bookings)
      .set({
        transactionAckNumber,
        verificationStatus: "pending",
        ackSubmittedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    const payment = await this.getPaymentByBookingId(bookingId);
    if (payment) {
      await this.updatePayment(payment.id, {
        gatewayReference: transactionAckNumber,
        adminDisposition: "pending",
      });
    }

    return row;
  }

  async getPendingQrBookings(): Promise<PendingQrBookingRow[]> {
    try {
      const rows = await db
        .select({
          bookingId: bookings.id,
          verificationStatus: bookings.verificationStatus,
          transactionAckNumber: bookings.transactionAckNumber,
          ackSubmittedAt: bookings.ackSubmittedAt,
          paymentStatus: bookings.paymentStatus,
          userId: users.id,
          userName: users.name,
          userEmail: users.email,
          classId: classes.id,
          className: classTypes.name,
          sessionDate: classes.date,
          instructorName: instructors.name,
          price: classTypes.price,
        })
        .from(bookings)
        .innerJoin(users, eq(bookings.userId, users.id))
        .innerJoin(classes, eq(bookings.classId, classes.id))
        .innerJoin(classTypes, eq(classes.classTypeId, classTypes.id))
        .innerJoin(instructors, eq(classes.instructorId, instructors.id))
        .where(
          and(
            eq(bookings.paymentMethod, "qr"),
            eq(bookings.verificationStatus, "pending"),
          ),
        )
        .orderBy(desc(bookings.ackSubmittedAt));

      return rows.map((r) => ({
        bookingId: r.bookingId,
        verificationStatus: r.verificationStatus ?? "pending",
        transactionAckNumber: r.transactionAckNumber,
        ackSubmittedAt: r.ackSubmittedAt?.toISOString() ?? null,
        paymentStatus: r.paymentStatus,
        userId: r.userId,
        userName: r.userName,
        userEmail: r.userEmail,
        classId: r.classId,
        className: r.className,
        sessionDate: r.sessionDate.toISOString(),
        instructorName: r.instructorName,
        price: String(r.price),
      }));
    } catch (error) {
      console.error("[DB] Error getting pending QR bookings:", error);
      return [];
    }
  }

  async confirmQrBooking(bookingId: string): Promise<Booking | undefined> {
    const [row] = await db
      .update(bookings)
      .set({
        paymentStatus: "paid",
        verificationStatus: "confirmed",
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    const payment = await this.getPaymentByBookingId(bookingId);
    if (payment) {
      await this.updatePayment(payment.id, {
        status: "paid",
        paidAt: new Date(),
        adminDisposition: "received",
      });
    }

    return row;
  }

  // Contact Messages
  async getAllContactMessages(): Promise<ContactMessage[]> {
    try {
      return await db.select().from(contactMessages);
    } catch (error) {
      console.error('[DB] Error getting contact messages:', error);
      return [];
    }
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    try {
      const [newMessage] = await db.insert(contactMessages).values(message).returning();
      return newMessage;
    } catch (error) {
      console.error('[DB] Error creating contact message:', error);
      throw error;
    }
  }

  /** Keep And We Flow catalogue images in sync when assets are added to the repo. */
  private async syncClassTypeImages(): Promise<void> {
    const imageByName: Record<string, string> = {
      "Hatha Yoga": "/attached_assets/hatha_yoga_1756809174781.png",
      Meditation: "/attached_assets/meditation_1756809174781.png",
      "Sound Therapy": "/attached_assets/soundtherapy_1756809174781.png",
    };
    for (const [name, imageUrl] of Object.entries(imageByName)) {
      await db.update(classTypes).set({ imageUrl }).where(eq(classTypes.name, name));
    }
  }

  /**
   * When ADMIN_INITIAL_PASSWORD is set, upsert the bootstrap admin by env email
   * (not an arbitrary first row). Runs on every boot and before admin login.
   */
  async syncAdminFromEnv(options?: { throwOnError?: boolean }): Promise<void> {
    const config = getAdminBootstrapConfig();
    if (!config) {
      console.warn(
        "[DB] ADMIN_INITIAL_PASSWORD not set or shorter than 8 chars — admin bootstrap skipped.",
      );
      return;
    }

    try {
      const passwordHash = await hashPassword(config.password);
      const targetEmail = config.email;

      let admin = await this.getAdminByEmail(targetEmail);

      if (!admin) {
        const [first] = await db.select().from(adminUsers).limit(1);
        if (first) {
          const [updated] = await db
            .update(adminUsers)
            .set({
              email: targetEmail,
              passwordHash,
              name: config.name || first.name,
              role: "super_admin",
            })
            .where(eq(adminUsers.id, first.id))
            .returning();
          admin = updated;
          console.log(`[DB] Migrated admin row to bootstrap email ${updated.email}`);
        } else {
          const [inserted] = await db
            .insert(adminUsers)
            .values({
              email: targetEmail,
              name: config.name || "System Administrator",
              role: "super_admin",
              passwordHash,
            })
            .returning();
          admin = inserted;
          console.log(`[DB] Created bootstrap admin: ${inserted.email}`);
        }
      } else {
        const [updated] = await db
          .update(adminUsers)
          .set({
            passwordHash,
            ...(config.name ? { name: config.name } : {}),
            role: "super_admin",
          })
          .where(eq(adminUsers.id, admin.id))
          .returning();
        admin = updated;
        console.log(`[DB] Admin bootstrap synced for ${updated.email}`);
      }

      const unhashedAdmins = await db
        .select()
        .from(adminUsers)
        .where(or(isNull(adminUsers.passwordHash), eq(adminUsers.passwordHash, "")));

      for (const row of unhashedAdmins) {
        await db
          .update(adminUsers)
          .set({ passwordHash })
          .where(eq(adminUsers.id, row.id));
        console.warn(
          `[DB] Backfilled missing password_hash for admin ${row.email} from ADMIN_INITIAL_PASSWORD.`,
        );
      }
    } catch (error) {
      console.error("[DB] Error syncing admin from env:", error);
      if (options?.throwOnError !== false) throw error;
    }
  }

  // Admin Users Methods
  async getAdminByEmail(email: string): Promise<AdminUser | undefined> {
    try {
      const normalizedEmail = normalizeAdminEmail(email);
      const [admin] = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.email, normalizedEmail))
        .limit(1);
      return admin || undefined;
    } catch (error) {
      console.error("[DB] Error getting admin by email:", error);
      return undefined;
    }
  }

  async getAdminById(id: string): Promise<AdminUser | undefined> {
    try {
      const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
      return admin || undefined;
    } catch (error) {
      console.error('[DB] Error getting admin by id:', error);
      return undefined;
    }
  }

  async createAdminUser(admin: InsertAdminUser, passwordHash: string): Promise<AdminUser> {
    try {
      const [newAdmin] = await db
        .insert(adminUsers)
        .values({ ...admin, passwordHash })
        .returning();
      return newAdmin;
    } catch (error) {
      console.error('[DB] Error creating admin user:', error);
      throw error;
    }
  }

  async updateAdminPasswordHash(id: string, passwordHash: string): Promise<AdminUser | undefined> {
    try {
      const [row] = await db
        .update(adminUsers)
        .set({ passwordHash })
        .where(eq(adminUsers.id, id))
        .returning();
      return row || undefined;
    } catch (error) {
      console.error('[DB] Error updating admin password hash:', error);
      return undefined;
    }
  }

  async verifyAdminCredentials(email: string, password: string): Promise<AdminUser | undefined> {
    try {
      const normalizedEmail = normalizeAdminEmail(email);
      const normalizedPassword = normalizeAdminPassword(password);
      const bootstrap = getAdminBootstrapConfig();

      if (bootstrap) {
        await this.syncAdminFromEnv({ throwOnError: false });
      }

      let admin = await this.getAdminByEmail(normalizedEmail);

      if (!admin) {
        if (bootstrap && bootstrap.email !== normalizedEmail) {
          console.warn(
            `[Admin login] No admin for "${normalizedEmail}". Use bootstrap email "${bootstrap.email}" (ADMIN_INITIAL_EMAIL).`,
          );
        }
        return undefined;
      }

      if (admin.passwordHash && (await verifyPassword(normalizedPassword, admin.passwordHash))) {
        return admin;
      }

      if (bootstrap && normalizedPassword === bootstrap.password) {
        const passwordHash = await hashPassword(normalizedPassword);
        await this.updateAdminPasswordHash(admin.id, passwordHash);
        return { ...admin, passwordHash };
      }

      return undefined;
    } catch (error) {
      console.error("[DB] Error verifying admin credentials:", error);
      return undefined;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(users);
    } catch (error) {
      console.error('[DB] Error getting all users:', error);
      return [];
    }
  }

  async getUsersWithCompleteness(): Promise<(User & { completeness: ProfileCompleteness })[]> {
    try {
      const allUsers = await this.getAllUsers();
      
      return allUsers.map(user => {
        const completeness = this.calculateProfileCompleteness(user);
        return { ...user, completeness };
      });
    } catch (error) {
      console.error('[DB] Error getting users with completeness:', error);
      return [];
    }
  }

  async getAdminProfile(adminUserId: string): Promise<AdminProfile | undefined> {
    const [row] = await db
      .select()
      .from(adminProfiles)
      .where(eq(adminProfiles.adminUserId, adminUserId))
      .limit(1);
    return row ?? undefined;
  }

  async upsertAdminProfile(
    adminUserId: string,
    profile: Omit<InsertAdminProfile, "adminUserId">,
  ): Promise<AdminProfile> {
    const existing = await this.getAdminProfile(adminUserId);
    if (existing) {
      const [updated] = await db
        .update(adminProfiles)
        .set({ ...profile, updatedAt: new Date() })
        .where(eq(adminProfiles.adminUserId, adminUserId))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(adminProfiles)
      .values({ ...profile, adminUserId })
      .returning();
    return created;
  }

  async updateAdminProfileVerification(
    adminUserId: string,
    status: "pending" | "verified" | "rejected",
    notes?: string | null,
  ): Promise<AdminProfile | undefined> {
    const [row] = await db
      .update(adminProfiles)
      .set({
        verificationStatus: status,
        verificationNotes: notes ?? null,
        verifiedAt: status === "verified" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(adminProfiles.adminUserId, adminUserId))
      .returning();
    return row ?? undefined;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [row] = await db.insert(subscriptions).values(subscription).returning();
    return row;
  }

  async getSubscriptionSummariesForAdmin(): Promise<SubscriptionSummaryRow[]> {
    const rows = await db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        userName: users.name,
        userEmail: users.email,
        classTypeId: subscriptions.classTypeId,
        classTypeName: classTypes.name,
        subscriptionType: subscriptions.subscriptionType,
        totalAmountPaise: subscriptions.totalAmountPaise,
        totalSessions: subscriptions.totalSessions,
        utilizedSessions: subscriptions.utilizedSessions,
        refundedSessions: subscriptions.refundedSessions,
        disputedSessions: subscriptions.disputedSessions,
        disputesResolved: subscriptions.disputesResolved,
        waivedSessions: subscriptions.waivedSessions,
        status: subscriptions.status,
        expiresAt: subscriptions.expiresAt,
        createdAt: subscriptions.createdAt,
      })
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .innerJoin(classTypes, eq(subscriptions.classTypeId, classTypes.id))
      .orderBy(desc(subscriptions.createdAt));
    return rows.map((r) => ({
      ...r,
      expiresAt: r.expiresAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getSubscriptionSummariesForUser(userId: string): Promise<SubscriptionSummaryRow[]> {
    const rows = await db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        userName: users.name,
        userEmail: users.email,
        classTypeId: subscriptions.classTypeId,
        classTypeName: classTypes.name,
        subscriptionType: subscriptions.subscriptionType,
        totalAmountPaise: subscriptions.totalAmountPaise,
        totalSessions: subscriptions.totalSessions,
        utilizedSessions: subscriptions.utilizedSessions,
        refundedSessions: subscriptions.refundedSessions,
        disputedSessions: subscriptions.disputedSessions,
        disputesResolved: subscriptions.disputesResolved,
        waivedSessions: subscriptions.waivedSessions,
        status: subscriptions.status,
        expiresAt: subscriptions.expiresAt,
        createdAt: subscriptions.createdAt,
      })
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .innerJoin(classTypes, eq(subscriptions.classTypeId, classTypes.id))
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt));
    return rows.map((r) => ({
      ...r,
      expiresAt: r.expiresAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async insertAuditLog(entry: InsertAuditLog): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: entry.userId ?? null,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId ?? null,
        metadata: entry.metadata ?? null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      });
    } catch (error) {
      console.error("[AUDIT] Failed to write audit log entry:", error, entry);
    }
  }

  async insertConsentLog(input: ConsentLogInput): Promise<void> {
    const hasUser = !!input.userId;
    const hasBooking = !!input.bookingId;
    if (hasUser === hasBooking) {
      throw new Error("Exactly one of userId or bookingId must be set for consent logs");
    }
    await db.insert(consentAuditLogs).values({
      userId: input.userId ?? null,
      bookingId: input.bookingId ?? null,
      consentType: input.consentType,
      action: input.action,
      consentVersion: input.consentVersion ?? "unknown",
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  }

  async getConsentLogsForUser(userId: string) {
    return db
      .select()
      .from(consentAuditLogs)
      .where(eq(consentAuditLogs.userId, userId))
      .orderBy(desc(consentAuditLogs.timestampUtc));
  }

  async userHasActiveConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const rows = await this.getConsentLogsForUser(userId);
    const latest = rows.find((r) => r.consentType === consentType);
    return latest?.action === "opt_in";
  }

  async recordRegistrationConsents(params: {
    userId: string;
    dateOfBirth: string;
    consentVersion: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    await db
      .update(users)
      .set({ dateOfBirth: params.dateOfBirth, updatedAt: new Date() })
      .where(eq(users.id, params.userId));

    const base = {
      userId: params.userId,
      consentVersion: params.consentVersion,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      action: "opt_in" as const,
    };
    for (const consentType of ["profile_booking", "terms", "age_declaration"] as const) {
      await this.insertConsentLog({ ...base, consentType });
    }
  }

  async recordGuestBookingConsents(params: {
    bookingId: string;
    consentVersion: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    const now = new Date();
    await db
      .update(bookings)
      .set({
        guestConsentProfile: true,
        guestConsentTerms: true,
        guestConsentAge: true,
        guestConsentAt: now,
      })
      .where(eq(bookings.id, params.bookingId));

    const base = {
      bookingId: params.bookingId,
      consentVersion: params.consentVersion,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      action: "opt_in" as const,
    };
    for (const consentType of ["profile_booking", "terms", "age_declaration"] as const) {
      await this.insertConsentLog({ ...base, consentType });
    }
  }

  async withdrawHealthDataConsent(params: {
    userId: string;
    consentVersion: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<User | undefined> {
    const [existingUser, documents, hasActiveConsent] = await Promise.all([
      this.getUser(params.userId),
      this.getUserDocuments(params.userId),
      this.userHasActiveConsent(params.userId, "health_data"),
    ]);
    if (!existingUser) {
      return undefined;
    }

    const documentReferences = [...new Set([
      ...(existingUser.healthDocumentUrls ?? []),
      ...documents.map((document) => document.storageKey),
    ])];
    await this.deleteHealthDocumentReferences(documentReferences);

    const now = new Date();
    const [updated] = await db.transaction(async (tx) => {
      await tx.delete(userDocuments).where(eq(userDocuments.userId, params.userId));

      const [row] = await tx
        .update(users)
        .set({
          healthUpdateText: null,
          healthDocumentUrls: null,
          healthMediaLinks: [],
          healthUpdateHistory: [],
          healthUpdateLastModified: null,
          profileCompletionStatus: "incomplete",
          updatedAt: now,
        })
        .where(eq(users.id, params.userId))
        .returning();

      if (hasActiveConsent) {
        await tx.insert(consentAuditLogs).values({
          userId: params.userId,
          bookingId: null,
          consentType: "health_data",
          action: "opt_out",
          consentVersion: params.consentVersion,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
        });
      }

      return [row];
    });

    return updated;
  }

  async requestAccountErasure(params: {
    userId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{ erasureRequestId: string; scheduledErasureAt: Date }> {
    const now = new Date();
    const scheduledErasureAt = scheduledErasureDate(now);

    const existing = await this.getPendingErasureForUser(params.userId);
    if (existing) {
      return { erasureRequestId: existing.id, scheduledErasureAt: existing.scheduledErasureAt };
    }

    const [request] = await db
      .insert(erasureRequests)
      .values({
        userId: params.userId,
        status: "pending",
        scheduledErasureAt,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      })
      .returning();

    const upcoming = await db
      .select({ classId: userSessionMappings.classId })
      .from(userSessionMappings)
      .innerJoin(classes, eq(classes.id, userSessionMappings.classId))
      .where(
        and(
          eq(userSessionMappings.userId, params.userId),
          or(isNull(userSessionMappings.status), sql`${userSessionMappings.status} <> 'cancelled'`),
          gte(classes.date, sql`CURRENT_DATE`),
        ),
      );

    for (const row of upcoming) {
      await db
        .update(userSessionMappings)
        .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
        .where(
          and(
            eq(userSessionMappings.userId, params.userId),
            eq(userSessionMappings.classId, row.classId),
          ),
        );
    }

    for (const classId of new Set(upcoming.map((row) => row.classId))) {
      await this.syncClassBookingCount(classId);
    }

    await db
      .update(users)
      .set({ isActive: false, updatedAt: now })
      .where(eq(users.id, params.userId));

    const version = consentVersion();
    for (const consentType of ["profile_booking", "terms", "age_declaration", "health_data"] as const) {
      const active = await this.userHasActiveConsent(params.userId, consentType);
      if (active) {
        await this.insertConsentLog({
          userId: params.userId,
          consentType,
          action: "opt_out",
          consentVersion: version,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        });
      }
    }

    return { erasureRequestId: request.id, scheduledErasureAt };
  }

  async userHasErasureHistory(userId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: erasureRequests.id })
      .from(erasureRequests)
      .where(eq(erasureRequests.userId, userId))
      .limit(1);
    return Boolean(row);
  }

  async reopenAccountAfterSelfErasure(userId: string): Promise<User | undefined> {
    const hasErasure = await this.userHasErasureHistory(userId);
    if (!hasErasure) return undefined;

    const now = new Date();
    await db
      .update(erasureRequests)
      .set({ status: "cancelled", completedAt: now })
      .where(and(eq(erasureRequests.userId, userId), eq(erasureRequests.status, "pending")));

    await db
      .update(users)
      .set({
        isActive: true,
        primaryMobile: null,
        primaryMobileCountryCode: "+91",
        secondaryMobile: null,
        secondaryMobileCountryCode: "+91",
        emergencyMobile: null,
        emergencyMobileCountryCode: "+91",
        healthUpdateText: null,
        healthDocumentUrls: null,
        healthMediaLinks: [],
        healthUpdateHistory: [],
        healthUpdateLastModified: null,
        dateOfBirth: null,
        profileCompletionStatus: "incomplete",
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    return this.getUser(userId);
  }

  async processDueAccountErasures(now: Date = new Date()): Promise<number> {
    const dueRequests = await db
      .select()
      .from(erasureRequests)
      .where(
        and(
          eq(erasureRequests.status, "pending"),
          lte(erasureRequests.scheduledErasureAt, now),
        ),
      )
      .orderBy(erasureRequests.scheduledErasureAt);

    let processed = 0;
    for (const request of dueRequests) {
      if (!request.userId) {
        continue;
      }

      const result = await this.deleteUserRecordsPermanently(request.userId, {
        preserveCompletedErasureIds: [request.id],
        completedAt: now,
      });
      if (result.ok) {
        processed += 1;
      }
    }

    return processed;
  }

  async getPendingErasureForUser(userId: string) {
    const [row] = await db
      .select()
      .from(erasureRequests)
      .where(and(eq(erasureRequests.userId, userId), eq(erasureRequests.status, "pending")))
      .limit(1);
    return row;
  }

  async getAdminConsentLogs(limit = 200) {
    return db
      .select()
      .from(consentAuditLogs)
      .orderBy(desc(consentAuditLogs.timestampUtc))
      .limit(limit);
  }

  async incrementSubscriptionUtilization(userId: string, classId: string): Promise<void> {
    const cls = await this.getClass(classId);
    if (!cls) return;
    const [active] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.classTypeId, cls.classTypeId),
          eq(subscriptions.status, "active"),
        ),
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    if (!active) return;
    await db
      .update(subscriptions)
      .set({
        utilizedSessions: sql`${subscriptions.utilizedSessions} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, active.id));
  }

  async createCouponCode(data: InsertCouponCode): Promise<CouponCode> {
    const [row] = await db.insert(couponCodes).values(data).returning();
    return row;
  }

  async getCouponById(id: string): Promise<CouponCode | undefined> {
    const [row] = await db.select().from(couponCodes).where(eq(couponCodes.id, id));
    return row;
  }

  async getActiveCouponByCode(code: string): Promise<CouponCode | undefined> {
    const normalized = normalizeCouponCode(code);
    const [row] = await db
      .select()
      .from(couponCodes)
      .where(
        and(
          eq(couponCodes.code, normalized),
          eq(couponCodes.status, "active"),
          gt(couponCodes.expiresAt, sql`CURRENT_TIMESTAMP`),
        ),
      );
    return row;
  }

  async getCouponSummariesForAdmin(): Promise<CouponAdminSummaryRow[]> {
    const rows = await db
      .select({
        id: couponCodes.id,
        code: couponCodes.code,
        discountType: couponCodes.discountType,
        discountValue: couponCodes.discountValue,
        classTypeId: couponCodes.classTypeId,
        classTypeName: classTypes.name,
        classId: couponCodes.classId,
        sessionDate: classes.date,
        expiresAt: couponCodes.expiresAt,
        maxUses: couponCodes.maxUses,
        useCount: couponCodes.useCount,
        status: couponCodes.status,
        createdByAdminName: adminUsers.name,
        notes: couponCodes.notes,
        createdAt: couponCodes.createdAt,
      })
      .from(couponCodes)
      .innerJoin(adminUsers, eq(couponCodes.createdByAdminId, adminUsers.id))
      .leftJoin(classTypes, eq(couponCodes.classTypeId, classTypes.id))
      .leftJoin(classes, eq(couponCodes.classId, classes.id))
      .orderBy(desc(couponCodes.createdAt));

    const redemptionStats = await db
      .select({
        couponId: couponRedemptions.couponId,
        redemptionCount: count(),
        totalDiscountPaise: sql<number>`coalesce(sum(${couponRedemptions.discountAmountPaise}), 0)`,
      })
      .from(couponRedemptions)
      .groupBy(couponRedemptions.couponId);

    const statsByCoupon = new Map(
      redemptionStats.map((s) => [
        s.couponId,
        {
          redemptionCount: Number(s.redemptionCount),
          totalDiscountPaise: Number(s.totalDiscountPaise),
        },
      ]),
    );

    const nowMs = Date.now();
    return rows.map((r) => {
      const stats = statsByCoupon.get(r.id) ?? { redemptionCount: 0, totalDiscountPaise: 0 };
      let sessionLabel: string | null = null;
      if (r.classTypeName && r.sessionDate) {
        const when = new Date(r.sessionDate).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        sessionLabel = `${r.classTypeName} on ${when}`;
      } else if (r.classTypeName) {
        sessionLabel = r.classTypeName;
      }
      return {
        id: r.id,
        code: r.code,
        discountType: r.discountType,
        discountValue: r.discountValue,
        classTypeId: r.classTypeId,
        classTypeName: r.classTypeName,
        classId: r.classId,
        sessionLabel,
        expiresAt: r.expiresAt.toISOString(),
        maxUses: r.maxUses,
        useCount: r.useCount,
        status: r.status,
        createdByAdminName: r.createdByAdminName,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
        isExpired: !isCouponNotExpired(r.expiresAt, nowMs),
        redemptionCount: stats.redemptionCount,
        totalDiscountPaise: stats.totalDiscountPaise,
      };
    });
  }

  async getCouponRedemptionsForAdmin(couponId?: string): Promise<CouponRedemptionRow[]> {
    const conditions = couponId ? eq(couponRedemptions.couponId, couponId) : undefined;
    const rows = await db
      .select({
        id: couponRedemptions.id,
        couponId: couponRedemptions.couponId,
        couponCode: couponCodes.code,
        userId: couponRedemptions.userId,
        userName: users.name,
        userEmail: users.email,
        bookingId: couponRedemptions.bookingId,
        paymentId: couponRedemptions.paymentId,
        classTypeId: couponRedemptions.classTypeId,
        classTypeName: classTypes.name,
        classId: couponRedemptions.classId,
        sessionDate: classes.date,
        originalAmountPaise: couponRedemptions.originalAmountPaise,
        discountAmountPaise: couponRedemptions.discountAmountPaise,
        finalAmountPaise: couponRedemptions.finalAmountPaise,
        redeemedAt: couponRedemptions.redeemedAt,
      })
      .from(couponRedemptions)
      .innerJoin(couponCodes, eq(couponRedemptions.couponId, couponCodes.id))
      .leftJoin(users, eq(couponRedemptions.userId, users.id))
      .leftJoin(classTypes, eq(couponRedemptions.classTypeId, classTypes.id))
      .leftJoin(classes, eq(couponRedemptions.classId, classes.id))
      .where(conditions)
      .orderBy(desc(couponRedemptions.redeemedAt));

    return rows.map((r) => ({
      ...r,
      sessionDate: r.sessionDate?.toISOString() ?? null,
      redeemedAt: r.redeemedAt.toISOString(),
    }));
  }

  async revokeCoupon(id: string): Promise<CouponCode | undefined> {
    const [row] = await db
      .update(couponCodes)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(eq(couponCodes.id, id))
      .returning();
    return row;
  }

  async recordCouponShareLog(data: {
    couponId: string;
    adminId: string;
    userId: string;
    channel: string;
    status: string;
    errorMessage?: string | null;
    sentAt?: Date | null;
  }): Promise<CouponShareLog> {
    const [row] = await db
      .insert(couponShareLogs)
      .values({
        couponId: data.couponId,
        adminId: data.adminId,
        userId: data.userId,
        channel: data.channel,
        status: data.status,
        errorMessage: data.errorMessage ?? null,
        sentAt: data.sentAt ?? null,
      })
      .returning();
    return row;
  }

  async finalizeCouponRedemption(params: {
    couponId: string;
    userId: string | null;
    bookingId: string;
    paymentId: string;
    classTypeId: string;
    classId: string;
    originalAmountPaise: number;
    discountAmountPaise: number;
    finalAmountPaise: number;
  }): Promise<CouponRedemption | null> {
    return db.transaction(async (tx) => {
      const [coupon] = await tx
        .select()
        .from(couponCodes)
        .where(eq(couponCodes.id, params.couponId))
        .for("update");

      if (!coupon) return null;

      const applicability = evaluateCouponApplicability({
        status: coupon.status as "active" | "revoked",
        expiresAt: coupon.expiresAt,
        maxUses: coupon.maxUses,
        useCount: coupon.useCount,
        classTypeId: coupon.classTypeId,
        classId: coupon.classId,
        targetClassTypeId: params.classTypeId,
        targetClassId: params.classId,
      });
      if (!applicability.ok) return null;

      const [updated] = await tx
        .update(couponCodes)
        .set({
          useCount: sql`${couponCodes.useCount} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(couponCodes.id, params.couponId),
            eq(couponCodes.status, "active"),
            gt(couponCodes.expiresAt, sql`CURRENT_TIMESTAMP`),
            or(isNull(couponCodes.maxUses), lt(couponCodes.useCount, couponCodes.maxUses)),
          ),
        )
        .returning();

      if (!updated) return null;

      const [redemption] = await tx
        .insert(couponRedemptions)
        .values({
          couponId: params.couponId,
          userId: params.userId,
          bookingId: params.bookingId,
          paymentId: params.paymentId,
          classTypeId: params.classTypeId,
          classId: params.classId,
          originalAmountPaise: params.originalAmountPaise,
          discountAmountPaise: params.discountAmountPaise,
          finalAmountPaise: params.finalAmountPaise,
        })
        .returning();

      return redemption;
    });
  }

  async getUsersWithCompletenessPaginated(
    page: number,
    pageSize: number,
  ): Promise<{ rows: (User & { completeness: ProfileCompleteness })[]; total: number }> {
    const offset = paginationOffset(page, pageSize);
    const [{ total }] = await db.select({ total: count() }).from(users);
    const slice = await db.select().from(users).orderBy(desc(users.createdAt)).limit(pageSize).offset(offset);
    const rows = slice.map((user) => ({
      ...user,
      completeness: this.calculateProfileCompleteness(user),
    }));
    return { rows, total: Number(total) };
  }

  async getAllClassesPaginated(
    page: number,
    pageSize: number,
  ): Promise<{ rows: Class[]; total: number }> {
    const offset = paginationOffset(page, pageSize);
    const [{ total }] = await db.select({ total: count() }).from(classes);
    const rows = await db.select().from(classes).orderBy(classes.date).limit(pageSize).offset(offset);
    return { rows, total: Number(total) };
  }

  async getAllInstructorsPaginated(
    page: number,
    pageSize: number,
  ): Promise<{ rows: Instructor[]; total: number }> {
    const offset = paginationOffset(page, pageSize);
    const [{ total }] = await db.select({ total: count() }).from(instructors);
    const rows = await db
      .select()
      .from(instructors)
      .orderBy(instructors.name)
      .limit(pageSize)
      .offset(offset);
    return { rows, total: Number(total) };
  }

  async getAllClassTypesPaginated(
    page: number,
    pageSize: number,
    options: { excludeQaFixtures?: boolean } = {},
  ): Promise<{ rows: ClassType[]; total: number }> {
    const excludeQaFixtures = options.excludeQaFixtures !== false;
    const whereClause = excludeQaFixtures
      ? and(
          isNull(classTypes.retiredAt),
          not(inArray(classTypes.name, [...SEED_CLASS_TYPE_NAMES])),
          not(like(classTypes.name, `${QA_FIXTURE_CLASS_TYPE_PREFIX}%`)),
          not(like(classTypes.name, `${QA_SMOKE_CLASS_TYPE_PREFIX}%`)),
          not(like(classTypes.name, `${QA_AGENT_CLASS_TYPE_PREFIX}%`)),
        )
      : isNull(classTypes.retiredAt);
    const offset = paginationOffset(page, pageSize);
    const [{ total }] = await db.select({ total: count() }).from(classTypes).where(whereClause);
    const rows = await db
      .select()
      .from(classTypes)
      .where(whereClause)
      .orderBy(classTypes.name)
      .limit(pageSize)
      .offset(offset);
    return { rows, total: Number(total) };
  }

  async getAllBookingsPaginated(
    page: number,
    pageSize: number,
  ): Promise<{ rows: Booking[]; total: number }> {
    const offset = paginationOffset(page, pageSize);
    const [{ total }] = await db.select({ total: count() }).from(bookings);
    const rows = await db
      .select()
      .from(bookings)
      .orderBy(desc(bookings.createdAt))
      .limit(pageSize)
      .offset(offset);
    return { rows, total: Number(total) };
  }

  // Profile completeness calculation helper
  private calculateProfileCompleteness(user: User): ProfileCompleteness {
    const healthUpdateComplete = isHealthDisclosureComplete(user.healthUpdateText);
    const documentsComplete = hasHealthSupportingMaterials(
      user.healthMediaLinks,
      user.healthDocumentUrls,
    );
    const emailVerified = user.emailVerified || false;

    const isComplete = isAccountProfileComplete(user);

    const checks = [isComplete, documentsComplete];
    const completedChecks = checks.filter(Boolean).length;
    const completionPercentage = Math.round((completedChecks / checks.length) * 100);

    const flags: string[] = [];
    if (!isComplete) {
      flags.push(...getAccountProfileIncompleteReasons(user));
    }
    if (!documentsComplete) flags.push("No health materials shared");

    return {
      isComplete,
      healthUpdateComplete,
      documentsComplete,
      emailVerified,
      completionPercentage,
      flags,
    };
  }
}

export const storage = new DatabaseStorage();