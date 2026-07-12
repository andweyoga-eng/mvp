import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { z } from "zod";
import {
  isSessionBookable,
  isTrialOrDropIn,
  TRIAL_DROPIN_MIDSESSION_MESSAGE,
} from "@shared/booking-eligibility";
import { shouldBlockRecurringMidBatchBooking } from "@shared/recurring-batch";
import { expandSessionOccurrences, serializeRecurrenceWeekdays } from "@shared/session-schedule";
import {
  defaultFlexiTermsItems,
  flexiTooltipCopy,
  formatFlexiTimeLabel,
  isFlexiEnabledSchedule,
  resolveFlexiSelectionCount,
} from "@shared/flexi-mode";
import {
  GUEST_CHECKOUT_SETTING_KEY,
  MAINTENANCE_WINDOW_SETTING_KEY,
} from "@shared/platform-settings";
import { storage, storageReady } from "./storage";
import {
  getGuestCheckoutEnabled,
  setGuestCheckoutEnabled,
  getMaintenanceWindowEnabled,
  setMaintenanceWindowEnabled,
  setPlatformSettingByKey,
  ensureDefaultPlatformSettings,
  listPlatformSettings,
} from "./platform-settings";
import { getAdminBootstrapConfig, normalizeAdminEmail, normalizeAdminPassword } from "./admin-bootstrap";
import { checkDatabaseHealth } from "./db-health";
import {
  adminCreateClassTypeSchema,
  adminCreateInstructorSchema,
  adminUpdateInstructorSchema,
  adminCreateClassSessionSchema,
  adminUpdateClassSessionSchema,
  adminPaymentQrCodeSchema,
  adminUpdateInstructorStatusSchema,
  adminInstructorEmailOtpSchema,
  formatZodErrorsForDisplay,
} from "@shared/admin-validation";
import {
  isInstructorSessionPoolEligible,
  isInstructorPublicVisible,
  toPublicInstructorProfile,
} from "@shared/instructor-compliance";
import { isClassVisibleForBooking, sanitizePublicClass } from "./public-class";
import { setPublicCatalogNoStore } from "./public-catalog-cache";
import { isQaFixtureClassTypeName, isQaFixtureInstructorName } from "@shared/seed-catalog";
import { isSessionAllowedInPublicCatalog } from "./public-catalog-gate";
import {
  ADMIN_AUTH_COOKIE_NAME,
  OAUTH_KEEP_COOKIE_NAME,
  buildAdminAuthCookieOptions,
  buildAuthCookieOptions,
  buildOAuthKeepCookieOptions,
  keepSignedInFromValue,
  PENDING_CONSENT_COOKIE_NAME,
} from "./auth-cookie";
import {
  registerConsentRoutes,
  applyPendingConsentForNewUser,
  parseGuestBookingConsent,
  parseHealthDataConsent,
} from "./consent-routes";
import { consentVersion, requestMeta, validateOnboardingDateOfBirth } from "./consent";
import { isAdult } from "@shared/consent";
import { parseHealthHistory, type HealthHistoryEntry } from "@shared/health-disclosure";
import {
  resolveHealthMediaLinks,
  sanitizeHealthMediaLinksForSave,
  filterHealthObjectDocumentUrls,
} from "@shared/health-media-links";
import { userOwnsHealthDocumentPath } from "./s3HealthStorage";
import {
  applyPaymentFailureHold,
  cancelGuestCheckout,
  expirePaymentHolds,
} from "./booking-hold-service";
import { initialBookingHeldUntil } from "@shared/booking-payment-hold";
import { buildResumeCheckoutPayload, bookingCanResumeCheckout } from "./resume-checkout";
import { paginationQuerySchema, buildPaginatedResponse } from "@shared/admin-pagination";
import { REQUIRED_PHONE_MESSAGE, validateRequiredGuestPhone } from "@shared/guest-phone";
import {
  WAITLIST_SOURCE_GUEST,
  WAITLIST_SOURCE_REGULAR,
  formatProfileWhatsapp,
} from "@shared/waitlist";
import {
  buildInstructorVerifyEmailUrl,
  createInstructorEmailVerifiedHTML,
  createInstructorOtpPayload,
  deliverInstructorEmailOtp,
  resolvePublicAppBaseUrl,
  verifyInstructorOtpHash,
} from "./instructor-verification";
import { MOOD_OPTIONS } from "@shared/mood";
import {
  memberBookingBodySchema,
  createBookingRequestSchema,
  memberPaymentAckSchema,
  createCouponCodeSchema,
  shareCouponSchema,
  validateCouponSchema,
  insertContactMessageSchema,
  insertCarouselPromotionSchema,
  updateCarouselPromotionSchema,
  registerUserSchema,
  loginUserSchema,
  updateProfileSchema,
  updateProfilePartialSchema,
  healthUpdateSchema
} from "@shared/schema";
import {
  computeProfileCompletionStatus,
  isAccountProfileComplete,
} from "@shared/profileCompleteness";
import {
  hashPassword, verifyPassword, generateToken,
  generateExpiringVerificationToken, isVerificationTokenExpired,
  hashActionToken,
  generateGuestCheckoutToken,
  requireAuth, optionalAuth, requireBookingAuth, type AuthRequest
} from "./auth";
import {
  guestBookingProcessingMessage,
  GUEST_BOOKING_CONFIRMED_MESSAGE,
  GUEST_BOOKING_FAILED_MESSAGE,
} from "@shared/guest-booking-conflict";
import {
  generateAdminToken,
  requireAdminAuth,
  requireSuperAdminAuth,
  type AdminAuthRequest,
  verifyAdminCredentials,
} from "./adminAuth";
import {
  sendEmail,
  sendEmailDetailed,
  createVerificationEmailHTML,
  createPasswordResetEmailHTML,
} from "./email";
import {
  notifySessionCancellation,
  validateOwnerCancelOtp,
} from "./session-cancellation-notify";
import { setupGoogleAuth, verifyGoogleToken } from "./googleAuth";
import {
  ensureUserCanAuthenticate,
  isUserActive,
  respondAccountClosed,
  respondAccountDeactivated,
} from "./account";
import { getConfiguredCheckoutGateway, rupeesToPaise } from "./payment-gateways";
import {
  normalizeSessionPaymentMethod,
  providerForSessionMethod,
  usesHostedCheckout,
  usesQrManualVerification,
  type PaymentDisposition,
} from "@shared/payment-gateway";
import { markPaymentPaid, confirmQrBookingPayment, verifyManualPayment, getPaidPaymentPayload } from "./payment-service";
import {
  canAccessBooking,
  bookingContactName,
  bookingContactEmail,
  bookingContactPhone,
} from "./booking-access";
import { MANUAL_PAYMENT_SUBMITTED_COPY } from "@shared/manual-payment-ack";
import {
  computeFinalAmountPaise,
  evaluateCouponApplicability,
  generateCouponCode,
  isCouponNotExpired,
  normalizeCouponCode,
} from "@shared/coupons";
import {
  couponCreateOtpHint,
  deliverCouponShare,
  resolveCouponSessionLabel,
  verifyCouponCreateOtp,
} from "./coupon-service";

// Health document uploads: enabled when S3 is configured, or local disk in development.
// Set ENABLE_HEALTH_DOCUMENT_OBJECT_ROUTES=false to disable explicitly.
import {
  HealthDocumentUploadError,
  healthDocumentUploadBodySchema,
  isHealthDocumentUploadEnabled,
  streamHealthDocumentForAdmin,
  streamHealthDocumentForUser,
  uploadHealthDocumentForUser,
} from "./health-document-upload";

// ============================================================
// SECURITY FIX 4: Rate limiting on all auth endpoints.
// Prevents brute force attacks on login, registration and
// password reset. Using a simple in-memory store.
// For production at scale, replace with Redis-backed store.
// ============================================================
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: any) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((record.resetAt - now) / 1000)
      });
    }

    record.count++;
    next();
  };
}

// Clean up stale rate limit entries every 10 minutes
const rateLimitCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) rateLimitStore.delete(key);
  }
}, 10 * 60 * 1000);
rateLimitCleanupInterval.unref?.();

const authRateLimit = rateLimit(10, 15 * 60 * 1000);   // 10 attempts per 15 minutes
const forgotPwdRateLimit = rateLimit(3, 60 * 60 * 1000); // 3 attempts per hour

function adminRateLimitMiddleware(maxRequests: number, windowMs: number) {
  const adminStore = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: () => void) => {
    const key = `admin:${req.ip || "unknown"}`;
    const now = Date.now();
    const record = adminStore.get(key);
    if (!record || now > record.resetAt) {
      adminStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (record.count >= maxRequests) {
      return res.status(429).json({
        message: "Too many admin login attempts. Please try again later.",
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      });
    }
    record.count++;
    next();
  };
}

const adminLoginRateLimit = adminRateLimitMiddleware(30, 15 * 60 * 1000);

// ============================================================
// Helper: set auth cookie securely
// SECURITY FIX 2: Tokens go into httpOnly cookies, not URLs.
// ============================================================
function setAuthCookie(res: Response, token: string, persistent: boolean = true) {
  // Token goes in an httpOnly cookie (not the URL) to prevent XSS token theft.
  // "Keep me signed in" ON → persistent 7-day cookie; OFF → session cookie.
  res.cookie('authToken', token, buildAuthCookieOptions(persistent));
}

function setAdminAuthCookie(res: Response, token: string) {
  res.cookie(ADMIN_AUTH_COOKIE_NAME, token, buildAdminAuthCookieOptions());
}

/**
 * redirect_uri sent to Google must exactly match a URI in Google Cloud Console.
 * Local dev is plain HTTP; production uses HTTPS (TLS terminates at the host).
 */
