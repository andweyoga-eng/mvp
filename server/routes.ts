import type { Express } from "express";
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
import { hashPassword, verifyPassword, generateToken, generateVerificationToken, requireAuth, optionalAuth, type AuthRequest } from "./auth";
import { sendEmail, createVerificationEmailHTML, createPasswordResetEmailHTML } from "./email";
import { setupGoogleAuth, verifyGoogleToken } from "./googleAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Google OAuth Routes (redirect-based)
  app.get('/api/auth/google', (req, res) => {
    // Force HTTPS for OAuth callback
    const protocol = 'https'; // Force HTTPS for all environments
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${protocol}://${req.get('host')}/oauth2callback&` +
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
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code: code as string,
          grant_type: 'authorization_code',
          redirect_uri: `https://${req.get('host')}/oauth2callback`,
        }),
      });

      const tokens = await tokenResponse.json();
      
      if (!tokens.access_token) {
        throw new Error('Failed to get access token');
      }

      // Get user info from Google
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      const googleUser = await userResponse.json();
      
      if (!googleUser.email) {
        throw new Error('Failed to get user email');
      }

      // Check if user exists
      let user = await storage.getUserByEmail(googleUser.email);
      
      if (!user) {
        // Create new user
        const userData = {
          name: googleUser.name || googleUser.email.split('@')[0],
          email: googleUser.email,
          password: '', // OAuth users don't need password
          primaryMobile: null,
          primaryMobileCountryCode: '+91',
          secondaryMobile: null,
          secondaryMobileCountryCode: '+91',
          emergencyMobile: null,
          emergencyMobileCountryCode: '+91',
        };
        user = await storage.createUser(userData);
        // Mark email as verified for Google users
        await storage.verifyUserEmail(user.id);
      }

      // Generate JWT token
      const token = generateToken(user.id);
      
      // Redirect to home with token
      res.redirect(`/?token=${token}&loginSuccess=true`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect('/?error=google_auth_failed');
    }
  });

  // Setup Google OAuth (existing token verification)
  setupGoogleAuth(app);
  
  // Authentication Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(validatedData.password);
      
      // Generate verification token
      const verificationToken = generateVerificationToken();
      
      // Create user
      const { confirmPassword, ...userData } = validatedData;
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Set verification token
      await storage.updateUser(user.id, { emailVerificationToken: verificationToken } as any);
      
      // Send verification email
      const logoUrl = `${req.protocol}://${req.get('host')}/attached_assets/Logo%20Transperent%20TM_1756454893432.png`;
      const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email?token=${verificationToken}`;
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
  
  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginUserSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Verify password
      const isValidPassword = await verifyPassword(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check if email is verified
      if (!user.emailVerified) {
        return res.status(401).json({ message: "Please verify your email before logging in" });
      }
      
      // Generate JWT token
      const token = generateToken(user.id);
      
      res.json({ 
        message: "Login successful",
        token,
        user: { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to login" });
    }
  });
  
  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Invalid verification token" });
      }
      
      // Find user by verification token
      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }
      
      // Verify email
      await storage.verifyUserEmail(user.id);
      
      res.redirect(`/?verified=true`);
    } catch (error) {
      res.status(500).json({ message: "Failed to verify email" });
    }
  });
  
  app.get("/api/auth/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
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
        emergencyMobileCountryCode: user.emergencyMobileCountryCode
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user profile" });
    }
  });
  
  app.put("/api/auth/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validatedData = updateProfileSchema.parse(req.body);
      
      const updatedUser = await storage.updateUser(req.user!.id, validatedData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ 
        message: "Profile updated successfully",
        user: { 
          id: updatedUser.id, 
          email: updatedUser.email, 
          name: updatedUser.name,
          primaryMobile: updatedUser.primaryMobile,
          primaryMobileCountryCode: updatedUser.primaryMobileCountryCode,
          secondaryMobile: updatedUser.secondaryMobile,
          secondaryMobileCountryCode: updatedUser.secondaryMobileCountryCode,
          emergencyMobile: updatedUser.emergencyMobile,
          emergencyMobileCountryCode: updatedUser.emergencyMobileCountryCode,
          healthUpdateText: updatedUser.healthUpdateText,
          healthDocumentUrls: updatedUser.healthDocumentUrls,
          profileCompletionStatus: updatedUser.profileCompletionStatus
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Health update route - critical for mandatory health data collection
  app.patch("/api/users/:id/health-update", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.params.id;
      
      // Ensure user can only update their own health data
      if (userId !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden: Cannot update another user\'s health data' });
      }
      
      // Validate health update data with Zod schema
      const healthUpdateData = healthUpdateSchema.parse(req.body);
      
      // Calculate profile completion status - unified logic with booking validation
      const isHealthComplete = healthUpdateData.healthUpdateText.trim().length >= 10;
      const profileCompletionStatus = isHealthComplete ? 'complete' : 'incomplete';
      
      // Use dedicated health data persistence method
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

  // Google OAuth token verification endpoint
  app.post("/api/auth/google-signin", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Google token is required" });
      }
      
      // Verify Google token
      const payload = await verifyGoogleToken(token);
      if (!payload || !payload.email) {
        return res.status(401).json({ message: "Invalid Google token" });
      }
      
      // Check if user exists
      let user = await storage.getUserByEmail(payload.email);
      
      if (!user) {
        // Create new user from Google profile
        const userData = {
          email: payload.email,
          name: payload.name || '',
          password: '', // No password needed for OAuth users
          primaryMobile: '', // Will need to be filled later
          emergencyMobile: '', // Will need to be filled later
          primaryMobileCountryCode: '+91',
          emergencyMobileCountryCode: '+91',
          secondaryMobile: null,
          secondaryMobileCountryCode: null,
        };
        
        user = await storage.createUser(userData);
        // Mark email as verified since it comes from Google
        await storage.verifyUserEmail(user.id);
      }
      
      // Generate JWT token
      const authToken = generateToken(user.id);
      
      res.json({ 
        message: "Google sign-in successful",
        token: authToken,
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
  // Class Types
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

  app.post("/api/class-types", async (req, res) => {
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

  // Instructors
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

  app.post("/api/instructors", async (req, res) => {
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

  // Classes
  app.get("/api/classes", async (req, res) => {
    try {
      const { date } = req.query;
      
      if (date && typeof date === 'string') {
        const filterDate = new Date(date);
        const classes = await storage.getClassesByDate(filterDate);
        
        // Enrich with class type and instructor data
        const enrichedClasses = await Promise.all(
          classes.map(async (cls) => {
            const classType = await storage.getClassType(cls.classTypeId);
            const instructor = await storage.getInstructor(cls.instructorId);
            return {
              ...cls,
              classType,
              instructor
            };
          })
        );
        
        res.json(enrichedClasses);
      } else {
        const classes = await storage.getAllClasses();
        
        // Enrich with class type and instructor data
        const enrichedClasses = await Promise.all(
          classes.map(async (cls) => {
            const classType = await storage.getClassType(cls.classTypeId);
            const instructor = await storage.getInstructor(cls.instructorId);
            return {
              ...cls,
              classType,
              instructor
            };
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
      
      res.json({
        ...cls,
        classType,
        instructor
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch class" });
    }
  });

  app.post("/api/classes", async (req, res) => {
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

  // Weekly schedule endpoint
  app.get("/api/schedule/week", async (req, res) => {
    try {
      // Get current week's classes
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
      
      const weekSchedule = [];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      for (let i = 0; i < 7; i++) {
        const currentDay = new Date(startOfWeek);
        currentDay.setDate(startOfWeek.getDate() + i);
        
        const dayClasses = await storage.getClassesByDate(currentDay);
        
        // Enrich with class type and instructor data
        const enrichedClasses = await Promise.all(
          dayClasses.map(async (cls) => {
            const classType = await storage.getClassType(cls.classTypeId);
            const instructor = await storage.getInstructor(cls.instructorId);
            return {
              ...cls,
              classType,
              instructor
            };
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

  // Bookings
  app.get("/api/bookings", async (req, res) => {
    try {
      const bookings = await storage.getAllBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/:id", async (req, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  app.post("/api/bookings", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      
      // CRITICAL: Enforce mandatory health profile completion before booking
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Canonical completeness check - compute from actual data, not stored status
      const isHealthComplete = user.healthUpdateText && user.healthUpdateText.trim().length >= 10;
      
      if (!isHealthComplete) {
        return res.status(409).json({ 
          message: "Health profile required: Please complete your health update in My Account before booking sessions.",
          requiresHealthUpdate: true,
          redirectTo: "/my-account?tab=health",
          code: "profile_incomplete"
        });
      }
      
      // Check if class exists and has capacity
      const cls = await storage.getClass(validatedData.classId);
      if (!cls) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      if (cls.currentBookings >= cls.maxCapacity) {
        return res.status(400).json({ message: "Class is fully booked" });
      }
      
      // Create booking with authenticated user's ID
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

  // Contact Messages
  app.get("/api/contact-messages", async (req, res) => {
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

  // Forgot Password Route
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).send('Email is required');
      }

      // Find user by email
      const existingUser = await storage.findUserByEmail(email);
      if (!existingUser) {
        return res.status(404).json({ message: 'No account found with this email address. Please check your email or register for a new account.' });
      }

      // Generate password reset token
      const resetToken = generateVerificationToken();
      const resetExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Save reset token to user
      await storage.updateUserResetToken(existingUser.id, resetToken, resetExpiry);

      // Send password reset email using Gmail SMTP
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
      
      const emailSent = await sendEmail({
        to: email,
        subject: "Reset Your andWeYoga Password",
        html: createPasswordResetEmailHTML(resetUrl, existingUser.name),
        from: `"andWeYoga" <mudit@andweyoga.com>`
      });

      if (!emailSent) {
        return res.status(500).send('Failed to send password reset email');
      }

      res.status(200).json({ message: 'Password reset link has been sent to your email address.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).send('Server error');
    }
  });

  // Reset Password Route
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).send('Token and password are required');
      }

      // Find user by reset token
      const user = await storage.findUserByResetToken(token);
      if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        return res.status(400).send('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await hashPassword(password);

      // Update user password and clear reset token
      await storage.updateUserPassword(user.id, hashedPassword);
      await storage.clearUserResetToken(user.id);

      res.status(200).send('Password reset successfully');
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).send('Server error');
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
