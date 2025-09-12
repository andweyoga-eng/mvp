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
  users,
  classTypes,
  instructors,
  classes,
  bookings,
  contactMessages
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpdateProfile>): Promise<User | undefined>;
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private classTypes: Map<string, ClassType>;
  private instructors: Map<string, Instructor>;
  private classes: Map<string, Class>;
  private bookings: Map<string, Booking>;
  private contactMessages: Map<string, ContactMessage>;

  constructor() {
    this.users = new Map();
    this.classTypes = new Map();
    this.instructors = new Map();
    this.classes = new Map();
    this.bookings = new Map();
    this.contactMessages = new Map();
    
    this.initializeData();
  }

  private initializeData() {
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

    classTypesData.forEach(data => {
      const id = randomUUID();
      this.classTypes.set(id, { ...data, id, imageUrl: data.imageUrl || null });
    });

    // Initialize instructors
    const instructorsData: InsertInstructor[] = [
      {
        name: "Sarah Johnson",
        bio: "Certified yoga instructor with 8 years of experience specializing in Hatha Yoga and traditional practices.",
        imageUrl: "https://images.unsplash.com/photo-1494790108755-2616c78ec4e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
        specialties: ["Hatha Yoga"]
      },
      {
        name: "Michael Chen",
        bio: "Dynamic fitness instructor passionate about hybrid training, combining yoga with various athletic disciplines.",
        imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
        specialties: ["Hyyocross"]
      },
      {
        name: "David Kumar",
        bio: "Meditation teacher and mindfulness coach with a focus on stress relief and mental wellness through contemplative practices.",
        imageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
        specialties: ["Meditation"]
      },
      {
        name: "Lisa Rodriguez",
        bio: "Sound therapy specialist and certified practitioner in vibrational healing using singing bowls and therapeutic instruments.",
        imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
        specialties: ["Sound Therapy"]
      }
    ];

    instructorsData.forEach(data => {
      const id = randomUUID();
      this.instructors.set(id, { 
        ...data, 
        id, 
        imageUrl: data.imageUrl || null,
        bio: data.bio || null,
        specialties: data.specialties || null
      });
    });

    // Initialize some sample classes for the current week
    this.initializeWeeklyClasses();
  }

  private initializeWeeklyClasses() {
    const instructorIds = Array.from(this.instructors.keys());
    const classTypeIds = Array.from(this.classTypes.keys());
    
    // Create classes for this week
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
    
    const weeklySchedule = [
      // Monday
      { day: 1, time: "09:00", classTypeIndex: 0, instructorIndex: 0 }, // Hatha Yoga with Sarah
      { day: 1, time: "18:30", classTypeIndex: 1, instructorIndex: 1 }, // Hyyocross with Michael
      
      // Tuesday  
      { day: 2, time: "07:00", classTypeIndex: 1, instructorIndex: 1 }, // Hyyocross with Michael
      { day: 2, time: "19:00", classTypeIndex: 2, instructorIndex: 2 }, // Meditation with David
      
      // Wednesday
      { day: 3, time: "10:00", classTypeIndex: 0, instructorIndex: 0 }, // Hatha Yoga with Sarah
      { day: 3, time: "17:30", classTypeIndex: 3, instructorIndex: 3 }, // Sound Therapy with Lisa
      
      // Thursday
      { day: 4, time: "08:00", classTypeIndex: 2, instructorIndex: 2 }, // Meditation with David
      { day: 4, time: "19:30", classTypeIndex: 0, instructorIndex: 0 }, // Hatha Yoga with Sarah
      
      // Friday
      { day: 5, time: "09:30", classTypeIndex: 1, instructorIndex: 1 }, // Hyyocross with Michael
      { day: 5, time: "18:00", classTypeIndex: 3, instructorIndex: 3 }, // Sound Therapy with Lisa
      
      // Saturday
      { day: 6, time: "10:00", classTypeIndex: 3, instructorIndex: 3 }, // Sound Therapy with Lisa
      { day: 6, time: "16:00", classTypeIndex: 2, instructorIndex: 2 }, // Meditation with David
      
      // Sunday
      { day: 0, time: "11:00", classTypeIndex: 0, instructorIndex: 0 }, // Hatha Yoga with Sarah
      { day: 0, time: "17:00", classTypeIndex: 1, instructorIndex: 1 }, // Hyyocross with Michael
    ];

    weeklySchedule.forEach(schedule => {
      const classDate = new Date(startOfWeek);
      classDate.setDate(startOfWeek.getDate() + schedule.day);
      
      const [hours, minutes] = schedule.time.split(':');
      classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const classData: InsertClass = {
        classTypeId: classTypeIds[schedule.classTypeIndex],
        instructorId: instructorIds[schedule.instructorIndex],
        date: classDate,
        maxCapacity: 20,
      };
      
      const id = randomUUID();
      this.classes.set(id, { 
        ...classData, 
        id, 
        currentBookings: Math.floor(Math.random() * 10),
        maxCapacity: classData.maxCapacity || 20
      });
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async updateUser(id: string, updates: Partial<UpdateProfile>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, ...updates, updatedAt: new Date() };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async verifyUserEmail(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, emailVerified: true, emailVerificationToken: null, updatedAt: new Date() };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.emailVerificationToken === token);
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    return this.getUserByEmail(email);
  }

  async updateUserResetToken(id: string, token: string, expiry: Date): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = {
      ...user,
      resetToken: token,
      resetTokenExpiry: expiry,
      updatedAt: new Date(),
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async findUserByResetToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.resetToken === token);
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = {
      ...user,
      password: hashedPassword,
      updatedAt: new Date(),
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async clearUserResetToken(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = {
      ...user,
      resetToken: null,
      resetTokenExpiry: null,
      updatedAt: new Date(),
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      emailVerified: false,
      emailVerificationToken: null,
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: now,
      updatedAt: now,
      primaryMobileCountryCode: insertUser.primaryMobileCountryCode || "+91",
      secondaryMobile: insertUser.secondaryMobile || null,
      secondaryMobileCountryCode: insertUser.secondaryMobileCountryCode || null,
      emergencyMobileCountryCode: insertUser.emergencyMobileCountryCode || "+91"
    };
    this.users.set(id, user);
    return user;
  }

  // Class Types
  async getAllClassTypes(): Promise<ClassType[]> {
    return Array.from(this.classTypes.values());
  }

  async getClassType(id: string): Promise<ClassType | undefined> {
    return this.classTypes.get(id);
  }

  async createClassType(classType: InsertClassType): Promise<ClassType> {
    const id = randomUUID();
    const newClassType: ClassType = { ...classType, id, imageUrl: classType.imageUrl || null };
    this.classTypes.set(id, newClassType);
    return newClassType;
  }

  // Instructors
  async getAllInstructors(): Promise<Instructor[]> {
    return Array.from(this.instructors.values());
  }

  async getInstructor(id: string): Promise<Instructor | undefined> {
    return this.instructors.get(id);
  }

  async createInstructor(instructor: InsertInstructor): Promise<Instructor> {
    const id = randomUUID();
    const newInstructor: Instructor = { 
      ...instructor, 
      id,
      imageUrl: instructor.imageUrl || null,
      bio: instructor.bio || null,
      specialties: instructor.specialties || null
    };
    this.instructors.set(id, newInstructor);
    return newInstructor;
  }

  // Classes
  async getAllClasses(): Promise<Class[]> {
    return Array.from(this.classes.values());
  }

  async getClass(id: string): Promise<Class | undefined> {
    return this.classes.get(id);
  }

  async getClassesByDate(date: Date): Promise<Class[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Array.from(this.classes.values()).filter(
      cls => cls.date >= startOfDay && cls.date <= endOfDay
    );
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const id = randomUUID();
    const newClass: Class = { 
      ...classData, 
      id, 
      currentBookings: 0,
      maxCapacity: classData.maxCapacity || 20
    };
    this.classes.set(id, newClass);
    return newClass;
  }

  async updateClassBookingCount(id: string, count: number): Promise<Class | undefined> {
    const cls = this.classes.get(id);
    if (cls) {
      cls.currentBookings = count;
      this.classes.set(id, cls);
      return cls;
    }
    return undefined;
  }

  // Bookings
  async getAllBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingsByClass(classId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(booking => booking.classId === classId);
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const newBooking: Booking = { 
      ...booking, 
      id, 
      createdAt: new Date()
    };
    this.bookings.set(id, newBooking);

    // Update class booking count
    const classBookings = await this.getBookingsByClass(booking.classId);
    await this.updateClassBookingCount(booking.classId, classBookings.length);

    return newBooking;
  }

  // Contact Messages
  async getAllContactMessages(): Promise<ContactMessage[]> {
    return Array.from(this.contactMessages.values());
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const id = randomUUID();
    const newMessage: ContactMessage = { 
      ...message, 
      id, 
      createdAt: new Date(),
      phone: message.phone || null
    };
    this.contactMessages.set(id, newMessage);
    return newMessage;
  }
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
        { day: 1, time: "09:00", classTypeIndex: 0, instructorIndex: 0 }, // Hatha Yoga with Sarah
        { day: 1, time: "18:30", classTypeIndex: 1, instructorIndex: 1 }, // Hyyocross with Michael
        
        // Tuesday  
        { day: 2, time: "07:00", classTypeIndex: 1, instructorIndex: 1 }, // Hyyocross with Michael
        { day: 2, time: "19:00", classTypeIndex: 2, instructorIndex: 2 }, // Meditation with David
        
        // Wednesday
        { day: 3, time: "10:00", classTypeIndex: 0, instructorIndex: 0 }, // Hatha Yoga with Sarah
        { day: 3, time: "17:30", classTypeIndex: 3, instructorIndex: 3 }, // Sound Therapy with Lisa
        
        // Thursday
        { day: 4, time: "08:00", classTypeIndex: 2, instructorIndex: 2 }, // Meditation with David
        { day: 4, time: "19:30", classTypeIndex: 0, instructorIndex: 0 }, // Hatha Yoga with Sarah
        
        // Friday
        { day: 5, time: "09:30", classTypeIndex: 1, instructorIndex: 1 }, // Hyyocross with Michael
        { day: 5, time: "18:00", classTypeIndex: 3, instructorIndex: 3 }, // Sound Therapy with Lisa
        
        // Saturday
        { day: 6, time: "10:00", classTypeIndex: 3, instructorIndex: 3 }, // Sound Therapy with Lisa
        { day: 6, time: "16:00", classTypeIndex: 2, instructorIndex: 2 }, // Meditation with David
        
        // Sunday
        { day: 0, time: "11:00", classTypeIndex: 0, instructorIndex: 0 }, // Hatha Yoga with Sarah
        { day: 0, time: "17:00", classTypeIndex: 1, instructorIndex: 1 }, // Hyyocross with Michael
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
          maxCapacity: 20,
          currentBookings: Math.floor(Math.random() * 10)
        });
      });

      const insertedClasses = await db.insert(classes).values(classesData).returning();
      console.log(`[DB] Inserted ${insertedClasses.length} classes`);
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
}

export const storage = new DatabaseStorage();
