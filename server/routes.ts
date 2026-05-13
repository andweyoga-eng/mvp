import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import {
  insertClassTypeSchema,
  insertInstructorSchema,
  insertClassSchema,
  insertBookingSchema,
  insertContactMessageSchema,
  registerUserSchema,
  loginUserSchema,
  updateProfileSchema,
  healthUpdateSchema
} from "@shared/schema";
import {
  computeProfileCompletionStatus,
  isAccountProfileComplete,
} from "@shared/profileCompleteness";
import {
  hashPassword, verifyPassword, generateToken,
  generateExpiringVerificationToken, isVerificationTokenExpired,
  requireAuth, optionalAuth, type AuthRequest
} from "./auth";
import {
  generateAdminToken, requireAdminAuth,
  type AdminAuthRequest, verifyAdminCredentials
} from "./adminAuth";
import { sendEmail, createVerificationEmailHTML, createPasswordResetEmailHTML } from "./email";
import { setupGoogleAuth, verifyGoogleToken } from "./googleAuth";

// ---------------------------------------------------------------------------
// PRODUCT (POV): In-app health document file uploads are DISABLED until we
// standardize object storage (S3 / R2 / etc.) and need uploads at scale. Users
// are directed to email detailed reports instead — see HealthUpdateSection UI.
// Set ENABLE_HEALTH_DOCUMENT_OBJECT_ROUTES = true to restore POST /api/objects/upload,
// GET /objects/*, and PUT /api/health-documents.
// ---------------------------------------------------------------------------
const ENABLE_HEALTH_DOCUMENT_OBJECT_ROUTES = false;

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
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) rateLimitStore.delete(key);
  }
}, 10 * 60 * 1000);

const authRateLimit = rateLimit(10, 15 * 60 * 1000);   // 10 attempts per 15 minutes
const forgotPwdRateLimit = rateLimit(3, 60 * 60 * 1000); // 3 attempts per hour

