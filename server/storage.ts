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
  type ContactMessage,
  type InsertContactMessage,
  type AdminUser,
  type InsertAdminUser,
  users,
  classTypes,
  instructors,
  classes,
  bookings,
  contactMessages,
  adminUsers
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { computeProfileCompletionStatus, isAccountProfileComplete, getAccountProfileIncompleteReasons, MIN_HEALTH_UPDATE_CHARS } from "@shared/profileCompleteness";

// Profile completeness interface for admin console
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
  
  // Class Types
  getAllClassTypes(): Promise<ClassType[]>;
  getClassType(id: string): Promise<ClassType | undefined>;
  createClassType(classType: InsertClassType): Promise<ClassType>;
  
  // Instructors
  getAllInstructors(): Promise<Instructor[]>;
  getInstructor(id: string): Promise<Instructor | undefined>;
  createInstructor(instructor: InsertInstructor): Promise<Instructor>;
  
  // Classes
  getAllClasses(): Promise<Class[]>;
  getClass(id: string): Promise<Class | undefined>;
  getClassesByDate(date: Date): Promise<Class[]>;
  createClass(classData: InsertClass): Promise<Class>;
  updateClassBookingCount(id: string, count: number): Promise<Class | undefined>;
  
  // Bookings
  getAllBookings(): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingsByClass(classId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  
  // Contact Messages
  getAllContactMessages(): Promise<ContactMessage[]>;
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  
  // Admin Users
  getAdminByEmail(email: string): Promise<AdminUser | undefined>;
  getAdminById(id: string): Promise<AdminUser | undefined>;
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;
  verifyAdminCredentials(email: string, password: string): Promise<AdminUser | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersWithCompleteness(): Promise<(User & { completeness: ProfileCompleteness })[]>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize the database with seed data
    this.initializeData();
  }

  private async initializeData() {
    try {
      // Check if data already exists
      const existingClassTypes = await db.select().from(classTypes).limit(1);
      if (existingClassTypes.length > 0) {
        console.log('[DB] Database already initialized');
        return;
      }

      console.log('[DB] Initializing database with seed data...');

      // Initialize class types
      const classTypesData: InsertClassType[] = [
        {
          name: "Hatha Yoga",
          description: "Perfect for beginners, Hatha Yoga focuses on basic postures and breathing techniques. This gentle practice emphasizes alignment, flexibility, and mindfulness. Each pose is held for several breaths, allowing you to build strength and stability while learning proper form. Our certified instructors provide personalized guidance to ensure you feel comfortable and supported throughout your practice.",
          price: "500.00",
          duration: 60,
          imageUrl: "/attached_assets/hatha%20yoga_1756809174781.jpg"
        },
        {
          name: "Hyyocross",
          description: "A dynamic hybrid fitness experience combining yoga with cross-training elements including weights, aerobics, Zumba, and Bhangra. Yoga remains the foundation, but each class varies based on participant demographics and energy levels. This high-energy session builds strength, improves cardiovascular health, and enhances flexibility while keeping you engaged with diverse movement patterns.",
          price: "600.00",
          duration: 60,
          imageUrl: "/attached_assets/Hyyocross_1756809174781.jpg"
        },
        {
          name: "Meditation",
          description: "Find inner peace and mental clarity through guided meditation practices. These sessions focus on various techniques including mindfulness, breathwork, and visualization to reduce stress and enhance emotional well-being. Whether you're a beginner or experienced meditator, our tranquil environment and expert guidance will help you develop a deeper connection with yourself.",
          price: "400.00",
          duration: 45,
          imageUrl: "/attached_assets/meditation_1756809174781.jpg"
        },
        {
          name: "Sound Therapy",
          description: "Experience the healing power of sound through therapeutic vibrations using singing bowls, gongs, and crystal instruments. These sessions promote deep relaxation, stress recovery, and emotional healing. The resonant frequencies help balance your energy centers and create a meditative state that supports overall wellness and mental clarity.",
          price: "800.00",
          duration: 60,
          imageUrl: "/attached_assets/soundtherapy_1756809174781.jpg"
        }
      ];

      const insertedClassTypes = await db.insert(classTypes).values(classTypesData).returning();
      console.log(`[DB] Inserted ${insertedClassTypes.length} class types`);

      // Initialize instructors
      const instructorsData: InsertInstructor[] = [
        {
          name: "Sarah Johnson",
          bio: "Sarah has been practicing yoga for over 15 years and teaching for 8 years. She specializes in Hatha and restorative yoga, with a focus on alignment and mindfulness. Sarah believes yoga is for everyone and creates an inclusive, welcoming environment for all students.",
          imageUrl: "/attached_assets/instructor_sarah_1756809174781.jpg",
          specialties: ["Hatha Yoga", "Meditation", "Mindfulness"]
        },
        {
          name: "Michael Chen",
          bio: "Michael brings high energy and creativity to his Hyyocross classes. With a background in fitness training and yoga instruction, he seamlessly blends strength training with yoga philosophy. His classes are challenging yet accessible, designed to build both physical and mental resilience.",
          imageUrl: "/attached_assets/instructor_michael_1756809174781.jpg",
          specialties: ["Hyyocross", "Strength Training", "Vinyasa"]
        },
        {
          name: "David Kumar",
          bio: "David is a certified meditation instructor with 12 years of experience in various contemplative practices. He guides students through mindfulness meditation, breathwork, and stress reduction techniques. His calm presence and gentle guidance help students find peace and clarity.",
          imageUrl: "/attached_assets/instructor_david_1756809174781.jpg",
          specialties: ["Meditation", "Breathwork", "Stress Relief"]
        },
        {
          name: "Lisa Thompson",
          bio: "Lisa is a sound therapy practitioner and certified yoga instructor. She combines her knowledge of vibrational healing with yoga philosophy to create transformative experiences. Her sessions incorporate singing bowls, crystal instruments, and guided meditation for deep healing and relaxation.",
          imageUrl: "/attached_assets/instructor_lisa_1756809174781.jpg",
          specialties: ["Sound Therapy", "Vibrational Healing", "Meditation"]
        }
      ];

      const insertedInstructors = await db.insert(instructors).values(instructorsData).returning();
      console.log(`[DB] Inserted ${insertedInstructors.length} instructors`);

      // Create classes for the current week
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const weeklySchedule = [
        // Monday
        { day: 1, time: "09:00", classTypeIndex: 0, instructorIndex: 0 },
        { day: 1, time: "18:30", classTypeIndex: 1, instructorIndex: 1 },
        // Tuesday  
        { day: 2, time: "07:00", classTypeIndex: 1, instructorIndex: 1 },
        { day: 2, time: "19:00", classTypeIndex: 2, instructorIndex: 2 },
        // Wednesday
        { day: 3, time: "10:00", classTypeIndex: 0, instructorIndex: 0 },
        { day: 3, time: "17:30", classTypeIndex: 3, instructorIndex: 3 },
        // Thursday
        { day: 4, time: "08:00", classTypeIndex: 2, instructorIndex: 2 },
        { day: 4, time: "19:30", classTypeIndex: 0, instructorIndex: 0 },
        // Friday
        { day: 5, time: "09:30", classTypeIndex: 1, instructorIndex: 1 },
        { day: 5, time: "18:00", classTypeIndex: 3, instructorIndex: 3 },
        // Saturday
        { day: 6, time: "10:00", classTypeIndex: 3, instructorIndex: 3 },
        { day: 6, time: "16:00", classTypeIndex: 2, instructorIndex: 2 },
        // Sunday
        { day: 0, time: "11:00", classTypeIndex: 0, instructorIndex: 0 },
        { day: 0, time: "17:00", classTypeIndex: 1, instructorIndex: 1 },
      ];

      const classesData: InsertClass[] = [];
      weeklySchedule.forEach(schedule => {
        const classDate = new Date(startOfWeek);
        classDate.setDate(startOfWeek.getDate() + schedule.day);
        
        const [hours, minutes] = schedule.time.split(':');
        classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        classesData.push({
          classTypeId: insertedClassTypes[schedule.classTypeIndex].id,
          instructorId: insertedInstructors[schedule.instructorIndex].id,
          date: classDate,
          maxCapacity: 20
        });
      });

      const insertedClasses = await db.insert(classes).values(classesData).returning();
      console.log(`[DB] Inserted ${insertedClasses.length} classes`);

      // Initialize admin users
      const existingAdmins = await db.select().from(adminUsers).limit(1);
      if (existingAdmins.length === 0) {
        const adminData: InsertAdminUser = {
          email: "admin@andweyoga.com",
          name: "System Administrator",
          role: "super_admin"
        };
        
        const [insertedAdmin] = await db.insert(adminUsers).values(adminData).returning();
        console.log(`[DB] Created default admin user: ${insertedAdmin.email}`);
      }
      
      console.log('[DB] Database initialization complete');
    } catch (error) {
      console.error('[DB] Error initializing database:', error);
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

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Normalize email before storing
      const normalizedUser = {
        ...insertUser,
        email: insertUser.email.trim().toLowerCase()
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
    profileCompletionStatus: string;
    healthUpdateLastModified: string;
  }): Promise<User | undefined> {
    try {
      const [user] = await db.update(users)
        .set({ 
          healthUpdateText: healthData.healthUpdateText,
          healthDocumentUrls: healthData.healthDocumentUrls,
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
      return await db.select().from(classTypes);
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

  // Instructors
  async getAllInstructors(): Promise<Instructor[]> {
    try {
      return await db.select().from(instructors);
    } catch (error) {
      console.error('[DB] Error getting instructors:', error);
      return [];
    }
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
      const [newInstructor] = await db.insert(instructors).values(instructor).returning();
      return newInstructor;
    } catch (error) {
      console.error('[DB] Error creating instructor:', error);
      throw error;
    }
  }

  // Classes
  async getAllClasses(): Promise<Class[]> {
    try {
      return await db.select().from(classes);
    } catch (error) {
      console.error('[DB] Error getting classes:', error);
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

      return await db.select().from(classes)
        .where(and(gte(classes.date, startOfDay), lte(classes.date, endOfDay)));
    } catch (error) {
      console.error('[DB] Error getting classes by date:', error);
      return [];
    }
  }

  async createClass(classData: InsertClass): Promise<Class> {
    try {
      const [newClass] = await db.insert(classes).values(classData).returning();
      return newClass;
    } catch (error) {
      console.error('[DB] Error creating class:', error);
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
      const [newBooking] = await db.insert(bookings).values(booking).returning();

      // Update class booking count
      const classBookings = await this.getBookingsByClass(booking.classId);
      await this.updateClassBookingCount(booking.classId, classBookings.length);

      return newBooking;
    } catch (error) {
      console.error('[DB] Error creating booking:', error);
      throw error;
    }
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

  // Admin Users Methods
  async getAdminByEmail(email: string): Promise<AdminUser | undefined> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const [admin] = await db.select().from(adminUsers).where(sql`LOWER(TRIM(${adminUsers.email})) = ${normalizedEmail}`);
      return admin || undefined;
    } catch (error) {
      console.error('[DB] Error getting admin by email:', error);
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

  async createAdminUser(admin: InsertAdminUser): Promise<AdminUser> {
    try {
      const [newAdmin] = await db.insert(adminUsers).values(admin).returning();
      return newAdmin;
    } catch (error) {
      console.error('[DB] Error creating admin user:', error);
      throw error;
    }
  }

  async verifyAdminCredentials(email: string, password: string): Promise<AdminUser | undefined> {
    try {
      // For now, we'll implement a simple check against admin users table
      // In production, you'd want to hash passwords for admins too
      const admin = await this.getAdminByEmail(email);
      if (admin && password === 'admin123') { // TODO: Implement proper password hashing for admins
        return admin;
      }
      return undefined;
    } catch (error) {
      console.error('[DB] Error verifying admin credentials:', error);
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

  // Profile completeness calculation helper
  private calculateProfileCompleteness(user: User): ProfileCompleteness {
    const healthUpdateComplete =
      (user.healthUpdateText ?? "").trim().length >= MIN_HEALTH_UPDATE_CHARS;
    const documentsComplete = user.healthDocumentUrls ? user.healthDocumentUrls.length > 0 : false;
    const emailVerified = user.emailVerified || false;

    const isComplete = isAccountProfileComplete(user);

    const checks = [isComplete, documentsComplete];
    const completedChecks = checks.filter(Boolean).length;
    const completionPercentage = Math.round((completedChecks / checks.length) * 100);

    const flags: string[] = [];
    if (!isComplete) {
      flags.push(...getAccountProfileIncompleteReasons(user));
    }
    if (!documentsComplete) flags.push("No health documents uploaded");

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