function googleOauthRedirectUri(req: Request): string {
  const host = (process.env.ALLOWED_ORIGIN || req.get('host') || 'localhost:3000').trim();
  const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
  const protocol =
    process.env.NODE_ENV !== 'production' && isLocalHost ? 'http' : 'https';
  return `${protocol}://${host}/oauth2callback`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  await storageReady;

  registerConsentRoutes(app);

  // ============================================================
  // GOOGLE OAUTH ROUTES
  // ============================================================
  app.get('/api/auth/google', (req, res) => {
    // "Keep me signed in" preference (default ON) is stashed in a short-lived
    // cookie so the OAuth callback can choose a persistent vs session cookie.
    const keepSignedIn = keepSignedInFromValue(req.query.keep);
    res.cookie(OAUTH_KEEP_COOKIE_NAME, keepSignedIn ? '1' : '0', buildOAuthKeepCookieOptions());
    const redirectUri = googleOauthRedirectUri(req);
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
      // SECURITY FIX 2b: Use a fixed ALLOWED_ORIGIN env var for the redirect URI,
      // not req.get('host') which is user-controlled.
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=openid%20email%20profile&` +
      `access_type=offline&` +
      `prompt=consent`;
    res.redirect(googleAuthUrl);
  });

  app.get('/oauth2callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
      return res.redirect('/?error=google_auth_failed');
    }

    try {
      const redirectUri = googleOauthRedirectUri(req);
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code: code as string,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      const tokens = await tokenResponse.json();
      if (!tokens.access_token) throw new Error('Failed to get access token');

      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      const googleUser = await userResponse.json();
      if (!googleUser.email) throw new Error('Failed to get user email');

      let user = await storage.getUserByEmail(googleUser.email);
      let isNewGoogleUser = false;

      if (!user) {
        const userData = {
          name: googleUser.name || googleUser.email.split('@')[0],
          email: googleUser.email,
          password: '',
          primaryMobile: null,
          primaryMobileCountryCode: '+91',
          secondaryMobile: null,
          secondaryMobileCountryCode: '+91',
          emergencyMobile: null,
          emergencyMobileCountryCode: '+91',
        };
        user = await storage.createUser(userData);
        await storage.verifyUserEmail(user.id);
        isNewGoogleUser = true;
      }

      if (!isUserActive(user)) {
        const eligibility = await ensureUserCanAuthenticate(storage, user);
        if (!eligibility.ok) {
          return res.redirect('/?error=account_deactivated');
        }
        user = eligibility.user;
        if (eligibility.treatAsNewUser) {
          isNewGoogleUser = true;
        }
      }

      const token = generateToken(user.id);

      // SECURITY FIX 2: Set token as httpOnly cookie, NOT in URL.
      // Honour the "Keep me signed in" preference captured at sign-in start.
      const keepSignedIn = keepSignedInFromValue(req.cookies?.[OAUTH_KEEP_COOKIE_NAME]);
      res.clearCookie(OAUTH_KEEP_COOKIE_NAME);
      setAuthCookie(res, token, keepSignedIn);
      await storage.linkGuestBookingsToUser(user.id, user.email);
      res.redirect(`/my-account?loginSuccess=true${isNewGoogleUser ? "&newUser=true" : ""}`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect('/?error=google_auth_failed');
    }
  });

  setupGoogleAuth(app);

  // ============================================================
  // AUTH ROUTES — all rate limited
  // ============================================================
  app.post("/api/auth/register", authRateLimit, async (req, res) => {
    try {
      const validatedData = registerUserSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        if (isUserActive(existingUser)) {
          return res.status(400).json({ message: "User already exists with this email" });
        }
        const hasErasure = await storage.userHasErasureHistory(existingUser.id);
        if (!hasErasure) {
          return res.status(400).json({ message: "User already exists with this email" });
        }
        await storage.reopenAccountAfterSelfErasure(existingUser.id);
        const hashedPassword = await hashPassword(validatedData.password);
        const verificationToken = generateExpiringVerificationToken();
        const verificationTokenHash = hashActionToken(verificationToken);
        const { confirmPassword, ...userData } = validatedData;
        const updated = await storage.updateUser(existingUser.id, {
          ...userData,
          password: hashedPassword,
          emailVerified: false,
          emailVerificationToken: verificationTokenHash,
        } as any);
        if (!updated) {
          return res.status(500).json({ message: "Failed to register user" });
        }
        await storage.linkGuestBookingsToUser(updated.id, updated.email);

        const logoUrl = `https://${process.env.ALLOWED_ORIGIN || req.get('host')}/attached_assets/Logo%20Transperent%20TM_1756454893432.png`;
        const verificationUrl = `https://${process.env.ALLOWED_ORIGIN || req.get('host')}/api/auth/verify-email?token=${verificationToken}`;
        const emailHTML = createVerificationEmailHTML(updated.name, verificationUrl, logoUrl);

        const emailSent = await sendEmail({
          to: updated.email,
          subject: "Welcome back to andWeYoga - Verify Your Email",
          html: emailHTML,
        });

        if (!emailSent) {
          console.error('Failed to send verification email to:', updated.email);
        }

        return res.status(201).json({
          message: "Registration successful! Please check your email to verify your account.",
          user: {
            id: updated.id,
            email: updated.email,
            name: updated.name,
            emailVerified: updated.emailVerified,
          },
        });
      }

      const hashedPassword = await hashPassword(validatedData.password);

      // SECURITY FIX 5: Use expiring verification token
      const verificationToken = generateExpiringVerificationToken();
      const verificationTokenHash = hashActionToken(verificationToken);

      const { confirmPassword, ...userData } = validatedData;
      const user = await storage.createUser({ ...userData, password: hashedPassword });

      await storage.updateUser(user.id, { emailVerificationToken: verificationTokenHash } as any);
      await storage.linkGuestBookingsToUser(user.id, user.email);

      const logoUrl = `https://${process.env.ALLOWED_ORIGIN || req.get('host')}/attached_assets/Logo%20Transperent%20TM_1756454893432.png`;
      const verificationUrl = `https://${process.env.ALLOWED_ORIGIN || req.get('host')}/api/auth/verify-email?token=${verificationToken}`;
      const emailHTML = createVerificationEmailHTML(user.name, verificationUrl, logoUrl);

      const emailSent = await sendEmail({
        to: user.email,
        subject: "Welcome to andWeYoga - Verify Your Email",
        html: emailHTML
      });

      if (!emailSent) {
        console.error('Failed to send verification email to:', user.email);
      }

      res.status(201).json({
        message: "Registration successful! Please check your email to verify your account.",
        user: { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error('Registration error:', error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", authRateLimit, async (req, res) => {
    try {
      const validatedData = loginUserSchema.parse(req.body);

      let user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        // SECURITY FIX 6: Always return the same message regardless of
        // whether the email exists or the password is wrong.
        // This prevents email enumeration attacks.
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValidPassword = await verifyPassword(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (!user.emailVerified) {
        return res.status(401).json({ message: "Please verify your email before logging in" });
      }

      if (!isUserActive(user)) {
        const eligibility = await ensureUserCanAuthenticate(storage, user);
        if (!eligibility.ok) {
          return respondAccountDeactivated(res);
        }
        user = eligibility.user;
      }

      const token = generateToken(user.id);

      // SECURITY FIX 2: Set as httpOnly cookie
      setAuthCookie(res, token);

      await storage.linkGuestBookingsToUser(user.id, user.email);

      res.json({
        message: "Login successful",
        user: { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Logout — clear the auth cookie
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie('authToken');
    res.json({ message: "Logged out successfully" });
  });

  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      // SECURITY FIX 5: Check if token has expired
      if (isVerificationTokenExpired(token)) {
        return res.status(400).json({ message: "Verification link has expired. Please register again." });
      }

      const user = await storage.getUserByVerificationToken(hashActionToken(token));
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }

      await storage.verifyUserEmail(user.id);
      res.redirect(`/?verified=true`);
    } catch (error) {
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: any, res) => {
    try {
      let user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!isUserActive(user)) {
        const hasErasure = await storage.userHasErasureHistory(user.id);
        res.clearCookie("authToken");
        if (hasErasure) {
          return respondAccountClosed(res);
        }
        return respondAccountDeactivated(res);
      }
      const reconciled = await storage.recomputeProfileCompletionStatus(req.user!.id);
      user = reconciled ?? user;

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        primaryMobile: user.primaryMobile,
        primaryMobileCountryCode: user.primaryMobileCountryCode,
        secondaryMobile: user.secondaryMobile,
        secondaryMobileCountryCode: user.secondaryMobileCountryCode,
        emergencyMobile: user.emergencyMobile,
        emergencyMobileCountryCode: user.emergencyMobileCountryCode,
        healthUpdateText: user.healthUpdateText,
        healthDocumentUrls: user.healthDocumentUrls,
        healthMediaLinks: resolveHealthMediaLinks(user.healthMediaLinks, user.healthDocumentUrls),
        healthUpdateHistory: parseHealthHistory(user.healthUpdateHistory),
        dateOfBirth: user.dateOfBirth,
        profileCompletionStatus: user.profileCompletionStatus,
        healthUpdateLastModified: user.healthUpdateLastModified,
        whatsappConsent: user.whatsappConsent,
        whatsappConsentAt: user.whatsappConsentAt,
        addressStreet: user.addressStreet,
        addressLine2: user.addressLine2,
        addressCity: user.addressCity,
        addressCountry: user.addressCountry,
        addressState: user.addressState,
        addressPincode: user.addressPincode,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user profile" });
    }
  });

  app.put("/api/auth/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      const existing = await storage.getUser(req.user!.id);
      if (!existing) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!isUserActive(existing)) {
        return respondAccountDeactivated(res);
      }

      const validatedData = updateProfilePartialSchema.parse(req.body);

      if (validatedData.dateOfBirth) {
        const ageCheck = validateOnboardingDateOfBirth(validatedData.dateOfBirth);
        if (!ageCheck.ok) {
          return res.status(400).json({
            message:
              ageCheck.code === "underage"
                ? "You must be 18 or older to use andWeYoga."
                : "Please enter a valid date of birth.",
          });
        }
        if (existing.dateOfBirth && existing.dateOfBirth !== validatedData.dateOfBirth) {
          return res.status(400).json({ message: "Date of birth cannot be changed once set." });
        }
      }

      const patch: Record<string, unknown> = { ...validatedData };
      const grantingWhatsapp =
        validatedData.whatsappConsent === true && !existing.whatsappConsent;
      if (grantingWhatsapp) {
        patch.whatsappConsentAt = new Date();
        patch.whatsappConsentSource =
          validatedData.whatsappConsentSource ?? "profile_primary_mobile";
      }

      let updatedUser = await storage.updateUser(req.user!.id, patch);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (grantingWhatsapp) {
        const meta = requestMeta(req);
        await storage.insertConsentLog({
          userId: req.user!.id,
          consentType: "whatsapp_contact",
          action: "opt_in",
          consentVersion: consentVersion(),
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });
      }

      const withCompletion =
        (await storage.recomputeProfileCompletionStatus(req.user!.id)) ?? updatedUser;
      updatedUser = withCompletion;
      res.json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          emailVerified: updatedUser.emailVerified,
          primaryMobile: updatedUser.primaryMobile,
          primaryMobileCountryCode: updatedUser.primaryMobileCountryCode,
          secondaryMobile: updatedUser.secondaryMobile,
          secondaryMobileCountryCode: updatedUser.secondaryMobileCountryCode,
          emergencyMobile: updatedUser.emergencyMobile,
          emergencyMobileCountryCode: updatedUser.emergencyMobileCountryCode,
          healthUpdateText: updatedUser.healthUpdateText,
          healthDocumentUrls: updatedUser.healthDocumentUrls,
          healthMediaLinks: resolveHealthMediaLinks(
            updatedUser.healthMediaLinks,
            updatedUser.healthDocumentUrls,
          ),
          healthUpdateHistory: parseHealthHistory(updatedUser.healthUpdateHistory),
          dateOfBirth: updatedUser.dateOfBirth,
          profileCompletionStatus: updatedUser.profileCompletionStatus,
          healthUpdateLastModified: updatedUser.healthUpdateLastModified,
          whatsappConsent: updatedUser.whatsappConsent,
          whatsappConsentAt: updatedUser.whatsappConsentAt,
          addressStreet: updatedUser.addressStreet,
          addressLine2: updatedUser.addressLine2,
          addressCity: updatedUser.addressCity,
          addressCountry: updatedUser.addressCountry,
          addressState: updatedUser.addressState,
          addressPincode: updatedUser.addressPincode,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.patch("/api/users/:id/health-update", requireAuth, async (req: any, res) => {
    try {
      const userId = req.params.id;

      if (userId !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden: Cannot update another user\'s health data' });
      }

      const existing = await storage.getUser(userId);
      if (!existing) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (!isUserActive(existing)) {
        return respondAccountDeactivated(res);
      }

      if (existing.dateOfBirth) {
        if (!isAdult(existing.dateOfBirth)) {
          return res.status(403).json({
            error: "Health data cannot be collected for accounts that do not meet the age requirement.",
          });
        }
      }

      const hasHealthConsent = await storage.userHasActiveConsent(userId, "health_data");
      if (!hasHealthConsent) {
        try {
          parseHealthDataConsent(req.body);
        } catch {
          return res.status(400).json({
            error: "Health data consent is required before saving health information.",
            code: "health_consent_required",
          });
        }
      }

      const healthUpdateData = healthUpdateSchema.parse(req.body);
      const newText = healthUpdateData.healthUpdateText.trim();
      const existingText = (existing.healthUpdateText ?? "").trim();
      let healthUpdateHistory = parseHealthHistory(existing.healthUpdateHistory);

      const savedMediaLinks =
        healthUpdateData.healthMediaLinks !== undefined
          ? sanitizeHealthMediaLinksForSave(healthUpdateData.healthMediaLinks)
          : resolveHealthMediaLinks(existing.healthMediaLinks, existing.healthDocumentUrls);

      const savedDocumentUrls =
        healthUpdateData.healthDocumentUrls !== undefined
          ? [...new Set(
              healthUpdateData.healthDocumentUrls
                .map((url) => url.trim())
                .filter((url) => userOwnsHealthDocumentPath(url, userId)),
            )]
          : filterHealthObjectDocumentUrls(existing.healthDocumentUrls);

      if (existingText && existingText !== newText) {
        const archived: HealthHistoryEntry = {
          text: existing.healthUpdateText!,
          savedAt:
            existing.healthUpdateLastModified instanceof Date
              ? existing.healthUpdateLastModified.toISOString()
              : typeof existing.healthUpdateLastModified === "string"
                ? existing.healthUpdateLastModified
                : new Date().toISOString(),
          documentUrls: filterHealthObjectDocumentUrls(existing.healthDocumentUrls),
          mediaLinks: resolveHealthMediaLinks(existing.healthMediaLinks, existing.healthDocumentUrls),
        };
        healthUpdateHistory = [archived, ...healthUpdateHistory].slice(0, 5);
      }

      const mergedForStatus = {
        ...existing,
        healthUpdateText: healthUpdateData.healthUpdateText,
        healthDocumentUrls: savedDocumentUrls,
        healthMediaLinks: savedMediaLinks,
      };
      const profileCompletionStatus = computeProfileCompletionStatus(mergedForStatus);

      const updatedUser = await storage.updateUserHealthData(userId, {
        healthUpdateText: healthUpdateData.healthUpdateText,
        healthDocumentUrls: savedDocumentUrls,
        healthMediaLinks: savedMediaLinks,
        healthUpdateHistory,
        profileCompletionStatus,
        healthUpdateLastModified: new Date().toISOString()
      });

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (!hasHealthConsent) {
        const meta = requestMeta(req);
        await storage.insertConsentLog({
          userId,
          consentType: "health_data",
          action: "opt_in",
          consentVersion: consentVersion(),
          ...meta,
        });
      }

      res.json({
        message: 'Health update saved successfully',
        profileCompletionStatus: updatedUser.profileCompletionStatus
      });
    } catch (error) {
      console.error('Health update error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update health data' });
    }
  });

  app.post("/api/auth/google-signin", authRateLimit, async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ message: "Google token is required" });
      }

      const payload = await verifyGoogleToken(token);
      if (!payload || !payload.email) {
        return res.status(401).json({ message: "Invalid Google token" });
      }

      let user = await storage.getUserByEmail(payload.email);

      if (!user) {
        const userData = {
          email: payload.email,
          name: payload.name || '',
          password: '',
          primaryMobile: '',
          emergencyMobile: '',
          primaryMobileCountryCode: '+91',
          emergencyMobileCountryCode: '+91',
          secondaryMobile: null,
          secondaryMobileCountryCode: null,
        };
        user = await storage.createUser(userData);
        await storage.verifyUserEmail(user.id);
      }

      if (!isUserActive(user)) {
        return respondAccountDeactivated(res);
      }

      const authToken = generateToken(user.id);

      // SECURITY FIX 2: Cookie not URL
      setAuthCookie(res, authToken);

      await storage.linkGuestBookingsToUser(user.id, user.email);

      res.json({
        message: "Google sign-in successful",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          needsMobileInfo: !user.primaryMobile || !user.emergencyMobile
        }
      });
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      res.status(500).json({ message: error.message || "Google sign-in failed" });
    }
  });

  // ============================================================
  // CLASS TYPES
  // SECURITY FIX 3: Write operations now require admin auth.
  // Public read is fine. Creating/updating classes is admin only.
  // ============================================================
  app.get("/api/class-types", async (req, res) => {
    try {
      const classTypes = (await storage.getAllClassTypes()).filter(
        (ct) => !isQaFixtureClassTypeName(ct.name),
      );
      res.json(classTypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch class types" });
    }
  });

  app.get("/api/class-types/:id", async (req, res) => {
    try {
      const classType = await storage.getClassType(req.params.id);
      if (!classType || isQaFixtureClassTypeName(classType.name)) {
        return res.status(404).json({ message: "Class type not found" });
      }
      res.json(classType);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch class type" });
    }
  });

  app.get("/api/class-types-availability/upcoming", async (_req, res) => {
    try {
      setPublicCatalogNoStore(res);
      const publicTypeIds = new Set(
        (await storage.getAllClassTypes())
          .filter((ct) => !isQaFixtureClassTypeName(ct.name))
          .map((ct) => ct.id),
      );
      const ids = (await storage.getClassTypeIdsWithUpcomingSessions()).filter((id) =>
        publicTypeIds.has(id),
      );
      res.json({ classTypeIds: ids });
    } catch {
      res.status(500).json({ message: "Failed to fetch class type availability" });
    }
  });

  app.post("/api/class-types/:id/notify", optionalAuth, async (req: any, res) => {
    try {
      const classType = await storage.getClassType(req.params.id);
      if (!classType || isQaFixtureClassTypeName(classType.name)) {
        return res.status(404).json({ message: "Session type not found" });
      }
      const body = z
        .object({
          email: z.string().email().optional(),
          whatsapp: z.string().trim().optional(),
        })
        .parse(req.body ?? {});
      const user = req.user?.id ? await storage.getUser(req.user.id) : undefined;
      const email = (user?.email ?? body.email ?? "").trim().toLowerCase();
      if (!email) {
        return res.status(400).json({ message: "Email is required to join the waitlist." });
      }

      let whatsapp = user ? formatProfileWhatsapp(user) : null;
      if (!whatsapp && body.whatsapp) {
        const phoneCheck = validateRequiredGuestPhone(body.whatsapp);
        if (!phoneCheck.ok) {
          return res.status(400).json({ message: phoneCheck.message });
        }
        whatsapp = `+91 ${phoneCheck.normalized}`;
      }
      if (!whatsapp) {
        return res.status(400).json({
          message: "WhatsApp number is required so we can keep you posted.",
        });
      }

      const request = await storage.createNotifyRequest({
        classTypeId: classType.id,
        userId: user?.id ?? null,
        email,
        whatsapp,
        source: user ? WAITLIST_SOURCE_REGULAR : WAITLIST_SOURCE_GUEST,
      });
      res.status(201).json({
        id: request.id,
        message: "Thanks! You're on the waitlist — we'll keep you posted when sessions open.",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save waitlist request" });
    }
  });

  // SECURITY FIX 3: requireAdminAuth added
  app.post("/api/class-types", requireAdminAuth, async (req, res) => {
    try {
      const validatedData = adminCreateClassTypeSchema.parse(req.body);
      const classType = await storage.createClassType(validatedData);
      res.status(201).json(classType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: formatZodErrorsForDisplay(error.errors)[0] || "Invalid input",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to create class type" });
    }
  });

  app.patch("/api/class-types/:id", requireAdminAuth, async (req, res) => {
    try {
      const updates = adminCreateClassTypeSchema.partial().parse(req.body);
      const existing = await storage.getClassType(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Class type not found" });
      }
      const updated = await storage.updateClassType(req.params.id, updates);
      if (!updated) {
        return res.status(500).json({ message: "Failed to update class type" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: formatZodErrorsForDisplay(error.errors)[0] || "Invalid input",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to update class type" });
    }
  });

  // SECURITY (BUG-03 / SEC-01): requireSuperAdminAuth — only super_admin may
  // suspend, blacklist, or re-activate instructors. Regular admins get 403.
  app.patch(
    "/api/admin/instructors/:id/status",
    requireSuperAdminAuth,
    async (req: AdminAuthRequest, res) => {
      try {
        const bodySchema = adminUpdateInstructorStatusSchema.extend({
          statusNotes: z.string().trim().max(500).nullable().optional(),
        });
        const { status, statusNotes } = bodySchema.parse(req.body);

        const existing = await storage.getInstructor(req.params.id);
        if (!existing) {
          return res.status(404).json({ message: "Instructor not found" });
        }

        const prevYcb = existing.ycbLicenseStatus;
        const prevYogaAlliance = existing.yogaAllianceLicenseStatus;

        if (status === "suspended") {
          await storage.updateInstructor(req.params.id, {
            ycbLicenseStatus: "suspended_by_awy",
            yogaAllianceLicenseStatus: "suspended_by_awy",
          });
        } else if (status === "blacklisted") {
          await storage.updateInstructor(req.params.id, {
            ycbLicenseStatus: "blacklisted_by_awy",
            yogaAllianceLicenseStatus: "blacklisted_by_awy",
          });
        } else if (status === "expired") {
          await storage.updateInstructor(req.params.id, {
            ycbLicenseStatus: "expired",
            yogaAllianceLicenseStatus: "expired",
          });
        } else if (status === "active") {
          // BUG-04 FIX: restore to pending not verified on reactivation
          const restoredYcb = prevYcb === "verified" ? "verified" : "pending";
          const restoredYogaAlliance =
            prevYogaAlliance === "verified" ? "verified" : "pending";
          await storage.updateInstructor(req.params.id, {
            ycbLicenseStatus: restoredYcb,
            yogaAllianceLicenseStatus: restoredYogaAlliance,
          });
        }

        // SEC-02 FIX: Write audit log for every instructor status change.
        await storage.insertAuditLog({
          userId: req.admin?.id ?? null,
          action: `instructor_status_changed_to_${status}`,
          resourceType: "instructor",
          resourceId: req.params.id,
          metadata: JSON.stringify({
            previousStatus: existing.status,
            newStatus: status,
            adminProvidedNotes: statusNotes ?? null,
            prevYcbLicenseStatus: prevYcb,
            prevYogaAllianceLicenseStatus: prevYogaAlliance,
            performedByEmail: req.admin?.email,
          }),
          ipAddress: req.ip ?? null,
          userAgent: req.get("user-agent") ?? null,
        });

        const reconciled = await storage.reconcileInstructorStatus(req.params.id);
        if (!reconciled) {
          return res.status(500).json({ message: "Failed to update instructor status" });
        }

        if (statusNotes && statusNotes.trim().length > 0) {
          await storage.updateInstructorStatus(
            req.params.id,
            reconciled.status,
            statusNotes.trim(),
          );
        }

        const final = await storage.getInstructor(req.params.id);
        res.json(final ?? reconciled);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: formatZodErrorsForDisplay(error.errors)[0] || "Invalid input",
            errors: error.errors,
          });
        }
        res.status(500).json({ message: "Failed to update instructor status" });
      }
    },
  );
  app.delete("/api/class-types/:id", requireSuperAdminAuth, async (_req, res) => {
    res.status(400).json({
      message:
        "Use POST /api/admin/class-types/:id/retire with a reason and owner OTP to remove a session type.",
    });
  });

  app.post("/api/admin/class-types/:id/retire", requireAdminAuth, async (req: AdminAuthRequest, res) => {
    try {
      const classType = await storage.getClassType(req.params.id);
      if (!classType) {
        return res.status(404).json({ message: "Session type not found" });
      }

      const isQaFixture = isQaFixtureClassTypeName(classType.name);
      if (!isQaFixture && req.admin?.role !== "super_admin") {
        return res.status(403).json({
          message: "Only super admins can remove production session types.",
        });
      }

      const body = z
        .object({
          reason: z.string().min(3, "Retirement reason is required"),
          ownerOtp: z.string().optional(),
        })
        .parse(req.body);

      if (!isQaFixture) {
        const ownerOtp = body.ownerOtp?.trim() ?? "";
        if (!ownerOtp) {
          return res.status(400).json({ message: "Owner OTP is required." });
        }
        const otp = validateOwnerCancelOtp(ownerOtp);
        if (!otp.ok) {
          return res.status(400).json({ message: otp.message });
        }
      }

      const result = await storage.retireClassTypeWithSessionCancellation(req.params.id, body.reason);
      if (!result.ok) {
        return res.status(400).json({ message: result.message || "Could not retire session type" });
      }

      const allRecipients = (result.noticePayloads ?? []).flatMap((p) => p.recipients);
      const notifySummary = await notifySessionCancellation(allRecipients, {
        kind: "session_type",
        reason: body.reason,
        classTypeName: result.classTypeName ?? "Session type",
      });

      await storage.insertAuditLog({
        userId: req.admin?.id ?? null,
        action: "session_type_retired",
        resourceType: "class_type",
        resourceId: req.params.id,
        metadata: JSON.stringify({
          reason: body.reason,
          sessionsCancelled: result.sessionsCancelled,
          hardDeleted: result.hardDeleted,
          performedByEmail: req.admin?.email,
        }),
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
      });

      res.json({
        message: result.message,
        sessionsCancelled: result.sessionsCancelled,
        hardDeleted: result.hardDeleted,
        notifications: notifySummary,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: formatZodErrorsForDisplay(error.errors)[0] || "Invalid input",
        });
      }
      res.status(500).json({ message: "Failed to retire session type" });
    }
  });

  // ============================================================
  // CAROUSEL PROMOTIONS (super admin only)
  // Curate which sessions fill the home "Available Today" carousel,
  // their placement, and the live window (start/end date + time).
  // ============================================================
  async function summarizeCarouselPromotion(promotion: Awaited<ReturnType<typeof storage.getCarouselPromotion>>) {
    if (!promotion) return null;
    const cls = await storage.getClass(promotion.classId);
    const classType = cls ? await storage.getClassType(cls.classTypeId) : undefined;
    const instructor = cls ? await storage.getInstructor(cls.instructorId) : undefined;
    return {
      ...promotion,
      session: cls
        ? {
            id: cls.id,
            date: cls.date,
            className: classType?.name ?? "Unknown session",
            instructorName: instructor?.name ?? "Unknown instructor",
          }
        : null,
    };
  }

  app.get("/api/admin/platform-settings", requireSuperAdminAuth, async (_req, res) => {
    try {
      const rows = await listPlatformSettings();
      res.json(rows);
    } catch {
      res.status(500).json({ message: "Failed to load platform settings" });
    }
  });

  app.patch("/api/admin/platform-settings", requireSuperAdminAuth, async (req: AdminAuthRequest, res) => {
    try {
      const bodySchema = z.object({
        key: z.enum([GUEST_CHECKOUT_SETTING_KEY, MAINTENANCE_WINDOW_SETTING_KEY]),
        enabled: z.boolean(),
      });
      const { key, enabled } = bodySchema.parse(req.body);
      if (!req.admin?.id) {
        return res.status(401).json({ message: "Admin authentication required" });
      }
      const value = await setPlatformSettingByKey(key, enabled, req.admin.id, {
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
      });
      if (key === GUEST_CHECKOUT_SETTING_KEY) {
        return res.json({ key, guestCheckoutEnabled: value });
      }
      return res.json({ key, maintenanceWindowEnabled: value });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "key and enabled are required (enabled must be a boolean)",
          errors: error.errors,
        });
      }
      if (error instanceof Error && error.message.startsWith("Unknown platform setting")) {
        return res.status(400).json({ message: error.message });
      }
      console.error("[platform-settings] PATCH failed:", error);
      res.status(500).json({ message: "Failed to update platform setting" });
    }
  });

  app.patch("/api/admin/platform-settings/guest-checkout", requireSuperAdminAuth, async (req: AdminAuthRequest, res) => {
    try {
      const bodySchema = z.object({ enabled: z.boolean() });
      const { enabled } = bodySchema.parse(req.body);
      if (!req.admin?.id) {
        return res.status(401).json({ message: "Admin authentication required" });
      }
      const guestCheckoutEnabled = await setGuestCheckoutEnabled(enabled, req.admin.id, {
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
      });
      res.json({ guestCheckoutEnabled });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "enabled must be a boolean",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to update guest checkout setting" });
    }
  });

  app.patch("/api/admin/platform-settings/maintenance-window", requireSuperAdminAuth, async (req: AdminAuthRequest, res) => {
    try {
      const bodySchema = z.object({ enabled: z.boolean() });
      const { enabled } = bodySchema.parse(req.body);
      if (!req.admin?.id) {
        return res.status(401).json({ message: "Admin authentication required" });
      }
      const maintenanceWindowEnabled = await setMaintenanceWindowEnabled(enabled, req.admin.id, {
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
      });
      res.json({ maintenanceWindowEnabled });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "enabled must be a boolean",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to update maintenance window setting" });
    }
  });

  app.get("/api/admin/carousel-promotions", requireSuperAdminAuth, async (_req, res) => {
    try {
      const promotions = await storage.getCarouselPromotions();
      const out = await Promise.all(promotions.map((p) => summarizeCarouselPromotion(p)));
      res.json(out);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch carousel promotions" });
    }
  });

  app.post("/api/admin/carousel-promotions", requireSuperAdminAuth, async (req, res) => {
    try {
      const data = insertCarouselPromotionSchema.parse(req.body);
      const cls = await storage.getClass(data.classId);
      if (!cls) {
        return res.status(400).json({ message: "Selected session no longer exists" });
      }
      const created = await storage.createCarouselPromotion(data);
      const summary = await summarizeCarouselPromotion(created);
      res.status(201).json(summary);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: formatZodErrorsForDisplay(error.errors)[0] || "Invalid input",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to create carousel promotion" });
    }
  });

  app.patch("/api/admin/carousel-promotions/:id", requireSuperAdminAuth, async (req, res) => {
    try {
      const updates = updateCarouselPromotionSchema.parse(req.body);
      const existing = await storage.getCarouselPromotion(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Promotion not found" });
      }
      if (updates.classId) {
        const cls = await storage.getClass(updates.classId);
        if (!cls) {
          return res.status(400).json({ message: "Selected session no longer exists" });
        }
      }
      const updated = await storage.updateCarouselPromotion(req.params.id, updates);
      const summary = await summarizeCarouselPromotion(updated);
      res.json(summary);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: formatZodErrorsForDisplay(error.errors)[0] || "Invalid input",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to update carousel promotion" });
    }
  });

  app.delete("/api/admin/carousel-promotions/:id", requireSuperAdminAuth, async (req, res) => {
    try {
      const result = await storage.deleteCarouselPromotion(req.params.id);
      if (!result.ok) {
        return res.status(400).json({ message: result.message || "Cannot delete promotion" });
      }
      res.json({ message: "Promotion deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete carousel promotion" });
    }
  });

  // ============================================================
  // INSTRUCTORS
  // ============================================================
  app.get("/api/instructors", async (_req, res) => {
    try {
      const instructors = (await storage.getPublicInstructors()).filter(
        (instructor) => !isQaFixtureInstructorName(instructor.name),
      );
      res.json(instructors.map(toPublicInstructorProfile));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch instructors" });
    }
  });

  app.get("/api/instructors/:id", async (req, res) => {
    try {
      const instructor = await storage.getInstructor(req.params.id);
      if (!instructor) {
        return res.status(404).json({ message: "Instructor not found" });
      }
      if (
        !isInstructorPublicVisible(instructor) ||
        isQaFixtureInstructorName(instructor.name)
      ) {
        return res.status(404).json({ message: "Instructor not found" });
      }
      res.json(toPublicInstructorProfile(instructor));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch instructor" });
    }
  });

  app.get("/api/admin/instructors", requireAdminAuth, async (req, res) => {
    try {
      const { page, pageSize } = paginationQuerySchema.parse(req.query);
      const { rows, total } = await storage.getAllInstructorsPaginated(page, pageSize);
      res.json(buildPaginatedResponse(rows, total, page, pageSize));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch instructors" });
    }
  });

  app.get("/api/admin/instructors/eligible", requireAdminAuth, async (_req, res) => {
    try {
      const instructors = await storage.getSessionEligibleInstructors();
      res.json(instructors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch instructors" });
    }
  });

  app.post("/api/instructors", requireAdminAuth, async (req, res) => {
    try {
      const validatedData = adminCreateInstructorSchema.parse(req.body);
      const instructor = await storage.createInstructor({
        ...validatedData,
        status: "pending",
        emailVerified: false,
        phoneVerified: false,
      });
      const reconciled = await storage.reconcileInstructorStatus(instructor.id);
      res.status(201).json(reconciled ?? instructor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: formatZodErrorsForDisplay(error.errors)[0] || "Invalid input",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to create instructor" });
    }
  });

  app.patch("/api/admin/instructors/:id", requireAdminAuth, async (req, res) => {
    try {
      const validatedData = adminUpdateInstructorSchema.parse(req.body);
      const existing = await storage.getInstructor(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Instructor not found" });
      }

      const nextEmail = validatedData.email.trim().toLowerCase();
      const prevEmail = existing.email?.trim().toLowerCase() ?? "";
      const emailChanged = nextEmail !== prevEmail;

      const updated = await storage.updateInstructor(req.params.id, {
        ...validatedData,
        ...(emailChanged
          ? {
              emailVerified: false,
              verificationMethod: "pending",
              emailOtpHash: null,
              emailOtpExpiresAt: null,
              emailVerificationToken: null,
            }
          : {}),
      });
      if (!updated) {
        return res.status(500).json({ message: "Failed to update instructor" });
      }
      const reconciled = await storage.reconcileInstructorStatus(req.params.id);
      res.json(reconciled ?? updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: formatZodErrorsForDisplay(error.errors)[0] || "Invalid input",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to update instructor" });
    }
  });

  async function dispatchInstructorEmailOtp(
    instructorId: string,
    hostHeader?: string | null,
  ): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
    const instructor = await storage.getInstructor(instructorId);
    if (!instructor) {
      return { ok: false, status: 404, message: "Instructor not found" };
    }
    const { otp, hash, expiresAt, linkToken } = await createInstructorOtpPayload();
    const saved = await storage.setInstructorEmailOtp(instructorId, hash, expiresAt, linkToken);
    if (!saved) {
      return { ok: false, status: 500, message: "Could not save verification code" };
    }
    const verifyUrl = buildInstructorVerifyEmailUrl(
      linkToken,
      resolvePublicAppBaseUrl(hostHeader),
    );
    const sent = await deliverInstructorEmailOtp(instructor, otp, { verifyUrl });
    if (!sent.ok) {
      return {
        ok: false,
        status: sent.error?.includes("not configured") ? 503 : 500,
        message: sent.error ?? "Failed to send verification email.",
      };
    }
    return { ok: true };
  }

  app.get("/api/instructors/verify-email", async (req, res) => {
    try {
      const token = typeof req.query.token === "string" ? req.query.token.trim() : "";
      if (!token) {
        return res.status(400).send("Invalid verification link.");
      }

      const instructor = await storage.getInstructorByEmailVerificationToken(token);
      if (!instructor) {
        return res.status(400).send("Invalid or expired verification link.");
      }

      if (instructor.emailVerified) {
        return res
          .status(200)
          .send(createInstructorEmailVerifiedHTML(instructor.name));
      }

      if (
        !instructor.emailOtpExpiresAt ||
        instructor.emailOtpExpiresAt.getTime() < Date.now()
      ) {
        return res.status(400).send("Verification link has expired. Ask your admin to resend.");
      }

      const method =
        instructor.verificationMethod === "admin-override"
          ? "admin-override"
          : "otp-verified";
      const updated = await storage.markInstructorEmailVerified(instructor.id, method);
      if (!updated) {
        return res.status(500).send("Could not verify email. Please try again.");
      }

      return res.status(200).send(createInstructorEmailVerifiedHTML(updated.name));
    } catch (err) {
      console.error("[instructor-verify-email-link]", err);
      res.status(500).send("Failed to verify email.");
    }
  });

  app.post(
    "/api/admin/instructors/:id/send-email-otp",
    requireAdminAuth,
    async (req, res) => {
      try {
        const result = await dispatchInstructorEmailOtp(req.params.id, req.get("host"));
        if (!result.ok) {
          return res.status(result.status).json({ message: result.message });
        }
        res.json({ message: "Verification code sent to instructor email" });
      } catch (err) {
        console.error("[send-email-otp]", err);
        res.status(500).json({ message: "Failed to send verification email" });
      }
    },
  );

  app.post(
    "/api/admin/instructors/:id/verify-email/manual",
    requireSuperAdminAuth,
    async (req: AdminAuthRequest, res) => {
      try {
        const instructor = await storage.getInstructor(req.params.id);
        if (!instructor) {
          return res.status(404).json({ message: "Instructor not found" });
        }

        if (!instructor.emailVerified) {
          const updated = await storage.markInstructorEmailVerified(
            req.params.id,
            "admin-override",
            { clearOtp: false },
          );
          if (!updated) {
            return res.status(500).json({ message: "Failed to verify email manually" });
          }

          await storage.insertAuditLog({
            userId: req.admin?.id ?? null,
            action: "instructor_email_verified_admin_override",
            resourceType: "instructor",
            resourceId: req.params.id,
            metadata: JSON.stringify({
              method: "admin-override",
              instructorId: req.params.id,
              adminId: req.admin?.id ?? null,
              adminEmail: req.admin?.email ?? null,
              timestamp: new Date().toISOString(),
            }),
            ipAddress: req.ip ?? null,
            userAgent: req.get("user-agent") ?? null,
          });
        }

        // Complete onboarding: manual verify and onboard includes phone verification.
        const afterEmail = await storage.getInstructor(req.params.id);
        if (afterEmail?.phone?.trim() && !afterEmail.phoneVerified) {
          await storage.markInstructorPhoneVerified(req.params.id);
        }

        const reconciled = await storage.reconcileInstructorStatus(req.params.id);
        const otpResult = await dispatchInstructorEmailOtp(req.params.id, req.get("host"));

        res.json({
          ...(reconciled ?? afterEmail ?? instructor),
          otpEmailSent: otpResult.ok,
          otpWarning: otpResult.ok ? null : otpResult.message,
        });
      } catch (err) {
        console.error("[verify-email-manual]", err);
        res.status(500).json({ message: "Failed to verify email manually" });
      }
    },
  );

  app.post(
    "/api/admin/instructors/:id/verify-email-otp",
    requireAdminAuth,
    async (req: AdminAuthRequest, res) => {
      try {
        const { otp } = adminInstructorEmailOtpSchema.parse(req.body);
        const instructor = await storage.getInstructor(req.params.id);
        if (!instructor) {
          return res.status(404).json({ message: "Instructor not found" });
        }

        if (instructor.emailVerified) {
          const current = await storage.getInstructor(req.params.id);
          return res.json(current ?? instructor);
        }

        if (
          !instructor.emailOtpExpiresAt ||
          instructor.emailOtpExpiresAt.getTime() < Date.now()
        ) {
          return res.status(400).json({ message: "Verification code expired. Send a new code." });
        }
        const valid = await verifyInstructorOtpHash(otp, instructor.emailOtpHash);
        if (!valid) {
          return res.status(400).json({ message: "Invalid verification code" });
        }

        const method =
          instructor.verificationMethod === "admin-override"
            ? "admin-override"
            : "otp-verified";
        const updated = await storage.markInstructorEmailVerified(req.params.id, method);

        await storage.insertAuditLog({
          userId: req.admin?.id ?? null,
          action: "instructor_email_verified_otp",
          resourceType: "instructor",
          resourceId: req.params.id,
          metadata: JSON.stringify({
            method: "otp-verified",
            instructorId: req.params.id,
            adminId: req.admin?.id ?? null,
            adminEmail: req.admin?.email ?? null,
            timestamp: new Date().toISOString(),
          }),
          ipAddress: req.ip ?? null,
          userAgent: req.get("user-agent") ?? null,
        });

        res.json(updated ?? { message: "Verified" });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: formatZodErrorsForDisplay(error.errors)[0] || "Invalid input",
            errors: error.errors,
          });
        }
        res.status(500).json({ message: "Failed to verify email" });
      }
    },
  );

  app.post(
    "/api/admin/instructors/:id/verify-phone",
    requireAdminAuth,
    async (_req, res) => {
      res.status(501).json({
        message:
          "SMS verification will be available once the SMS gateway is integrated. Use manual verification for now.",
        smsGatewayReady: false,
      });
    },
  );

  app.post(
    "/api/admin/instructors/:id/verify-phone/manual",
    requireAdminAuth,
    async (req, res) => {
      try {
        const instructor = await storage.getInstructor(req.params.id);
        if (!instructor) {
          return res.status(404).json({ message: "Instructor not found" });
        }
        const updated = await storage.markInstructorPhoneVerified(req.params.id);
        res.json(updated);
      } catch {
        res.status(500).json({ message: "Failed to verify phone" });
      }
    },
  );

  // ============================================================
  // CLASSES
  // ============================================================
  /** Member booking + schedule: published session with active (session-pool) instructor. */
  async function enrichPublicClassForBooking(
    cls: Awaited<ReturnType<typeof storage.getClass>>,
    req?: Pick<Request, "get">,
  ) {
    if (!cls || !isClassVisibleForBooking(cls)) return null;
    const classType = await storage.getClassType(cls.classTypeId);
    const instructor = await storage.getInstructor(cls.instructorId);
    if (
      !classType ||
      !instructor ||
      !isInstructorSessionPoolEligible(instructor) ||
      !isSessionAllowedInPublicCatalog(classType, instructor, req)
    ) {
      return null;
    }
    return sanitizePublicClass(cls, {
      classType,
      instructor: toPublicInstructorProfile(instructor) as typeof instructor,
    });
  }

  /** Marketing instructor list — full onboarding + active only. */
  async function enrichPublicClassIfVisible(cls: Awaited<ReturnType<typeof storage.getClass>>) {
    if (!cls || !isClassVisibleForBooking(cls)) return null;
    const classType = await storage.getClassType(cls.classTypeId);
    const instructor = await storage.getInstructor(cls.instructorId);
    if (
      !classType ||
      !instructor ||
      !isInstructorPublicVisible(instructor) ||
      !isSessionAllowedInPublicCatalog(classType, instructor)
    ) {
      return null;
    }
    return sanitizePublicClass(cls, {
      classType,
      instructor: toPublicInstructorProfile(instructor) as typeof instructor,
    });
  }

  app.get("/api/classes", async (req, res) => {
    try {
      setPublicCatalogNoStore(res);
      const { date } = req.query;

      if (date && typeof date === 'string') {
        const filterDate = new Date(date);
        if (isNaN(filterDate.getTime())) {
          return res.status(400).json({ message: "Invalid date format" });
        }
        const classes = await storage.getBookableClassesByDate(filterDate);
        const enrichedClasses = (
          await Promise.all(classes.map((cls) => enrichPublicClassForBooking(cls)))
        ).filter(Boolean);
        res.json(enrichedClasses);
      } else {
        const classes = await storage.getPublishedClasses();
        const enrichedClasses = (
          await Promise.all(classes.map((cls) => enrichPublicClassForBooking(cls)))
        ).filter(Boolean);
        res.json(enrichedClasses);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  app.get("/api/classes/:id", async (req, res) => {
    try {
      setPublicCatalogNoStore(res);
      const cls = await storage.getClass(req.params.id);
      if (!cls) {
        return res.status(404).json({ message: "Class not found" });
      }
      const enriched = await enrichPublicClassForBooking(cls, req);
      if (!enriched) {
        return res.status(404).json({ message: "Class not found" });
      }
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch class" });
    }
  });

  app.get("/api/flexi/options/:anchorClassId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const cls = await storage.getClass(req.params.anchorClassId);
      if (!cls || !isFlexiEnabledSchedule(cls)) {
        return res.status(404).json({ message: "Flexi options not available for this schedule." });
      }
      const options = await storage.getFlexiOptions(req.params.anchorClassId);
      if (!options) {
        return res.status(404).json({ message: "Flexi options not available for this schedule." });
      }
      res.json({
        ...options,
        tooltip: flexiTooltipCopy(),
        terms: defaultFlexiTermsItems(),
      });
    } catch {
      res.status(500).json({ message: "Failed to fetch Flexi options" });
    }
  });

  // ─── Payment QR codes (admin) ─────────────────────────────────────────────
  app.get("/api/admin/payment-qr-codes", requireAdminAuth, async (_req, res) => {
    try {
      const codes = await storage.getAllPaymentQrCodes();
      res.json(codes);
    } catch {
      res.status(500).json({ message: "Failed to fetch payment QR codes" });
    }
  });

  app.post("/api/admin/payment-qr-codes", requireAdminAuth, async (req, res) => {
    try {
      const data = adminPaymentQrCodeSchema.parse(req.body);
      const created = await storage.createPaymentQrCode(data);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: formatZodErrorsForDisplay(error.errors)[0] || "Invalid input",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to create payment QR code" });
    }
  });

  app.patch("/api/admin/payment-qr-codes/:id", requireAdminAuth, async (req, res) => {
    try {
      const existing = await storage.getPaymentQrCode(req.params.id);
      if (!existing) return res.status(404).json({ message: "QR code not found" });
      const data = adminPaymentQrCodeSchema.parse(req.body);
      const updated = await storage.updatePaymentQrCode(req.params.id, data);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: formatZodErrorsForDisplay(error.errors)[0] || "Invalid input",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to update payment QR code" });
    }
  });

  app.delete("/api/admin/payment-qr-codes/:id", requireAdminAuth, async (req, res) => {
    try {
      const result = await storage.deletePaymentQrCode(req.params.id);
      if (!result.ok) {
        return res.status(400).json({ message: result.message || "Cannot delete QR code" });
      }
      res.json({ message: "QR code deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete payment QR code" });
    }
  });

  // SECURITY FIX 3: requireAdminAuth added
  app.post("/api/classes", requireAdminAuth, async (req, res) => {
    try {
      const validatedData = adminCreateClassSessionSchema.parse(req.body);
      const adminProfile = await storage.getAdminProfile((req as any).admin.id);
      if (!adminProfile || !/^\d{10}$/.test(adminProfile.phone)) {
        return res.status(400).json({
          message:
            "Admin profile with a valid 10-digit phone is required before creating sessions.",
          code: "admin_profile_required",
        });
      }
      if (!adminProfile.governmentIdImageUrl) {
        return res.status(400).json({
          message: "Upload and save a government ID image in Admin Profile first.",
          code: "admin_profile_required",
        });
      }
      const instructor = await storage.getInstructor(validatedData.instructorId);
      if (!instructor) {
        return res.status(400).json({ message: "Selected instructor was not found" });
      }
      if (!isInstructorSessionPoolEligible(instructor)) {
        return res.status(400).json({
          message:
            instructor.status !== "active"
              ? "Only active instructors can be assigned to sessions."
              : "This instructor has a blocked license status and cannot take sessions.",
        });
      }
      const seriesId =
        validatedData.recurrenceKind === "weekly" ? crypto.randomUUID() : null;
      const occurrenceDates = expandSessionOccurrences({
        startAt: validatedData.date,
        recurrenceKind: validatedData.recurrenceKind,
        occurrenceCount: validatedData.occurrenceCount,
        recurrenceWeekdays: validatedData.recurrenceWeekdays,
      });

      const created = [];
      for (const date of occurrenceDates) {
        const cls = await storage.createClass({
          classTypeId: validatedData.classTypeId,
          instructorId: validatedData.instructorId,
          date,
          maxCapacity: validatedData.maxCapacity,
          googleMeetLink: validatedData.googleMeetLink,
          deliveryMode: validatedData.deliveryMode,
          sessionFrequency: validatedData.sessionFrequency,
          venueAddress: validatedData.venueAddress,
          venueMapLink: validatedData.venueMapLink,
          venueContactPhone: validatedData.venueContactPhone,
          paymentMethod: validatedData.paymentMethod,
          razorpayLink: validatedData.razorpayLink,
          paymentQrCodeId: validatedData.paymentQrCodeId,
          qrContactPhone: validatedData.qrContactPhone,
          qrContactEmail: validatedData.qrContactEmail,
          status: validatedData.status,
          publishedAt: validatedData.publishedAt,
          scheduleSource: "manual",
          recurrenceKind: validatedData.recurrenceKind,
          recurrenceWeekdays:
            validatedData.recurrenceKind === "weekly"
              ? serializeRecurrenceWeekdays(validatedData.recurrenceWeekdays)
              : null,
          seriesWeekCount:
            validatedData.recurrenceKind === "weekly" ? validatedData.occurrenceCount : null,
          flexiEnabled:
            validatedData.recurrenceKind === "weekly" ? validatedData.flexiEnabled : false,
          flexiSelectionCount:
            validatedData.recurrenceKind === "weekly" ? validatedData.flexiSelectionCount : null,
          seriesId,
        });
        created.push(cls);
      }

      let notifySummary: { queued: number; sent: number; failed: number } | null = null;
      if (created.length > 0) {
        const notifyList = await storage.getActiveNotifyRequestsByClassTypeId(validatedData.classTypeId);
        if (notifyList.length > 0) {
          const classType = await storage.getClassType(validatedData.classTypeId);
          const first = created[0];
          const bookingLink = `${process.env.ALLOWED_ORIGIN || "http://localhost:5000"}/?openBooking=true&sessionId=${first.id}`;
          const sendResults = await Promise.all(
            notifyList.map(async (row) => {
              const result = await sendEmailDetailed({
                to: row.email,
                subject: `New ${classType?.name ?? "session"} now open for booking`,
                html: `<p>Hi there,</p>
<p>A new <strong>${classType?.name ?? "session"}</strong> is available now.</p>
<p><a href="${bookingLink}">Book this session</a></p>
<p>If you don't have an account yet, please sign up before booking recurring sessions.</p>`,
              });
              await storage.updateNotifyRequestEmailStatus(row.id, result.ok ? "sent" : "failed", {
                error: result.ok ? null : result.error,
                sentAt: result.ok ? new Date() : null,
              });
              return result.ok;
            }),
          );
          const sent = sendResults.filter(Boolean).length;
          notifySummary = {
            queued: notifyList.length,
            sent,
            failed: notifyList.length - sent,
          };
        } else {
          notifySummary = { queued: 0, sent: 0, failed: 0 };
        }
      }

      res.status(201).json(
        created.length === 1
          ? { session: created[0], sessions: created, seriesId, notifySummary }
          : {
              sessions: created,
              seriesId,
              message: `${created.length} sessions scheduled`,
              notifySummary,
            },
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: formatZodErrorsForDisplay(error.errors)[0] || "Invalid input",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to create class" });
    }
  });

  // Member: mood check-in (pre/post session)
  app.post("/api/sessions/:classId/mood", requireAuth, async (req: AuthRequest, res) => {
    try {
      const phase = z.enum(["pre", "post"]).parse(req.body.phase);
      const moodId = z.string().parse(req.body.moodId);
      if (!MOOD_OPTIONS.some((m) => m.id === moodId)) {
        return res.status(400).json({ message: "Invalid mood selection" });
      }
      await storage.recordMoodCheckin(req.user!.id, req.params.classId, phase, moodId);
      res.status(201).json({ message: "Mood recorded", phase, moodId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "phase and moodId are required" });
      }
      res.status(500).json({ message: "Failed to record mood" });
    }
  });

  // Member: shadow attendance when opening Meet link (not Google Meet API)
  app.post("/api/sessions/:classId/join", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.recordSessionJoin(req.user!.id, req.params.classId);
      res.json({ message: "Join recorded" });
    } catch (error) {
      res.status(500).json({ message: "Failed to record join" });
    }
  });

  // Weekly schedule (public read)
  app.get("/api/schedule/week", async (req, res) => {
    try {
      setPublicCatalogNoStore(res);
      const today = new Date();
      const startDay = new Date(today);
      startDay.setHours(0, 0, 0, 0);

      const weekSchedule = [];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      for (let i = 0; i < 7; i++) {
        const currentDay = new Date(startDay);
        currentDay.setDate(startDay.getDate() + i);

        const dayClasses = await storage.getBookableClassesByDate(currentDay);
        const enrichedClasses = (
          await Promise.all(dayClasses.map((cls) => enrichPublicClassForBooking(cls)))
        ).filter((cls): cls is NonNullable<typeof cls> => cls != null);

        const now = Date.now();
        const upcomingClasses = enrichedClasses
          .filter((cls) => {
            const durationMinutes =
              typeof cls.classType?.duration === "number" && cls.classType.duration > 0
                ? cls.classType.duration
                : 60;
            return cls.date.getTime() + durationMinutes * 60_000 > now;
          })
          .sort((a, b) => a.date.getTime() - b.date.getTime());

        if (upcomingClasses.length > 0) {
          weekSchedule.push({
            day: dayNames[currentDay.getDay()],
            date: currentDay,
            classes: upcomingClasses,
          });
        }
      }

      res.json(weekSchedule);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weekly schedule" });
    }
  });

  // Public: live super-admin carousel promotions for the "Available Today" rotation.
  // Returns enriched, bookable sessions ordered by their configured placement.
  // When empty, the client falls back to the regular today's-sessions carousel.
  app.get("/api/carousel/promotions", async (_req, res) => {
    try {
      setPublicCatalogNoStore(res);
      const promotions = await storage.getActiveCarouselPromotions();
      const out: Array<{ promotionId: string; position: number; session: unknown }> = [];
      for (const promotion of promotions) {
        const cls = await storage.getClass(promotion.classId);
        const session = await enrichPublicClassForBooking(cls);
        if (session) {
          out.push({
            promotionId: promotion.id,
            position: promotion.position,
            session,
          });
        }
      }
      res.json(out);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch carousel promotions" });
    }
  });

  // ============================================================
  // BOOKINGS
  // SECURITY FIX 3: GET all bookings now requires admin auth.
  // Users can only see their own bookings.
  // ============================================================

  // SECURITY FIX 3: Admin only — full booking list
  app.get("/api/bookings", requireAdminAuth, async (req, res) => {
    try {
      const { page, pageSize } = paginationQuerySchema.parse(req.query);
      const { rows, total } = await storage.getAllBookingsPaginated(page, pageSize);
      res.json(buildPaginatedResponse(rows, total, page, pageSize));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Users can get their own bookings
  app.get("/api/bookings/my", requireAuth, async (req: any, res) => {
    try {
      const bookings = await storage.getUserBookings(req.user!.id);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch your bookings" });
    }
  });

  app.get("/api/sessions/my", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (!isUserActive(user)) return respondAccountDeactivated(res);

      const sessions = await storage.getMemberSessions(req.user!.id);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch your sessions" });
    }
  });

  app.post("/api/bookings/:id/payment-ack", requireBookingAuth, async (req: AuthRequest, res) => {
    try {
      const { transactionAckNumber } = memberPaymentAckSchema.parse(req.body);
      const booking = await storage.getBooking(req.params.id);
      if (!booking || !canAccessBooking(req, booking)) {
        return res.status(404).json({ message: "Booking not found" });
      }
      const payMethod = normalizeSessionPaymentMethod(booking.paymentMethod);
      if (payMethod !== "qr" && payMethod !== "razorpay_link") {
        return res.status(400).json({
          message: "This booking does not use manual payment verification",
        });
      }
      if (booking.paymentStatus === "paid") {
        return res.status(400).json({ message: "Payment already confirmed" });
      }

      const updated = await storage.submitBookingPaymentAck(
        booking.id,
        req.user?.id ?? null,
        req.guestCheckoutBookingId ?? null,
        transactionAckNumber,
      );
      if (!updated) {
        return res.status(400).json({ message: "Could not submit payment reference" });
      }

      res.json({
        message: MANUAL_PAYMENT_SUBMITTED_COPY.confirmation,
        bookingId: updated.id,
        verificationStatus: updated.verificationStatus,
        workingHours: MANUAL_PAYMENT_SUBMITTED_COPY.workingHoursDetail,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("[payment-ack] failed:", error);
      res.status(500).json({ message: "Failed to submit payment reference" });
    }
  });

  app.get("/api/bookings/:id", requireBookingAuth, async (req: AuthRequest, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (!canAccessBooking(req, booking)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  /** Resume Razorpay checkout for a held pending/failed booking (email retry links). */
  app.get("/api/bookings/:id/resume-checkout", requireBookingAuth, async (req: AuthRequest, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (!canAccessBooking(req, booking)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const cls = await storage.getClass(booking.classId);
      if (!cls) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (!bookingCanResumeCheckout(booking, cls)) {
        return res.status(409).json({
          code: "checkout_not_resumable",
          message: "This payment hold has expired or checkout can no longer be resumed.",
        });
      }

      const classType = await storage.getClassType(cls.classTypeId);
      const instructor = await storage.getInstructor(cls.instructorId);
      res.json(
        buildResumeCheckoutPayload({
          booking,
          cls,
          classType,
          instructor,
        }),
      );
    } catch {
      res.status(500).json({ message: "Failed to load checkout" });
    }
  });

  /** Guest voluntarily exits Razorpay checkout — release spot immediately (SPEC-02). */
  app.patch("/api/bookings/:id/cancel-checkout", requireBookingAuth, async (req: AuthRequest, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (!canAccessBooking(req, booking)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const updated = await cancelGuestCheckout(booking.id);
      res.json({ booking: updated, message: "Checkout cancelled; your spot has been released." });
    } catch {
      res.status(500).json({ message: "Failed to cancel checkout" });
    }
  });

  /** Gateway payment failure — 10-minute hold + guest notification (SPEC-01). */
  app.post("/api/bookings/:id/payment-failed", requireBookingAuth, async (req: AuthRequest, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (!canAccessBooking(req, booking)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const updated = await applyPaymentFailureHold(booking.id);
      res.json({ booking: updated, message: "Payment hold applied." });
    } catch {
      res.status(500).json({ message: "Failed to apply payment hold" });
    }
  });

  app.post("/api/bookings", optionalAuth, async (req: any, res) => {
    try {
      const payload = createBookingRequestSchema.parse(req.body);
      const { classId } = payload;

      const cls = await storage.getClass(classId);
      if (!cls) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (!isClassVisibleForBooking(cls)) {
        return res.status(404).json({ message: "Class not found" });
      }

      const bookingClassType = await storage.getClassType(cls.classTypeId);
      const bookingInstructor = await storage.getInstructor(cls.instructorId);
      if (!isSessionAllowedInPublicCatalog(bookingClassType, bookingInstructor, req)) {
        return res.status(404).json({ message: "Class not found" });
      }

      const guestCheckoutEnabled = await getGuestCheckoutEnabled();
      // Guest bookings are born here — in-flight routes and webhooks stay open when OFF (SPEC-GG-01).
      const isGuestAllowedSession =
        guestCheckoutEnabled &&
        (cls.sessionFrequency === "drop_in" || cls.sessionFrequency === "trial");
      const mustBeSignedIn = !isGuestAllowedSession;
      const isGuestBooking = !req.user?.id;

      let user = req.user?.id ? await storage.getUser(req.user.id) : undefined;
      if (!user && mustBeSignedIn) {
        return res.status(401).json({
          message: "Sign in is required for recurring sessions.",
          code: "signup_required",
        });
      }

      if (!user && isGuestAllowedSession) {
        if (!payload.guestEmail || !payload.guestName) {
          return res.status(400).json({
            message: "Guest name and email are required for this booking.",
          });
        }

        const guestEmail = payload.guestEmail.toLowerCase().trim();
        const guestName = payload.guestName.trim();
        if (!payload.guestPhone) {
          return res.status(400).json({ message: REQUIRED_PHONE_MESSAGE });
        }
        const guestPhone = payload.guestPhone;

        try {
          parseGuestBookingConsent({
            guestConsentProfile: payload.guestConsentProfile,
            guestConsentTerms: payload.guestConsentTerms,
            guestConsentAge: payload.guestConsentAge,
            consentVersion: payload.consentVersion ?? consentVersion(),
          });
        } catch {
          return res.status(400).json({
            message: "Guest booking requires profile, terms, and age declaration consent.",
            code: "guest_consent_required",
          });
        }

        const existingMember = await storage.getUserByEmail(guestEmail);
        if (existingMember) {
          return res.status(409).json({
            code: "email_registered",
            message:
              "This email is already registered with andWeYoga. Sign in to book this session.",
            redirectTo: "/my-account#profile",
          });
        }

        const classTypeForBooking = await storage.getClassType(cls.classTypeId);
        if (
          !isSessionBookable(
            cls.date,
            classTypeForBooking?.duration,
            cls.sessionFrequency,
          )
        ) {
          if (isTrialOrDropIn(cls.sessionFrequency)) {
            const nextSession = await storage.findNextSessionForClassType(
              cls.classTypeId,
              new Date(),
              ["trial", "drop_in"],
            );
            return res.status(409).json({
              code: "session_in_progress_dropin",
              message: TRIAL_DROPIN_MIDSESSION_MESSAGE,
              nextSession: nextSession
                ? { id: nextSession.id, date: nextSession.date }
                : null,
            });
          }
          return res.status(400).json({ message: "This session is no longer open for booking." });
        }

        const guestConflict = await storage.getGuestBookingConflict(guestEmail, classId);
        if (guestConflict.state === "processing") {
          let resumeCheckout: Record<string, unknown> | null = null;
          if (guestConflict.canResumePayment && guestConflict.booking) {
            const existing = guestConflict.booking;
            const classTypeResume = await storage.getClassType(cls.classTypeId);
            const instructorResume = await storage.getInstructor(cls.instructorId);
            resumeCheckout = buildResumeCheckoutPayload({
              booking: existing,
              cls,
              classType: classTypeResume,
              instructor: instructorResume,
            });
          }
          return res.status(409).json({
            code: "guest_booking_processing",
            message: guestBookingProcessingMessage(
              guestConflict.booking?.paymentMethod ?? cls.paymentMethod,
            ),
            existingBookingId: guestConflict.booking?.id ?? null,
            canResumePayment: guestConflict.canResumePayment ?? false,
            resumeCheckout,
          });
        }
        if (guestConflict.state === "confirmed") {
          return res.status(409).json({
            code: "guest_booking_confirmed",
            message: GUEST_BOOKING_CONFIRMED_MESSAGE,
            existingBookingId: guestConflict.booking?.id ?? null,
          });
        }

        const resumableGuestBooking = await storage.findResumableGuestBookingForClass(
          guestEmail,
          classId,
        );
        if (!resumableGuestBooking) {
          const activeCount = await storage.syncClassBookingCount(classId);
          if (activeCount >= cls.maxCapacity) {
            return res.status(400).json({ message: "Class is fully booked" });
          }
        }

        const guestClassType = classTypeForBooking ?? (await storage.getClassType(cls.classTypeId));
        const guestPrice = guestClassType?.price ?? null;
        const guestHasPrice =
          guestPrice !== null && guestPrice !== "" && parseFloat(String(guestPrice)) > 0;
        const guestHoldUntil = initialBookingHeldUntil(guestHasPrice);

        const booking = resumableGuestBooking
          ? resumableGuestBooking
          : await storage.createBooking({
              classId,
              userId: null,
              isGuestCheckout: true,
              guestName,
              guestEmail,
              guestPhone,
              ...(guestHoldUntil ? { heldUntil: guestHoldUntil } : {}),
            });

        if (!resumableGuestBooking) {
          const meta = requestMeta(req);
          await storage.recordGuestBookingConsents({
            bookingId: booking.id,
            consentVersion: payload.consentVersion ?? consentVersion(),
            ...meta,
          });
        }

        const classType = await storage.getClassType(cls.classTypeId);
        const instructor = await storage.getInstructor(cls.instructorId);
        const price = classType?.price ?? null;
        const hasPrice = price !== null && price !== "" && parseFloat(String(price)) > 0;
        const sessionPaymentMethod = normalizeSessionPaymentMethod(cls.paymentMethod);
        const checkoutGateway = getConfiguredCheckoutGateway();
        const checkoutEnabled =
          hasPrice && usesHostedCheckout(sessionPaymentMethod) && !!checkoutGateway;

        if (!hasPrice) {
          await storage.updateBookingPaymentStatus(booking.id, "waived");
        }

        if (hasPrice) {
          const amountPaise = rupeesToPaise(classType!.price);
          const provider = providerForSessionMethod(sessionPaymentMethod);
          await storage.ensurePaymentStubForBooking({
            bookingId: booking.id,
            userId: null,
            classId: cls.id,
            amountPaise,
            gatewayProvider: provider,
            payerName: guestName,
            payerEmail: guestEmail,
            payerPhone: guestPhone,
          });
        }

        let qrPayment: {
          qrCodeName: string;
          qrImageUrl: string;
          contactPhone: string;
          contactEmail: string;
        } | null = null;

        if (
          hasPrice &&
          usesQrManualVerification(sessionPaymentMethod) &&
          cls.paymentQrCodeId
        ) {
          const qr = await storage.getPaymentQrCode(cls.paymentQrCodeId);
          if (qr) {
            qrPayment = {
              qrCodeName: qr.name,
              qrImageUrl: qr.imageUrl,
              contactPhone: cls.qrContactPhone?.trim() || qr.contactPhone || "",
              contactEmail: cls.qrContactEmail?.trim() || qr.contactEmail || "",
            };
          }
        }

        const usePaymentLink =
          hasPrice && sessionPaymentMethod === "razorpay_link";

        await sendEmail({
          to: guestEmail,
          subject: `Booking reserved — ${classType?.name ?? "Session"}`,
          html: `<p>Hi ${guestName},</p>
<p>Your ${cls.sessionFrequency === "trial" ? "trial" : "drop-in"} session has been reserved.</p>
<p><strong>${classType?.name ?? "Session"}</strong> with ${instructor?.name ?? "Instructor"} on ${new Date(cls.date).toLocaleString("en-IN")}.</p>
<p>Complete payment to confirm your seat.</p>`,
        });

        const guestCheckoutToken =
          checkoutEnabled || hasPrice
            ? generateGuestCheckoutToken(booking.id)
            : undefined;

        return res.status(201).json({
          booking,
          bookingId: booking.id,
          classId: cls.id,
          className: classType?.name ?? "Yoga Session",
          instructorName: instructor?.name ?? "",
          sessionDate: cls.date,
          price,
          paymentMethod: sessionPaymentMethod,
          razorpayLink: usePaymentLink ? (cls.razorpayLink ?? null) : null,
          googleMeetLink: null,
          useRazorpayCheckout: checkoutEnabled,
          useQrPayment: !!qrPayment,
          qrPayment,
          razorpayKeyId: checkoutEnabled ? checkoutGateway!.getPublicKeyId() : null,
          paymentRequired: hasPrice,
          isGuestCheckout: true,
          guestCheckoutToken: guestCheckoutToken ?? null,
          resumedPendingBooking: !!resumableGuestBooking,
          heldUntil: booking.heldUntil
            ? new Date(booking.heldUntil).toISOString()
            : null,
        });
      }

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!isUserActive(user)) {
        return respondAccountDeactivated(res);
      }

      if (mustBeSignedIn && !isAccountProfileComplete(user)) {
        return res.status(409).json({
          message:
            "Your profile is incomplete. Add your name, verified email, primary and emergency mobiles, and your health update in My Account before booking.",
          requiresHealthUpdate: true,
          redirectTo: "/my-account#profile",
          code: "profile_incomplete"
        });
      }

      const resumableBooking = await storage.findResumableBookingForClass(user.id, classId);
      if (!resumableBooking) {
        const activeCount = await storage.syncClassBookingCount(classId);
        if (activeCount >= cls.maxCapacity) {
          return res.status(400).json({ message: "Class is fully booked" });
        }
      }

      const classTypeForBooking = await storage.getClassType(cls.classTypeId);
      if (
        !isSessionBookable(
          cls.date,
          classTypeForBooking?.duration,
          cls.sessionFrequency,
        )
      ) {
        if (isTrialOrDropIn(cls.sessionFrequency)) {
          const nextSession = await storage.findNextSessionForClassType(
            cls.classTypeId,
            new Date(),
            ["trial", "drop_in"],
          );
          return res.status(409).json({
            code: "session_in_progress_dropin",
            message: TRIAL_DROPIN_MIDSESSION_MESSAGE,
            nextSession: nextSession
              ? { id: nextSession.id, date: nextSession.date }
              : null,
          });
        }
        return res.status(400).json({ message: "This session is no longer open for booking." });
      }

      const recurringSeriesBounds = cls.seriesId
        ? await storage.getRecurringSeriesBounds(cls.seriesId)
        : undefined;

      if (
        shouldBlockRecurringMidBatchBooking({
          sessionStart: cls.date,
          sessionFrequency: cls.sessionFrequency,
          seriesId: cls.seriesId,
          seriesBounds: recurringSeriesBounds,
          durationMinutes: classTypeForBooking?.duration,
        })
      ) {
        const nextBatch = recurringSeriesBounds
          ? await storage.findNextRecurringClassAfter(
              cls.classTypeId,
              new Date(recurringSeriesBounds.endAt.getTime() + 60_000),
              cls.seriesId,
            )
          : undefined;
        return res.status(409).json({
          code: "next_batch_only",
          message: nextBatch
            ? "This session has already started. Join the next batch instead."
            : "This session has already started. Join the waitlist for the next batch.",
          nextBatch: nextBatch
            ? {
                id: nextBatch.id,
                date: nextBatch.date,
              }
            : null,
        });
      }

      if (await storage.userHasUpcomingBookingForClass(user.id, classId)) {
        return res.status(409).json({
          message: "You have already booked this session.",
          code: "already_booked",
          redirectTo: "/my-account#sessions",
        });
      }

      const requestedFlexiSelections = payload.flexiSelections ?? [];
      const isFlexiBookingRequest =
        requestedFlexiSelections.length > 0 &&
        !!req.user?.id &&
        isFlexiEnabledSchedule(cls);

      if (requestedFlexiSelections.length > 0 && !isFlexiBookingRequest) {
        return res.status(400).json({
          message: "Flexi selection is only available to signed-in members on eligible schedules.",
        });
      }

      if (isFlexiBookingRequest) {
        const selectionCount = resolveFlexiSelectionCount(cls);
        if (requestedFlexiSelections.length !== selectionCount) {
          return res.status(400).json({
            message: `Choose exactly ${selectionCount} weekly selections for this Flexi package.`,
          });
        }
        const weekdaySet = new Set<number>();
        for (const selection of requestedFlexiSelections) {
          if (weekdaySet.has(selection.weekday)) {
            return res.status(400).json({
              message: "You can choose only one slot per weekday in Flexi Mode.",
            });
          }
          weekdaySet.add(selection.weekday);
        }

        const horizonStart = new Date(cls.date);
        const horizonEnd = new Date(cls.date);
        horizonEnd.setDate(horizonEnd.getDate() + ((cls.seriesWeekCount ?? 1) * 7 - 1));
        const classesInHorizon = await storage.getClassesInRange(horizonStart, horizonEnd);
        const poolClasses = classesInHorizon.filter(
          (candidate) =>
            isFlexiEnabledSchedule(candidate) &&
            candidate.classTypeId === cls.classTypeId &&
            candidate.instructorId === cls.instructorId,
        );
        const occurrencesToReserve: Array<{
          classId: string;
          weekday: number;
          occurrenceDate: Date;
        }> = [];
        for (const selection of requestedFlexiSelections) {
          const source = await storage.getClass(selection.sourceClassId);
          if (
            !source ||
            !isFlexiEnabledSchedule(source) ||
            source.classTypeId !== cls.classTypeId ||
            source.instructorId !== cls.instructorId ||
            source.seriesId !== selection.sourceSeriesId
          ) {
            return res.status(400).json({ message: "One or more Flexi selections are invalid." });
          }
          const sourceEnd = new Date(source.date);
          sourceEnd.setDate(sourceEnd.getDate() + ((source.seriesWeekCount ?? 1) * 7 - 1));
          if (sourceEnd.getTime() < horizonEnd.getTime()) {
            return res.status(400).json({
              message: "Selected Flexi slot does not cover the full package duration.",
            });
          }
          const matchingOccurrences = poolClasses
            .filter(
              (candidate) =>
                candidate.seriesId === selection.sourceSeriesId &&
                new Date(candidate.date).getDay() === selection.weekday,
            )
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const neededOccurrences = matchingOccurrences.filter(
            (candidate) =>
              new Date(candidate.date).getTime() >= horizonStart.getTime() &&
              new Date(candidate.date).getTime() <= horizonEnd.getTime(),
          );
          if (neededOccurrences.length < (cls.seriesWeekCount ?? 1)) {
            return res.status(400).json({
              message: "Selected Flexi slot does not have enough weeks to cover your package.",
            });
          }
          for (const occurrence of neededOccurrences.slice(0, cls.seriesWeekCount ?? 1)) {
            occurrencesToReserve.push({
              classId: occurrence.id,
              weekday: selection.weekday,
              occurrenceDate: new Date(occurrence.date),
            });
          }
        }
        const capacityCounts = await storage.getActiveBookingCountsForClasses(
          occurrencesToReserve.map((occurrence) => occurrence.classId),
        );
        for (const occurrence of occurrencesToReserve) {
          const sourceClass = poolClasses.find((candidate) => candidate.id === occurrence.classId);
          if (!sourceClass) {
            return res.status(400).json({ message: "One of your selected Flexi slots is invalid." });
          }
          const activeCount = capacityCounts.get(occurrence.classId) ?? 0;
          if (activeCount >= sourceClass.maxCapacity) {
            return res.status(400).json({
              message: "One of your selected Flexi slots is full. Please choose another time.",
            });
          }
        }

        const memberPrice = classTypeForBooking?.price ?? null;
        const memberHasPrice =
          memberPrice !== null && memberPrice !== "" && parseFloat(String(memberPrice)) > 0;
        const memberHoldUntil = initialBookingHeldUntil(memberHasPrice);
        const booking = resumableBooking
          ? resumableBooking
          : await storage.createBooking({
              userId: user.id,
              classId,
              ...(memberHoldUntil ? { heldUntil: memberHoldUntil } : {}),
            });
        const classType = await storage.getClassType(cls.classTypeId);
        const instructor = await storage.getInstructor(cls.instructorId);
        const price = classType?.price ?? null;
        const hasPrice = price !== null && price !== "" && parseFloat(String(price)) > 0;
        const sessionPaymentMethod = normalizeSessionPaymentMethod(cls.paymentMethod);
        const checkoutGateway = getConfiguredCheckoutGateway();
        const checkoutEnabled =
          hasPrice && usesHostedCheckout(sessionPaymentMethod) && !!checkoutGateway;
        const flexiBooking = await storage.createFlexiBooking({
          userId: user.id,
          anchorClassId: cls.id,
          classTypeId: cls.classTypeId,
          instructorId: cls.instructorId,
          bookingId: booking.id,
          selectionCount,
          horizonStartAt: horizonStart,
          horizonEndAt: horizonEnd,
          holdExpiresAt: memberHoldUntil,
          paymentStatus: hasPrice ? "pending" : "waived",
          paymentMethod: sessionPaymentMethod,
          status: "pending",
        });
        await storage.createFlexiBookingSelections(
          requestedFlexiSelections.map((selection) => ({
            flexiBookingId: flexiBooking.id,
            weekday: selection.weekday,
            sourceSeriesId: selection.sourceSeriesId,
            sourceClassId: selection.sourceClassId,
            sourceTimeLabel: selection.timeLabel,
          })),
        );
        await storage.createFlexiBookingOccurrences(
          occurrencesToReserve.map((occurrence) => ({
            flexiBookingId: flexiBooking.id,
            classId: occurrence.classId,
            weekday: occurrence.weekday,
            occurrenceDate: occurrence.occurrenceDate,
            status: hasPrice ? "reserved" : "paid",
            holdExpiresAt: memberHoldUntil,
          })),
        );
        if (!hasPrice) {
          await storage.updateBookingPaymentStatus(booking.id, "waived");
        } else {
          const amountPaise = rupeesToPaise(classType!.price);
          const provider = providerForSessionMethod(sessionPaymentMethod);
          await storage.ensurePaymentStubForBooking({
            bookingId: booking.id,
            userId: user.id,
            classId: cls.id,
            amountPaise,
            gatewayProvider: provider,
            payerName: user.name,
            payerEmail: user.email,
            payerPhone: user.primaryMobile ?? null,
          });
          try {
            await storage.createSubscription({
              userId: user.id,
              classTypeId: cls.classTypeId,
              bookingId: booking.id,
              flexiBookingId: flexiBooking.id,
              subscriptionType: cls.sessionFrequency ?? "recurring",
              totalSessions: occurrencesToReserve.length,
              totalAmountPaise: amountPaise,
              status: "active",
            });
          } catch (subErr) {
            console.error("[bookings] flexi subscription row (non-fatal):", subErr);
          }
        }
        let qrPayment: {
          qrCodeName: string;
          qrImageUrl: string;
          contactPhone: string;
          contactEmail: string;
        } | null = null;
        if (
          hasPrice &&
          usesQrManualVerification(sessionPaymentMethod) &&
          cls.paymentQrCodeId
        ) {
          const qr = await storage.getPaymentQrCode(cls.paymentQrCodeId);
          if (qr) {
            qrPayment = {
              qrCodeName: qr.name,
              qrImageUrl: qr.imageUrl,
              contactPhone: cls.qrContactPhone?.trim() || qr.contactPhone || "",
              contactEmail: cls.qrContactEmail?.trim() || qr.contactEmail || "",
            };
          }
        }
        let checkoutAuthToken: string | undefined;
        if (checkoutEnabled && req.user?.id) {
          checkoutAuthToken = generateToken(user.id);
          setAuthCookie(res, checkoutAuthToken);
        }
        return res.status(201).json({
          booking,
          bookingId: booking.id,
          classId: cls.id,
          className: classType?.name ?? "Yoga Session",
          instructorName: instructor?.name ?? "",
          sessionDate: cls.date,
          price,
          paymentMethod: sessionPaymentMethod,
          razorpayLink: hasPrice && sessionPaymentMethod === "razorpay_link" ? (cls.razorpayLink ?? null) : null,
          googleMeetLink: null,
          useRazorpayCheckout: checkoutEnabled,
          useQrPayment: !!qrPayment,
          qrPayment,
          razorpayKeyId: checkoutEnabled ? checkoutGateway!.getPublicKeyId() : null,
          paymentRequired: hasPrice,
          isGuestCheckout: false,
          token: checkoutAuthToken ?? null,
          resumedPendingBooking: !!resumableBooking,
          heldUntil: booking.heldUntil ? new Date(booking.heldUntil).toISOString() : null,
          flexiBookingId: flexiBooking.id,
          flexiSummary: requestedFlexiSelections.map((selection) => ({
            weekday: selection.weekday,
            weekdayLabel: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][selection.weekday],
            timeLabel: selection.timeLabel || formatFlexiTimeLabel(cls.date),
            sourceClassId: selection.sourceClassId,
          })),
        });
      }

      const memberPrice = classTypeForBooking?.price ?? null;
      const memberHasPrice =
        memberPrice !== null && memberPrice !== "" && parseFloat(String(memberPrice)) > 0;
      const memberHoldUntil = initialBookingHeldUntil(memberHasPrice);

      const booking = resumableBooking
        ? resumableBooking
        : await storage.createBooking({
            userId: user.id,
            classId,
            ...(memberHoldUntil ? { heldUntil: memberHoldUntil } : {}),
          });

      const classType = await storage.getClassType(cls.classTypeId);
      const instructor = await storage.getInstructor(cls.instructorId);
      const price = classType?.price ?? null;
      const hasPrice = price !== null && price !== "" && parseFloat(String(price)) > 0;
      const sessionPaymentMethod = normalizeSessionPaymentMethod(cls.paymentMethod);
      const checkoutGateway = getConfiguredCheckoutGateway();
      const checkoutEnabled =
        hasPrice && usesHostedCheckout(sessionPaymentMethod) && !!checkoutGateway;

      if (!hasPrice) {
        await storage.updateBookingPaymentStatus(booking.id, "waived");
      }

      if (hasPrice) {
        const amountPaise = rupeesToPaise(classType!.price);
        const provider = providerForSessionMethod(sessionPaymentMethod);
        await storage.ensurePaymentStubForBooking({
          bookingId: booking.id,
          userId: user.id,
          classId: cls.id,
          amountPaise,
          gatewayProvider: provider,
          payerName: user.name,
          payerEmail: user.email,
          payerPhone: user.primaryMobile ?? null,
        });

        try {
          let totalSessions = 1;
          if (cls.sessionFrequency === "recurring") {
            if (cls.seriesId) {
              totalSessions = await storage.countClassesInSeries(cls.seriesId);
            } else if (cls.seriesWeekCount != null && cls.seriesWeekCount > 0) {
              totalSessions = cls.seriesWeekCount;
            } else {
              totalSessions = 4;
            }
          }
          await storage.createSubscription({
            userId: user.id,
            classTypeId: cls.classTypeId,
            bookingId: booking.id,
            subscriptionType: cls.sessionFrequency ?? "recurring",
            totalSessions,
            totalAmountPaise: amountPaise,
            status: "active",
          });
        } catch (subErr) {
          console.error("[bookings] subscription row (non-fatal):", subErr);
        }
      }

      let qrPayment: {
        qrCodeName: string;
        qrImageUrl: string;
        contactPhone: string;
        contactEmail: string;
      } | null = null;

      if (
        hasPrice &&
        usesQrManualVerification(sessionPaymentMethod) &&
        cls.paymentQrCodeId
      ) {
        const qr = await storage.getPaymentQrCode(cls.paymentQrCodeId);
        if (qr) {
          qrPayment = {
            qrCodeName: qr.name,
            qrImageUrl: qr.imageUrl,
            contactPhone: cls.qrContactPhone?.trim() || qr.contactPhone || "",
            contactEmail: cls.qrContactEmail?.trim() || qr.contactEmail || "",
          };
        }
      }

      const usePaymentLink =
        hasPrice && sessionPaymentMethod === "razorpay_link";

      if (isGuestBooking && user.email) {
        await sendEmail({
          to: user.email,
          subject: `Booking reserved — ${classType?.name ?? "Session"}`,
          html: `<p>Hi ${user.name},</p>
<p>Your ${cls.sessionFrequency === "trial" ? "trial" : "drop-in"} session has been reserved.</p>
<p><strong>${classType?.name ?? "Session"}</strong> with ${instructor?.name ?? "Instructor"} on ${new Date(cls.date).toLocaleString("en-IN")}.</p>
<p>Complete payment to confirm your seat.</p>`,
        });
      }

      let checkoutAuthToken: string | undefined;
      if (checkoutEnabled && req.user?.id) {
        checkoutAuthToken = generateToken(user.id);
        setAuthCookie(res, checkoutAuthToken);
      }

      res.status(201).json({
        booking,
        bookingId: booking.id,
        classId: cls.id,
        className: classType?.name ?? "Yoga Session",
        instructorName: instructor?.name ?? "",
        sessionDate: cls.date,
        price,
        paymentMethod: sessionPaymentMethod,
        razorpayLink: usePaymentLink ? (cls.razorpayLink ?? null) : null,
        googleMeetLink: null,
        useRazorpayCheckout: checkoutEnabled,
        useQrPayment: !!qrPayment,
        qrPayment,
        razorpayKeyId: checkoutEnabled ? checkoutGateway!.getPublicKeyId() : null,
        paymentRequired: hasPrice,
        isGuestCheckout: false,
        token: checkoutAuthToken ?? null,
        resumedPendingBooking: !!resumableBooking,
        heldUntil: booking.heldUntil
          ? new Date(booking.heldUntil).toISOString()
          : null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // ============================================================
  // RAZORPAY PAYMENTS
  // ============================================================
  app.post("/api/payments/create-order", requireBookingAuth, async (req: AuthRequest, res) => {
    try {
      const gateway = getConfiguredCheckoutGateway();
      if (!gateway) {
        return res.status(503).json({ message: "Online payments are not configured yet." });
      }

      const body = z
        .object({
          bookingId: z.string().min(1),
          couponCode: z.string().trim().min(1).optional(),
        })
        .parse(req.body);

      const { bookingId, couponCode } = body;

      const booking = await storage.getBooking(bookingId);
      if (!booking || !canAccessBooking(req, booking)) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (booking.paymentStatus === "paid") {
        return res.status(400).json({ message: "This booking is already paid" });
      }

      let payerName: string;
      let payerEmail: string;
      let payerPhone: string | null;

      if (booking.isGuestCheckout) {
        payerName = bookingContactName(booking);
        payerEmail = bookingContactEmail(booking);
        payerPhone = bookingContactPhone(booking);
        if (!payerName || !payerEmail) {
          return res.status(400).json({ message: "Guest booking contact is incomplete" });
        }
      } else {
        const user = await storage.getUser(req.user!.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        if (!isUserActive(user)) return respondAccountDeactivated(res);
        payerName = user.name;
        payerEmail = user.email;
        payerPhone = user.primaryMobile ?? null;
      }

      const cls = await storage.getClass(booking.classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });
      const sessionMethod = normalizeSessionPaymentMethod(
        booking.paymentMethod ?? cls.paymentMethod,
      );
      if (!usesHostedCheckout(sessionMethod)) {
        return res.status(400).json({
          message: "This session does not use the payment gateway checkout.",
        });
      }

      const classType = await storage.getClassType(cls.classTypeId);
      if (!classType?.price) {
        return res.status(400).json({ message: "This session has no fee configured" });
      }

      const originalAmountPaise = rupeesToPaise(classType.price);
      let amountPaise = originalAmountPaise;
      let discountAmountPaise = 0;
      let appliedCouponId: string | null = null;

      if (couponCode) {
        const coupon = await storage.getActiveCouponByCode(couponCode);
        const applicability = evaluateCouponApplicability({
          status: (coupon?.status ?? "revoked") as "active" | "revoked",
          expiresAt: coupon?.expiresAt ?? new Date(0),
          maxUses: coupon?.maxUses ?? null,
          useCount: coupon?.useCount ?? 0,
          classTypeId: coupon?.classTypeId ?? null,
          classId: coupon?.classId ?? null,
          targetClassTypeId: cls.classTypeId,
          targetClassId: cls.id,
        });
        if (!coupon || !applicability.ok) {
          const messages: Record<string, string> = {
            not_found: "Coupon code not found",
            revoked: "This coupon has been revoked",
            expired: "This coupon has expired",
            max_uses_reached: "This coupon has reached its usage limit",
            wrong_session_type: "This coupon does not apply to this session type",
            wrong_session: "This coupon does not apply to this session",
          };
          return res.status(400).json({
            message: messages[applicability.ok ? "not_found" : applicability.reason],
          });
        }
        const priced = computeFinalAmountPaise(
          originalAmountPaise,
          coupon.discountType as "fixed" | "percent",
          coupon.discountValue,
        );
        amountPaise = priced.finalPaise;
        discountAmountPaise = priced.discountPaise;
        appliedCouponId = coupon.id;
      }

      let payment = await storage.getPaymentByBookingId(bookingId);

      if (
        payment?.razorpayOrderId &&
        payment.status !== "paid" &&
        payment.amountPaise === amountPaise &&
        (payment.couponId ?? null) === appliedCouponId
      ) {
        return res.json({
          orderId: payment.razorpayOrderId,
          amount: payment.amountPaise,
          currency: payment.currency ?? "INR",
          keyId: gateway.getPublicKeyId(),
          paymentId: payment.id,
          originalAmountPaise,
          discountAmountPaise: payment.discountAmountPaise ?? 0,
        });
      }

      const order = await gateway.createOrder({
        amountPaise,
        receipt: bookingId,
        notes: {
          bookingId,
          userId: booking.userId ?? "guest",
          classId: cls.id,
          ...(appliedCouponId ? { couponId: appliedCouponId } : {}),
        },
      });

      if (payment) {
        payment =
          (await storage.updatePayment(payment.id, {
            amountPaise,
            originalAmountPaise,
            discountAmountPaise,
            couponId: appliedCouponId,
            razorpayOrderId: order.orderId,
            gatewayProvider: gateway.id,
            gatewayReference: order.orderId,
            payerName,
            payerEmail,
            payerPhone: payerPhone ?? payment.payerPhone,
            status: "created",
            adminDisposition: "pending",
          })) ?? payment;
      } else {
        payment = await storage.createPayment({
          bookingId,
          userId: booking.userId ?? null,
          classId: cls.id,
          amountPaise,
          originalAmountPaise,
          discountAmountPaise,
          couponId: appliedCouponId,
          currency: "INR",
          razorpayOrderId: order.orderId,
          gatewayProvider: gateway.id,
          gatewayReference: order.orderId,
          payerName,
          payerEmail,
          payerPhone,
          status: "created",
          adminDisposition: "pending",
        });
      }

      res.json({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        paymentId: payment.id,
        originalAmountPaise,
        discountAmountPaise,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("[payments/create-order]", error);
      res.status(500).json({ message: "Failed to create payment order" });
    }
  });

  app.post("/api/payments/verify", requireBookingAuth, async (req: AuthRequest, res) => {
    try {
      const body = z
        .object({
          paymentId: z.string().min(1),
          razorpay_order_id: z.string().min(1),
          razorpay_payment_id: z.string().min(1),
          razorpay_signature: z.string().min(1),
        })
        .parse(req.body);

      const payment = await storage.getPaymentById(body.paymentId);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      const booking = await storage.getBooking(payment.bookingId);
      if (!booking || !canAccessBooking(req, booking)) {
        return res.status(404).json({ message: "Payment not found" });
      }

      const result = await markPaymentPaid({
        paymentId: payment.id,
        razorpayPaymentId: body.razorpay_payment_id,
        razorpayOrderId: body.razorpay_order_id,
        razorpaySignature: body.razorpay_signature,
      });

      if (!result) {
        return res.status(500).json({ message: "Could not confirm payment" });
      }

      res.json({
        success: true,
        ...result,
        isGuestCheckout: booking.isGuestCheckout,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("[payments/verify]", error);

      try {
        const body = req.body as { paymentId?: string };
        if (body.paymentId) {
          const payment = await storage.getPaymentById(body.paymentId);
          const booking = payment ? await storage.getBooking(payment.bookingId) : undefined;
          if (
            payment &&
            booking &&
            canAccessBooking(req, booking) &&
            payment.status === "paid"
          ) {
            const recovered = await getPaidPaymentPayload(payment.id);
            if (recovered) {
              return res.json({
                success: true,
                ...recovered,
                isGuestCheckout: booking.isGuestCheckout,
                recoveredViaWebhook: true,
              });
            }
          }
        }
      } catch (recoveryErr) {
        console.error("[payments/verify] recovery check failed:", recoveryErr);
      }

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Payment verification failed",
      });
    }
  });

  app.post("/api/payments/:id/sync-status", requireBookingAuth, async (req: AuthRequest, res) => {
    try {
      const payment = await storage.getPaymentById(req.params.id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      const booking = await storage.getBooking(payment.bookingId);
      if (!booking || !canAccessBooking(req, booking)) {
        return res.status(404).json({ message: "Payment not found" });
      }
      const payload = await getPaidPaymentPayload(payment.id);
      if (!payload) {
        return res.status(409).json({
          success: false,
          message: "Payment is not confirmed yet. Please wait a moment and try again.",
        });
      }
      res.json({
        success: true,
        ...payload,
        isGuestCheckout: booking.isGuestCheckout,
      });
    } catch {
      res.status(500).json({ message: "Could not sync payment status" });
    }
  });

  app.get("/api/payments/config", (_req, res) => {
    const gateway = getConfiguredCheckoutGateway();
    res.json({
      enabled: !!gateway,
      keyId: gateway?.getPublicKeyId() ?? null,
      provider: gateway?.id ?? null,
    });
  });

  app.get("/api/platform/config", async (_req, res) => {
    try {
      res.json({
        guestCheckoutEnabled: await getGuestCheckoutEnabled(),
        maintenanceWindowEnabled: await getMaintenanceWindowEnabled(),
      });
    } catch {
      res.status(500).json({ message: "Failed to load platform config" });
    }
  });

  app.get("/api/payments/my", requireAuth, async (req: any, res) => {
    try {
      const rows = await storage.getPaymentHistoryForUser(req.user!.id);
      res.json(rows);
    } catch {
      res.status(500).json({ message: "Failed to load payment history" });
    }
  });

  // ============================================================
  // CONTACT MESSAGES
  // SECURITY FIX 3: GET all messages requires admin auth.
  // ============================================================
  app.get("/api/contact-messages", requireAdminAuth, async (req, res) => {
    try {
      const messages = await storage.getAllContactMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contact messages" });
    }
  });

  app.post("/api/contact-messages", async (req, res) => {
    try {
      const validatedData = insertContactMessageSchema.parse(req.body);
      const message = await storage.createContactMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // ============================================================
  // PASSWORD RESET — rate limited
  // SECURITY FIX 6: Forgot password no longer reveals whether an
  // email exists. Always returns the same success message.
  // ============================================================
  app.post('/api/auth/forgot-password', forgotPwdRateLimit, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Always return 200 to prevent email enumeration
      const genericResponse = { message: 'If an account with that email exists, a reset link has been sent.' };

      const existingUser = await storage.findUserByEmail(email);
      if (!existingUser) {
        // Return success anyway — do not reveal that email was not found
        return res.status(200).json(genericResponse);
      }

      const resetToken = generateExpiringVerificationToken();
      const resetTokenHash = hashActionToken(resetToken);
      const resetExpiry = new Date(Date.now() + 3600000); // 1 hour
      await storage.updateUserResetToken(existingUser.id, resetTokenHash, resetExpiry);

      const allowedOrigin = process.env.ALLOWED_ORIGIN || req.get('host');
      const resetUrl = `https://${allowedOrigin}/reset-password?token=${resetToken}`;

      const emailSent = await sendEmail({
        to: email,
        subject: "Reset Your andWeYoga Password",
        html: createPasswordResetEmailHTML(resetUrl, existingUser.name),
        from: `"andWeYoga" <mudit@andweyoga.com>`
      });

      if (!emailSent) {
        console.error('Failed to send password reset email to:', email);
        // Still return generic success — do not reveal failure
      }

      res.status(200).json(genericResponse);
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/auth/reset-password', authRateLimit, async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: 'Token and password are required' });
      }

      if (isVerificationTokenExpired(token)) {
        return res.status(400).json({ message: 'Reset link has expired. Please request a new one.' });
      }

      const user = await storage.findUserByResetToken(hashActionToken(token));
      if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      const hashedPassword = await hashPassword(password);
      await storage.updateUserPassword(user.id, hashedPassword);
      await storage.clearUserResetToken(user.id);

      res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================================
  // ADMIN ROUTES
  // ============================================================
  if (process.env.NODE_ENV !== "production") {
    app.get("/api/admin/auth/login-hint", (_req, res) => {
      const bootstrap = getAdminBootstrapConfig();
      res.json({
        bootstrapEmail: bootstrap?.email ?? null,
      });
    });
  }

  app.post("/api/admin/auth/login", adminLoginRateLimit, async (req, res) => {
    try {
      const email = typeof req.body?.email === "string" ? normalizeAdminEmail(req.body.email) : "";
      const password = typeof req.body?.password === "string" ? normalizeAdminPassword(req.body.password) : "";
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const dbHealth = await checkDatabaseHealth();
      if (!dbHealth.ok) {
        console.error("[Admin login] Database unavailable:", dbHealth.error);
        return res.status(503).json({
          message:
            "Database is unavailable. Copy a fresh DATABASE_URL (or DATABASE_PUBLIC_URL) from Railway Postgres into .env and restart the server.",
        });
      }

      const admin = await verifyAdminCredentials(email, password);
      if (!admin) {
        return res.status(401).json({ message: "Invalid admin credentials." });
      }

      const token = generateAdminToken(admin.id);
      setAdminAuthCookie(res, token);
      res.json({
        message: "Admin login successful",
        admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role }
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ message: "Admin login failed" });
    }
  });

  app.post("/api/admin/auth/logout", (_req, res) => {
    res.clearCookie(ADMIN_AUTH_COOKIE_NAME);
    res.json({ message: "Admin logged out successfully" });
  });

  app.get("/api/admin/auth/verify", requireAdminAuth, async (req: AdminAuthRequest, res) => {
    try {
      if (!req.admin) {
        return res.status(401).json({ message: "Admin authentication required" });
      }
      res.json({
        message: "Admin token valid",
        admin: { id: req.admin.id, email: req.admin.email, name: req.admin.name, role: req.admin.role }
      });
    } catch (error) {
      console.error('Admin verify error:', error);
      res.status(500).json({ message: "Admin verification failed" });
    }
  });

  app.get("/api/admin/users", requireAdminAuth, async (req: AdminAuthRequest, res) => {
    try {
      const { page, pageSize } = paginationQuerySchema.parse(req.query);
      const { rows, total } = await storage.getUsersWithCompletenessPaginated(page, pageSize);
      const allForStats = await storage.getUsersWithCompleteness();
      const completeProfiles = allForStats.filter((u) => u.completeness.isComplete).length;
      res.json({
        ...buildPaginatedResponse(rows, total, page, pageSize),
        stats: {
          completeProfiles,
          incompleteProfiles: allForStats.length - completeProfiles,
        },
      });
    } catch (error) {
      console.error('Admin get users error:', error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/pending-qr-bookings", requireAdminAuth, async (_req, res) => {
    try {
      const pending = await storage.getPendingQrBookings();
      res.json(pending);
    } catch {
      res.status(500).json({ message: "Failed to fetch pending bookings" });
    }
  });

  app.post("/api/admin/bookings/:id/confirm-qr", requireAdminAuth, async (req, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (
        normalizeSessionPaymentMethod(booking.paymentMethod) !== "qr" ||
        booking.verificationStatus !== "pending"
      ) {
        return res.status(400).json({ message: "Booking is not pending QR verification" });
      }

      const payload = await confirmQrBookingPayment(booking.id);
      if (!payload) {
        return res.status(500).json({ message: "Could not confirm payment" });
      }

      res.json({
        message: "Payment confirmed and confirmation email sent",
        ...payload,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Confirmation failed";
      res.status(400).json({ message: msg });
    }
  });

  app.get("/api/admin/payments/history", requireAdminAuth, async (_req, res) => {
    try {
      const rows = await storage.getPaymentHistoryForAdmin();
      res.json(rows);
    } catch {
      res.status(500).json({ message: "Failed to load payment history" });
    }
  });

  app.post("/api/admin/payments/:id/verify", requireAdminAuth, async (req, res) => {
    try {
      const disposition = z
        .enum(["pending", "received", "failed", "dispute"])
        .parse(req.body?.adminDisposition) as PaymentDisposition;
      const payload = await verifyManualPayment(req.params.id, disposition);
      res.json({
        message:
          disposition === "received"
            ? "Payment verified and confirmation email sent"
            : "Payment status updated",
        ...payload,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Verification failed";
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payment status" });
      }
      res.status(400).json({ message: msg });
    }
  });

  app.get("/api/admin/classes", requireAdminAuth, async (req, res) => {
    try {
      const { page, pageSize } = paginationQuerySchema.parse(req.query);
      const { rows: all, total } = await storage.getAllClassesPaginated(page, pageSize);
      const enriched = await Promise.all(
        all.map(async (cls) => {
          const [classType, instructor, currentBookings] = await Promise.all([
            storage.getClassType(cls.classTypeId),
            storage.getInstructor(cls.instructorId),
            storage.syncClassBookingCount(cls.id),
          ]);
          return { ...cls, classType, instructor, currentBookings };
        }),
      );
      res.json(buildPaginatedResponse(enriched, total, page, pageSize));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin classes" });
    }
  });

  app.get("/api/admin/classes/week", requireAdminAuth, async (req, res) => {
    try {
      const { start, end } = z
        .object({
          start: z.string().min(1),
          end: z.string().min(1),
        })
        .parse(req.query);
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid week range" });
      }
      const rows = await storage.getClassesInRange(startDate, endDate);
      const enriched = await Promise.all(
        rows.map(async (cls) => {
          const [classType, instructor, currentBookings] = await Promise.all([
            storage.getClassType(cls.classTypeId),
            storage.getInstructor(cls.instructorId),
            storage.syncClassBookingCount(cls.id),
          ]);
          return { ...cls, classType, instructor, currentBookings };
        }),
      );
      res.json(enriched);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "start and end query params are required" });
      }
      res.status(500).json({ message: "Failed to fetch admin week classes" });
    }
  });

  app.get("/api/admin/class-types", requireAdminAuth, async (req, res) => {
    try {
      const { page, pageSize } = paginationQuerySchema.parse(req.query);
      const { rows, total } = await storage.getAllClassTypesPaginated(page, pageSize, {
        excludeQaFixtures: true,
      });
      res.json(buildPaginatedResponse(rows, total, page, pageSize));
    } catch {
      res.status(500).json({ message: "Failed to fetch class types" });
    }
  });

  app.post("/api/admin/purge-qa-fixtures", requireAdminAuth, async (req: AdminAuthRequest, res) => {
    try {
      const { purgeQaFixturesFromDb } = await import("../scripts/db/purge-qa-fixtures-core.ts");
      const summary = await purgeQaFixturesFromDb();
      await storage.insertAuditLog({
        userId: req.admin?.id ?? null,
        action: "qa_fixtures_purged",
        resourceType: "class_type",
        resourceId: null,
        metadata: JSON.stringify(summary),
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
      });
      res.json({
        message: "Test fixture data removed.",
        ...summary,
      });
    } catch {
      res.status(500).json({ message: "Failed to purge test fixtures" });
    }
  });

  app.patch("/api/admin/users/:id", requireAdminAuth, async (req, res) => {
    try {
      const body = z.object({ isActive: z.boolean() }).parse(req.body);
      const user = await storage.setUserActive(req.params.id, body.isActive);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "isActive (boolean) is required" });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  if (isHealthDocumentUploadEnabled()) {
    app.get("/api/admin/users/:userId/health-documents", requireAdminAuth, async (req, res) => {
      const objectPath = typeof req.query.path === "string" ? req.query.path : "";
      if (!objectPath || !userOwnsHealthDocumentPath(objectPath, req.params.userId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      try {
        await streamHealthDocumentForAdmin(objectPath, res);
      } catch (error) {
        console.error("Admin health document stream error:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to load document" });
        }
      }
    });
  }

  app.post("/api/admin/users/bulk", requireAdminAuth, async (_req, res) => {
    // PLACEHOLDER: Excel bulk upload — needs multer/xlsx parser + row validation + invite emails
    res.status(501).json({
      message:
        "Bulk user upload is planned. Use single-user invite flow when available, or add users via public registration.",
      code: "bulk_upload_not_implemented",
    });
  });

  app.post("/api/admin/users", requireAdminAuth, async (_req, res) => {
    res.status(501).json({
      message: "Admin-created users (invite) not implemented yet. Users register via the public site.",
      code: "admin_create_user_not_implemented",
    });
  });

  app.delete("/api/admin/users/:id", requireSuperAdminAuth, async (req: AdminAuthRequest, res) => {
    try {
      const result = await storage.deleteUserPermanently(req.params.id);
      if (!result.ok) {
        return res.status(result.message === "User not found" ? 404 : 500).json({
          message: result.message ?? "Failed to delete user",
        });
      }
      res.json({ message: "User and related records deleted permanently." });
    } catch {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.post("/api/admin/users/bulk-delete", requireSuperAdminAuth, async (req: AdminAuthRequest, res) => {
    try {
      const body = z.object({ ids: z.array(z.string().min(1)).min(1) }).parse(req.body);
      const uniqueIds = [...new Set(body.ids)];
      const result = await storage.deleteUsersPermanently(uniqueIds);
      res.json({
        message: `Deleted ${result.deleted.length} user(s).`,
        ...result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "ids array is required" });
      }
      res.status(500).json({ message: "Failed to bulk delete users" });
    }
  });

  app.patch("/api/admin/classes/:id", requireAdminAuth, async (req, res) => {
    try {
      const existing = await storage.getClass(req.params.id);
      if (!existing) return res.status(404).json({ message: "Session not found" });

      const validated = adminUpdateClassSessionSchema.parse({
        ...req.body,
        date: req.body.date ?? existing.date,
        recurrenceKind: req.body.recurrenceKind ?? existing.recurrenceKind ?? "once",
        occurrenceCount: req.body.occurrenceCount ?? existing.seriesWeekCount ?? 1,
        recurrenceWeekdays: req.body.recurrenceWeekdays ?? [],
      });

      if (
        validated.date.getTime() !== existing.date.getTime() &&
        (await storage.countBookingsForClass(existing.id)) > 0
      ) {
        return res.status(400).json({
          message: "Cannot change date/time — this session already has bookings.",
        });
      }

      const instructor = await storage.getInstructor(validated.instructorId);
      if (!instructor || !isInstructorSessionPoolEligible(instructor)) {
        return res.status(400).json({ message: "Selected instructor cannot take sessions." });
      }

      const updated = await storage.updateClassSession(existing.id, {
        classTypeId: validated.classTypeId,
        instructorId: validated.instructorId,
        date: validated.date,
        maxCapacity: validated.maxCapacity,
        googleMeetLink: validated.googleMeetLink,
        deliveryMode: validated.deliveryMode,
        sessionFrequency: validated.sessionFrequency,
        venueAddress: validated.venueAddress,
        venueMapLink: validated.venueMapLink,
        venueContactPhone: validated.venueContactPhone,
        paymentMethod: validated.paymentMethod,
        razorpayLink: validated.razorpayLink,
        paymentQrCodeId: validated.paymentQrCodeId,
        qrContactPhone: validated.qrContactPhone,
        qrContactEmail: validated.qrContactEmail,
        status: validated.status,
        publishedAt: validated.publishedAt,
        recurrenceKind: validated.recurrenceKind,
        recurrenceWeekdays:
          validated.recurrenceKind === "weekly"
            ? serializeRecurrenceWeekdays(validated.recurrenceWeekdays)
            : null,
        seriesWeekCount:
          validated.recurrenceKind === "weekly" ? validated.occurrenceCount : null,
        flexiEnabled:
          validated.recurrenceKind === "weekly" ? validated.flexiEnabled : false,
        flexiSelectionCount:
          validated.recurrenceKind === "weekly" ? validated.flexiSelectionCount : null,
      });
      if (!updated) return res.status(404).json({ message: "Session not found" });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: formatZodErrorsForDisplay(error.errors)[0] || "Invalid input",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  app.patch(
    "/api/admin/flexi-bookings/:id/rematch",
    requireSuperAdminAuth,
    async (req: AdminAuthRequest, res) => {
      try {
        const body = z
          .object({
            selections: z
              .array(
                z.object({
                  weekday: z.number().int().min(0).max(6),
                  sourceSeriesId: z.string().min(1),
                  sourceClassId: z.string().min(1),
                  timeLabel: z.string().min(1),
                }),
              )
              .min(1),
          })
          .parse(req.body);
        const result = await storage.rematchFlexiBooking(req.params.id, body.selections);
        if (!result.ok) {
          return res.status(400).json({ message: result.message ?? "Could not rematch Flexi booking" });
        }
        res.json({
          message: "Flexi booking rematched successfully.",
          flexiBooking: result.flexiBooking,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: formatZodErrorsForDisplay(error.errors)[0] || "Invalid input",
            errors: error.errors,
          });
        }
        res.status(500).json({ message: "Failed to rematch Flexi booking" });
      }
    },
  );

  app.get("/api/admin/flexi-bookings", requireSuperAdminAuth, async (_req, res) => {
    try {
      const rows = await storage.listFlexiBookingsForAdmin();
      res.json(rows);
    } catch (error) {
      console.error("[admin/flexi-bookings]", error);
      res.status(500).json({ message: "Failed to load Flexi bookings" });
    }
  });

  app.get(
    "/api/admin/flexi-bookings/:id/options",
    requireSuperAdminAuth,
    async (req, res) => {
      try {
        const options = await storage.getFlexiOptionsForBooking(req.params.id);
        if (!options) {
          return res.status(404).json({ message: "Flexi booking or options not found" });
        }
        res.json(options);
      } catch (error) {
        console.error("[admin/flexi-bookings/:id/options]", error);
        res.status(500).json({ message: "Failed to load Flexi rematch options" });
      }
    },
  );

  app.delete("/api/admin/classes/:id", requireSuperAdminAuth, async (req, res) => {
    res.status(410).json({
      message: "Use POST /api/admin/classes/:id/delete with reason and owner OTP instead.",
    });
  });

  app.post("/api/admin/classes/:id/delete", requireSuperAdminAuth, async (req: AdminAuthRequest, res) => {
    try {
      const body = z
        .object({
          reason: z.string().min(3, "Deletion reason is required"),
          compensation: z.string().optional(),
          ownerOtp: z.string().min(1, "Owner OTP is required"),
        })
        .parse(req.body);

      const otp = validateOwnerCancelOtp(body.ownerOtp);
      if (!otp.ok) {
        return res.status(400).json({ message: otp.message });
      }

      const compensation = body.compensation?.trim() ?? "";
      const bookingCount = await storage.countBookingsForClass(req.params.id);
      if (bookingCount > 0 && compensation.length < 3) {
        return res.status(400).json({
          message: "Compensation details are required when the session has bookings.",
        });
      }

      const prep = await storage.hardDeleteClassSession(req.params.id, body.reason);
      if (!prep.ok) {
        return res.status(400).json({ message: prep.message || "Could not delete session" });
      }

      const notifySummary = await notifySessionCancellation(prep.recipients ?? [], {
        kind: "session_deleted",
        reason: body.reason,
        compensation: compensation || undefined,
        classTypeName: prep.classTypeName ?? "Session",
        sessionDateIso: prep.sessionDateIso,
        instructorName: prep.instructorName,
      });

      await storage.insertAuditLog({
        userId: req.admin?.id ?? null,
        action: "session_deleted",
        resourceType: "class_session",
        resourceId: req.params.id,
        metadata: JSON.stringify({
          reason: body.reason,
          compensation: compensation || null,
          performedByEmail: req.admin?.email,
          recipientCount: notifySummary.recipientCount,
          bookingCount,
        }),
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
      });

      res.json({
        message:
          notifySummary.recipientCount > 0
            ? `Session deleted. ${notifySummary.recipientCount} member(s) notified by email (SMS/WhatsApp queued when channels go live).`
            : "Session deleted.",
        notifications: notifySummary,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: formatZodErrorsForDisplay(error.errors)[0] || "Invalid input",
        });
      }
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  app.post("/api/admin/classes/:id/cancel", requireSuperAdminAuth, async (req: AdminAuthRequest, res) => {
    try {
      const body = z
        .object({
          reason: z.string().min(3, "Cancellation reason is required"),
          ownerOtp: z.string().min(1, "Owner OTP is required"),
        })
        .parse(req.body);

      const otp = validateOwnerCancelOtp(body.ownerOtp);
      if (!otp.ok) {
        return res.status(400).json({ message: otp.message });
      }

      const result = await storage.cancelClassSession(req.params.id, body.reason);
      if (!result.ok) {
        return res.status(400).json({ message: result.message || "Could not cancel session" });
      }

      const notifySummary = await notifySessionCancellation(result.recipients ?? [], {
        kind: "session",
        reason: body.reason,
        classTypeName: result.classTypeName ?? "Session",
        sessionDateIso: result.sessionDateIso,
        instructorName: result.instructorName,
      });

      await storage.insertAuditLog({
        userId: req.admin?.id ?? null,
        action: "session_cancelled",
        resourceType: "class_session",
        resourceId: req.params.id,
        metadata: JSON.stringify({
          reason: body.reason,
          performedByEmail: req.admin?.email,
          recipientCount: notifySummary.recipientCount,
        }),
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
      });
      res.json({
        message:
          notifySummary.recipientCount > 0
            ? `Session cancelled. ${notifySummary.recipientCount} member(s) notified by email (SMS/WhatsApp queued when channels go live).`
            : "Session cancelled. No bookings were affected.",
        notifications: notifySummary,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: formatZodErrorsForDisplay(error.errors)[0] || "Invalid input",
        });
      }
      res.status(500).json({ message: "Failed to cancel session" });
    }
  });

  app.patch("/api/admin/classes/:id/pause", requireAdminAuth, async (req, res) => {
    const cls = await storage.pauseClassSession(req.params.id);
    if (!cls) return res.status(404).json({ message: "Session not found" });
    res.json(cls);
  });

  app.patch("/api/admin/classes/:id/resume", requireAdminAuth, async (req, res) => {
    const cls = await storage.resumeClassSession(req.params.id);
    if (!cls) return res.status(404).json({ message: "Session not found" });
    res.json(cls);
  });

  // PLACEHOLDER: Instructor mood aggregate for Google Meet moderation UI
  app.get("/api/admin/classes/:id/mood-summary", requireAdminAuth, async (_req, res) => {
    res.status(501).json({
      message:
        "Instructor mood aggregate (per-user + rolled-up) requires session_mood_checkins queries and Meet add-on integration — schema ready after db:patch.",
      code: "instructor_mood_aggregate_not_implemented",
    });
  });

  app.get("/api/admin/profile", requireAdminAuth, async (req: any, res) => {
    const admin = await storage.getAdminById(req.admin.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    const profile = await storage.getAdminProfile(admin.id);
    res.json({
      profile: profile ?? null,
      fallback: { email: admin.email, phone: "" },
    });
  });

  app.put("/api/admin/profile", requireAdminAuth, async (req: any, res) => {
    const data = z
      .object({
        email: z.string().email(),
        phone: z.string().regex(/^\d{10}$/),
        governmentIdImageUrl: z.string().optional().nullable(),
      })
      .parse(req.body);
    if (data.governmentIdImageUrl && data.governmentIdImageUrl.startsWith("data:")) {
      const approxBytes = Math.ceil((data.governmentIdImageUrl.length * 3) / 4);
      if (approxBytes > 1_000_000) {
        return res.status(400).json({ message: "Government ID image must be <= 1MB" });
      }
    }
    const profile = await storage.upsertAdminProfile(req.admin.id, {
      email: data.email,
      phone: data.phone,
      governmentIdImageUrl: data.governmentIdImageUrl ?? null,
      verificationStatus: "pending",
      verificationNotes: null,
    });
    res.json(profile);
  });

  app.post("/api/admin/profile/verify-id", requireAdminAuth, async (req: any, res) => {
    const notes = z.object({ notes: z.string().optional().nullable() }).parse(req.body ?? {});
    const profile = await storage.updateAdminProfileVerification(
      req.admin.id,
      "verified",
      notes.notes ?? "Manual verification completed",
    );
    if (!profile) return res.status(404).json({ message: "Admin profile not found" });
    res.json(profile);
  });

  app.get("/api/admin/subscriptions", requireAdminAuth, async (_req, res) => {
    const rows = await storage.getSubscriptionSummariesForAdmin();
    res.json(rows);
  });

  app.get("/api/admin/coupons/otp-hint", requireAdminAuth, async (_req, res) => {
    res.json({
      hint: couponCreateOtpHint(),
      /** Dummy OTP — replace with finance-controller email flow in production. */
      devOtp: process.env.NODE_ENV !== "production" ? process.env.COUPON_ADMIN_OTP?.trim() || "123456" : undefined,
    });
  });

  app.get("/api/admin/coupons", requireAdminAuth, async (_req, res) => {
    try {
      const rows = await storage.getCouponSummariesForAdmin();
      res.json(rows);
    } catch (error) {
      console.error("[admin/coupons]", error);
      res.status(500).json({ message: "Failed to load coupons" });
    }
  });

  app.get("/api/admin/coupons/redemptions", requireAdminAuth, async (req, res) => {
    try {
      const couponId = typeof req.query.couponId === "string" ? req.query.couponId : undefined;
      const rows = await storage.getCouponRedemptionsForAdmin(couponId);
      res.json(rows);
    } catch (error) {
      console.error("[admin/coupons/redemptions]", error);
      res.status(500).json({ message: "Failed to load coupon redemptions" });
    }
  });

  app.post("/api/admin/coupons", requireAdminAuth, async (req: AdminAuthRequest, res) => {
    try {
      const data = createCouponCodeSchema.parse(req.body);
      if (!verifyCouponCreateOtp(data.otp)) {
        return res.status(403).json({ message: "Invalid OTP. Coupon was not created." });
      }

      if (data.classId) {
        const cls = await storage.getClass(data.classId);
        if (!cls) return res.status(400).json({ message: "Selected session does not exist" });
        if (data.classTypeId && data.classTypeId !== cls.classTypeId) {
          return res.status(400).json({ message: "Session does not match the selected session type" });
        }
      }
      if (data.classTypeId) {
        const ct = await storage.getClassType(data.classTypeId);
        if (!ct) return res.status(400).json({ message: "Selected session type does not exist" });
      }

      const code = normalizeCouponCode(data.code ?? generateCouponCode());
      const existing = await storage.getActiveCouponByCode(code);
      if (existing) {
        return res.status(409).json({ message: "This coupon code is already in use" });
      }

      const discountValue =
        data.discountType === "fixed"
          ? Math.round(data.discountValue * 100)
          : Math.round(data.discountValue);

      const created = await storage.createCouponCode({
        code,
        discountType: data.discountType,
        discountValue,
        classTypeId: data.classTypeId ?? null,
        classId: data.classId ?? null,
        expiresAt: data.expiresAt,
        maxUses: data.maxUses ?? null,
        status: "active",
        createdByAdminId: req.admin!.id,
        notes: data.notes ?? null,
      });

      await storage.insertAuditLog({
        action: "coupon_created",
        resourceType: "coupon_code",
        resourceId: created.id,
        metadata: JSON.stringify({ code: created.code, discountType: created.discountType }),
      });

      const summaries = await storage.getCouponSummariesForAdmin();
      const summary = summaries.find((c) => c.id === created.id);
      res.status(201).json(summary ?? created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: formatZodErrorsForDisplay(error.errors)[0] || "Invalid input",
          errors: error.errors,
        });
      }
      console.error("[admin/coupons create]", error);
      res.status(500).json({ message: "Failed to create coupon" });
    }
  });

  app.post("/api/admin/coupons/:id/revoke", requireAdminAuth, async (req: AdminAuthRequest, res) => {
    try {
      const coupon = await storage.getCouponById(req.params.id);
      if (!coupon) return res.status(404).json({ message: "Coupon not found" });
      const revoked = await storage.revokeCoupon(req.params.id);
      await storage.insertAuditLog({
        action: "coupon_revoked",
        resourceType: "coupon_code",
        resourceId: req.params.id,
        metadata: JSON.stringify({ code: coupon.code }),
      });
      res.json(revoked);
    } catch (error) {
      console.error("[admin/coupons revoke]", error);
      res.status(500).json({ message: "Failed to revoke coupon" });
    }
  });

  app.post("/api/admin/coupons/:id/share", requireAdminAuth, async (req: AdminAuthRequest, res) => {
    try {
      const data = shareCouponSchema.parse(req.body);
      const coupon = await storage.getCouponById(req.params.id);
      if (!coupon) return res.status(404).json({ message: "Coupon not found" });
      if (coupon.status !== "active" || !isCouponNotExpired(coupon.expiresAt)) {
        return res.status(400).json({ message: "Cannot share an expired or revoked coupon" });
      }

      const classType = coupon.classTypeId
        ? await storage.getClassType(coupon.classTypeId)
        : undefined;
      const cls = coupon.classId ? await storage.getClass(coupon.classId) : undefined;
      const sessionLabel = resolveCouponSessionLabel(coupon, classType, cls);

      const results: Array<{
        userId: string;
        channel: string;
        status: string;
        error?: string;
      }> = [];

      for (const userId of data.userIds) {
        const user = await storage.getUser(userId);
        if (!user || !user.isActive) {
          for (const channel of data.channels) {
            results.push({ userId, channel, status: "failed", error: "Member not found or inactive" });
            await storage.recordCouponShareLog({
              couponId: coupon.id,
              adminId: req.admin!.id,
              userId,
              channel,
              status: "failed",
              errorMessage: "Member not found or inactive",
            });
          }
          continue;
        }

        for (const channel of data.channels) {
          const delivery = await deliverCouponShare(channel, user, coupon, sessionLabel);
          await storage.recordCouponShareLog({
            couponId: coupon.id,
            adminId: req.admin!.id,
            userId,
            channel,
            status: delivery.ok ? "sent" : "failed",
            errorMessage: delivery.error ?? null,
            sentAt: delivery.ok ? new Date() : null,
          });
          results.push({
            userId,
            channel,
            status: delivery.ok ? "sent" : "failed",
            error: delivery.error,
          });
        }
      }

      res.json({ results });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: formatZodErrorsForDisplay(error.errors)[0] || "Invalid input",
          errors: error.errors,
        });
      }
      console.error("[admin/coupons share]", error);
      res.status(500).json({ message: "Failed to share coupon" });
    }
  });

  app.post("/api/coupons/validate", requireBookingAuth, async (req: AuthRequest, res) => {
    try {
      const { code, classId } = validateCouponSchema.parse(req.body);
      const cls = await storage.getClass(classId);
      if (!cls) return res.status(404).json({ message: "Session not found" });
      const classType = await storage.getClassType(cls.classTypeId);
      const instructor = await storage.getInstructor(cls.instructorId);
      if (!isSessionAllowedInPublicCatalog(classType, instructor, req)) {
        return res.status(404).json({ message: "Session not found" });
      }
      if (!classType?.price) {
        return res.status(400).json({ message: "This session has no fee" });
      }

      const coupon = await storage.getActiveCouponByCode(code);
      const applicability = evaluateCouponApplicability({
        status: (coupon?.status ?? "revoked") as "active" | "revoked",
        expiresAt: coupon?.expiresAt ?? new Date(0),
        maxUses: coupon?.maxUses ?? null,
        useCount: coupon?.useCount ?? 0,
        classTypeId: coupon?.classTypeId ?? null,
        classId: coupon?.classId ?? null,
        targetClassTypeId: cls.classTypeId,
        targetClassId: cls.id,
      });

      if (!coupon || !applicability.ok) {
        const messages: Record<string, string> = {
          not_found: "Coupon code not found",
          revoked: "This coupon has been revoked",
          expired: "This coupon has expired",
          max_uses_reached: "This coupon has reached its usage limit",
          wrong_session_type: "This coupon does not apply to this session type",
          wrong_session: "This coupon does not apply to this session",
        };
        return res.status(400).json({
          valid: false,
          message: messages[applicability.ok ? "not_found" : applicability.reason],
        });
      }

      const originalPaise = rupeesToPaise(classType.price);
      const { discountPaise, finalPaise } = computeFinalAmountPaise(
        originalPaise,
        coupon.discountType as "fixed" | "percent",
        coupon.discountValue,
      );

      res.json({
        valid: true,
        code: coupon.code,
        couponId: coupon.id,
        discountType: coupon.discountType,
        originalAmountPaise: originalPaise,
        discountAmountPaise: discountPaise,
        finalAmountPaise: finalPaise,
        expiresAt: coupon.expiresAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("[coupons/validate]", error);
      res.status(500).json({ message: "Could not validate coupon" });
    }
  });

  app.get("/api/admin/waitlist-users", requireAdminAuth, async (_req, res) => {
    const rows = await storage.getNotifyRequestsForAdmin();
    res.json(rows);
  });

  app.get("/api/subscriptions/my", requireAuth, async (req: any, res) => {
    const rows = await storage.getSubscriptionSummariesForUser(req.user.id);
    res.json(rows);
  });

  // ============================================================
  // HEALTH DOCUMENTS — upload + download
  // ============================================================
  if (isHealthDocumentUploadEnabled()) {
    const { ObjectStorageService } = await import(
      "./objectStorage"
    );

    app.post("/api/health-documents/upload", requireAuth, async (req: any, res) => {
      try {
        const body = healthDocumentUploadBodySchema.parse(req.body);
        const result = await uploadHealthDocumentForUser(req.user!.id, body);
        res.status(200).json({
          objectPath: result.objectPath,
          message: "Document uploaded successfully",
        });
      } catch (error) {
        if (error instanceof HealthDocumentUploadError) {
          return res.status(error.status).json({ error: error.message });
        }
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Invalid upload payload", details: error.errors });
        }
        console.error("Health document upload error:", error);
        const message =
          error instanceof Error ? error.message : "Failed to upload document";
        res.status(500).json({ error: message });
      }
    });

    app.post("/api/objects/upload", requireAuth, async (req: any, res) => {
      try {
        const objectStorageService = new ObjectStorageService();
        const uploadURL = await objectStorageService.getObjectEntityUploadURL(
          req.user!.id
        );
        res.json({ uploadURL });
      } catch (error) {
        console.error("Error getting upload URL:", error);
        const message =
          error instanceof Error ? error.message : "Failed to get upload URL";
        res.status(503).json({ error: message });
      }
    });

    app.get("/objects/:objectPath(*)", requireAuth, async (req: any, res) => {
      try {
        await streamHealthDocumentForUser(req.path, req.user?.id, res);
      } catch (error) {
        console.error("Error accessing document:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Internal server error" });
        }
      }
    });

    app.put("/api/health-documents", requireAuth, async (req: any, res) => {
      try {
        if (!req.body.healthDocumentURL) {
          return res.status(400).json({ error: "healthDocumentURL is required" });
        }

        const userId = req.user?.id;
        const objectStorageService = new ObjectStorageService();
        const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
          req.body.healthDocumentURL,
          { owner: userId, visibility: "private" }
        );

        res.status(200).json({
          objectPath: objectPath,
          message: "Document access configured successfully"
        });
      } catch (error) {
        console.error("Error configuring document access:", error);
        const message =
          error instanceof Error ? error.message : "Internal server error";
        res.status(500).json({ error: message });
      }
    });
  }

  const httpServer = createServer(app);

  // SPEC-01: expire payment holds every 2 minutes
  const paymentHoldInterval = setInterval(() => {
    void expirePaymentHolds().catch((err) =>
      console.error("[cron] expirePaymentHolds failed:", err),
    );
  }, 2 * 60 * 1000);
  paymentHoldInterval.unref?.();

  const erasureInterval = setInterval(() => {
    void storage.processDueAccountErasures().catch((err) =>
      console.error("[cron] processDueAccountErasures failed:", err),
    );
  }, 5 * 60 * 1000);
  erasureInterval.unref?.();

  return httpServer;
}