// ============================================================
// Helper: set auth cookie securely
// SECURITY FIX 2: Tokens go into httpOnly cookies, not URLs.
// ============================================================
function setAuthCookie(res: Response, token: string) {
  res.cookie('authToken', token, {
    httpOnly: true,          // JS cannot read this cookie — prevents XSS token theft
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax',         // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
  });
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

  // ============================================================
  // GOOGLE OAUTH ROUTES
  // ============================================================
  app.get('/api/auth/google', (req, res) => {
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
      }

      const token = generateToken(user.id);

      // SECURITY FIX 2: Set token as httpOnly cookie, NOT in URL
      setAuthCookie(res, token);
      res.redirect('/?loginSuccess=true');
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
        return res.status(400).json({ message: "User already exists with this email" });
      }

      const hashedPassword = await hashPassword(validatedData.password);

      // SECURITY FIX 5: Use expiring verification token
      const verificationToken = generateExpiringVerificationToken();

      const { confirmPassword, ...userData } = validatedData;
      const user = await storage.createUser({ ...userData, password: hashedPassword });

      await storage.updateUser(user.id, { emailVerificationToken: verificationToken } as any);

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

      const user = await storage.getUserByEmail(validatedData.email);
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

      const token = generateToken(user.id);

      // SECURITY FIX 2: Set as httpOnly cookie
      setAuthCookie(res, token);

      res.json({
        message: "Login successful",
        user: { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified }
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

      const user = await storage.getUserByVerificationToken(token);
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
        profileCompletionStatus: user.profileCompletionStatus,
        healthUpdateLastModified: user.healthUpdateLastModified
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user profile" });
    }
  });

  app.put("/api/auth/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validatedData = updateProfileSchema.parse(req.body);
      let updatedUser = await storage.updateUser(req.user!.id, validatedData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
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
          profileCompletionStatus: updatedUser.profileCompletionStatus,
          healthUpdateLastModified: updatedUser.healthUpdateLastModified,
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

      const healthUpdateData = healthUpdateSchema.parse(req.body);
      const mergedForStatus = {
        ...existing,
        healthUpdateText: healthUpdateData.healthUpdateText,
        healthDocumentUrls:
          healthUpdateData.healthDocumentUrls ?? existing.healthDocumentUrls ?? [],
      };
      const profileCompletionStatus = computeProfileCompletionStatus(mergedForStatus);

      const updatedUser = await storage.updateUserHealthData(userId, {
        healthUpdateText: healthUpdateData.healthUpdateText,
        healthDocumentUrls: healthUpdateData.healthDocumentUrls || [],
        profileCompletionStatus,
        healthUpdateLastModified: new Date().toISOString()
      });

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
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

      const authToken = generateToken(user.id);

      // SECURITY FIX 2: Cookie not URL
      setAuthCookie(res, authToken);

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
      const classTypes = await storage.getAllClassTypes();
      res.json(classTypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch class types" });
    }
  });

  app.get("/api/class-types/:id", async (req, res) => {
    try {
      const classType = await storage.getClassType(req.params.id);
      if (!classType) {
        return res.status(404).json({ message: "Class type not found" });
      }
      res.json(classType);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch class type" });
    }
  });

  // SECURITY FIX 3: requireAdminAuth added
  app.post("/api/class-types", requireAdminAuth, async (req, res) => {
    try {
      const validatedData = insertClassTypeSchema.parse(req.body);
      const classType = await storage.createClassType(validatedData);
      res.status(201).json(classType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create class type" });
    }
  });

  // ============================================================
  // INSTRUCTORS
  // ============================================================
  app.get("/api/instructors", async (req, res) => {
    try {
      const instructors = await storage.getAllInstructors();
      res.json(instructors);
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
      res.json(instructor);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch instructor" });
    }
  });

  // SECURITY FIX 3: requireAdminAuth added
  app.post("/api/instructors", requireAdminAuth, async (req, res) => {
    try {
      const validatedData = insertInstructorSchema.parse(req.body);
      const instructor = await storage.createInstructor(validatedData);
      res.status(201).json(instructor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create instructor" });
    }
  });

  // ============================================================
  // CLASSES
  // ============================================================
  app.get("/api/classes", async (req, res) => {
    try {
      const { date } = req.query;

      if (date && typeof date === 'string') {
        const filterDate = new Date(date);
        if (isNaN(filterDate.getTime())) {
          return res.status(400).json({ message: "Invalid date format" });
        }
        const classes = await storage.getClassesByDate(filterDate);
        const enrichedClasses = await Promise.all(
          classes.map(async (cls) => {
            const classType = await storage.getClassType(cls.classTypeId);
            const instructor = await storage.getInstructor(cls.instructorId);
            return { ...cls, classType, instructor };
          })
        );
        res.json(enrichedClasses);
      } else {
        const classes = await storage.getAllClasses();
        const enrichedClasses = await Promise.all(
          classes.map(async (cls) => {
            const classType = await storage.getClassType(cls.classTypeId);
            const instructor = await storage.getInstructor(cls.instructorId);
            return { ...cls, classType, instructor };
          })
        );
        res.json(enrichedClasses);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  app.get("/api/classes/:id", async (req, res) => {
    try {
      const cls = await storage.getClass(req.params.id);
      if (!cls) {
        return res.status(404).json({ message: "Class not found" });
      }
      const classType = await storage.getClassType(cls.classTypeId);
      const instructor = await storage.getInstructor(cls.instructorId);
      res.json({ ...cls, classType, instructor });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch class" });
    }
  });

  // SECURITY FIX 3: requireAdminAuth added
  app.post("/api/classes", requireAdminAuth, async (req, res) => {
    try {
      const validatedData = insertClassSchema.parse(req.body);
      const cls = await storage.createClass(validatedData);
      res.status(201).json(cls);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create class" });
    }
  });

  // Weekly schedule (public read)
  app.get("/api/schedule/week", async (req, res) => {
    try {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());

      const weekSchedule = [];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      for (let i = 0; i < 7; i++) {
        const currentDay = new Date(startOfWeek);
        currentDay.setDate(startOfWeek.getDate() + i);

        const dayClasses = await storage.getClassesByDate(currentDay);
        const enrichedClasses = await Promise.all(
          dayClasses.map(async (cls) => {
            const classType = await storage.getClassType(cls.classTypeId);
            const instructor = await storage.getInstructor(cls.instructorId);
            return { ...cls, classType, instructor };
          })
        );

        if (enrichedClasses.length > 0) {
          weekSchedule.push({
            day: dayNames[i],
            date: currentDay,
            classes: enrichedClasses.sort((a, b) => a.date.getTime() - b.date.getTime())
          });
        }
      }

      res.json(weekSchedule);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weekly schedule" });
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
      const bookings = await storage.getAllBookings();
      res.json(bookings);
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

  app.get("/api/bookings/:id", requireAuth, async (req: any, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      // SECURITY: Users can only see their own bookings
      if (booking.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  app.post("/api/bookings", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!isAccountProfileComplete(user)) {
        return res.status(409).json({
          message:
            "Your profile is incomplete. Add your name, verified email, primary and emergency mobiles, and your health update in My Account before booking.",
          requiresHealthUpdate: true,
          redirectTo: "/my-account",
          code: "profile_incomplete"
        });
      }

      const cls = await storage.getClass(validatedData.classId);
      if (!cls) {
        return res.status(404).json({ message: "Class not found" });
      }

      if (cls.currentBookings >= cls.maxCapacity) {
        return res.status(400).json({ message: "Class is fully booked" });
      }

      const booking = await storage.createBooking({
        userId: req.user!.id,
        classId: validatedData.classId
      });

      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create booking" });
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
      const resetExpiry = new Date(Date.now() + 3600000); // 1 hour
      await storage.updateUserResetToken(existingUser.id, resetToken, resetExpiry);

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

      const user = await storage.findUserByResetToken(token);
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
  app.post("/api/admin/auth/login", authRateLimit, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const admin = await verifyAdminCredentials(email, password);
      if (!admin) {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }

      const token = generateAdminToken(admin.id);
      res.json({
        message: "Admin login successful",
        token,
        admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role }
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ message: "Admin login failed" });
    }
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
      const usersWithCompleteness = await storage.getUsersWithCompleteness();
      res.json({
        users: usersWithCompleteness,
        totalUsers: usersWithCompleteness.length,
        completeProfiles: usersWithCompleteness.filter((u: any) => u.completeness.isComplete).length,
        incompleteProfiles: usersWithCompleteness.filter((u: any) => !u.completeness.isComplete).length
      });
    } catch (error) {
      console.error('Admin get users error:', error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // ============================================================
  // OBJECT STORAGE — health documents (gated; see ENABLE_HEALTH_DOCUMENT_OBJECT_ROUTES)
  // ============================================================
  if (ENABLE_HEALTH_DOCUMENT_OBJECT_ROUTES) {
    const { ObjectStorageService, ObjectNotFoundError } = await import(
      "./objectStorage"
    );

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
      const userId = req.user?.id;
      const objectStorageService = new ObjectStorageService();

      try {
        await objectStorageService.serveObjectEntity(req.path, userId, res);
      } catch (error) {
        console.error("Error accessing document:", error);
        if (error instanceof ObjectNotFoundError) {
          return res.status(404).json({ error: "Document not found" });
        }
        return res.status(500).json({ error: "Internal server error" });
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
  return httpServer;
}
