// In-memory storage implementation
import type { ClassType, Instructor, YogaClass, User, Booking, InsertClassType, InsertInstructor, InsertYogaClass, InsertUser, InsertBooking } from '@shared/schema';

interface ScheduleDay {
  day: string;
  date: Date;
  classes: Array<{
    id: string;
    date: Date;
    classType: ClassType;
    instructor: Instructor;
    currentBookings: number;
    maxCapacity: number;
  }>;
}

export interface IStorage {
  // Class Types
  getAllClassTypes(): Promise<ClassType[]>;
  getClassTypeById(id: string): Promise<ClassType | null>;
  createClassType(classType: InsertClassType): Promise<ClassType>;

  // Instructors
  getAllInstructors(): Promise<Instructor[]>;
  getInstructorById(id: string): Promise<Instructor | null>;
  createInstructor(instructor: InsertInstructor): Promise<Instructor>;

  // Yoga Classes
  getAllYogaClasses(): Promise<YogaClass[]>;
  getYogaClassById(id: string): Promise<YogaClass | null>;
  createYogaClass(yogaClass: InsertYogaClass): Promise<YogaClass>;
  getWeeklySchedule(): Promise<ScheduleDay[]>;

  // Users
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(user: InsertUser): Promise<User>;

  // Bookings
  getBookingsByUserId(userId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private classTypes: ClassType[] = [];
  private instructors: Instructor[] = [];
  private yogaClasses: YogaClass[] = [];
  private users: User[] = [];
  private bookings: Booking[] = [];

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Initialize with sample data
    const classTypesData = [
      { id: '1', name: 'Hatha Yoga', description: 'Perfect for beginners, Hatha Yoga focuses on basic postures and breathing techniques.', duration: 60, price: 500, createdAt: new Date() },
      { id: '2', name: 'Hyyocross', description: 'A dynamic hybrid fitness experience combining yoga with cross-training elements.', duration: 60, price: 600, createdAt: new Date() },
      { id: '3', name: 'Meditation', description: 'Find inner peace and mental clarity through guided meditation practices.', duration: 45, price: 400, createdAt: new Date() },
      { id: '4', name: 'Sound Therapy', description: 'Experience the healing power of sound through therapeutic vibrations.', duration: 60, price: 800, createdAt: new Date() }
    ];

    const instructorsData = [
      { id: '1', name: 'Priya Sharma', bio: 'Certified yoga instructor with 10+ years experience', createdAt: new Date() },
      { id: '2', name: 'Ankit Patel', bio: 'Meditation and mindfulness expert', createdAt: new Date() },
      { id: '3', name: 'Meera Singh', bio: 'Sound therapy specialist', createdAt: new Date() }
    ];

    this.classTypes = classTypesData;
    this.instructors = instructorsData;

    // Create weekly schedule
    this.createWeeklyClasses();
  }

  private createWeeklyClasses() {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const classDate = new Date(startOfWeek);
      classDate.setDate(startOfWeek.getDate() + dayOffset);

      // Morning classes
      const morningClass = new Date(classDate);
      morningClass.setHours(8, 0, 0, 0);

      // Evening classes
      const eveningClass = new Date(classDate);
      eveningClass.setHours(18, 30, 0, 0);

      this.yogaClasses.push(
        {
          id: `class-${dayOffset}-morning`,
          classTypeId: this.classTypes[dayOffset % this.classTypes.length].id,
          instructorId: this.instructors[dayOffset % this.instructors.length].id,
          date: morningClass,
          maxCapacity: 15,
          currentBookings: Math.floor(Math.random() * 10),
          createdAt: new Date()
        },
        {
          id: `class-${dayOffset}-evening`,
          classTypeId: this.classTypes[(dayOffset + 1) % this.classTypes.length].id,
          instructorId: this.instructors[(dayOffset + 1) % this.instructors.length].id,
          date: eveningClass,
          maxCapacity: 15,
          currentBookings: Math.floor(Math.random() * 12),
          createdAt: new Date()
        }
      );
    }
  }

  // Class Types
  async getAllClassTypes(): Promise<ClassType[]> {
    return this.classTypes;
  }

  async getClassTypeById(id: string): Promise<ClassType | null> {
    return this.classTypes.find(ct => ct.id === id) || null;
  }

  async createClassType(classType: InsertClassType): Promise<ClassType> {
    const newClassType: ClassType = {
      id: Math.random().toString(36).substr(2, 9),
      ...classType,
      createdAt: new Date()
    };
    this.classTypes.push(newClassType);
    return newClassType;
  }

  // Instructors
  async getAllInstructors(): Promise<Instructor[]> {
    return this.instructors;
  }

  async getInstructorById(id: string): Promise<Instructor | null> {
    return this.instructors.find(i => i.id === id) || null;
  }

  async createInstructor(instructor: InsertInstructor): Promise<Instructor> {
    const newInstructor: Instructor = {
      id: Math.random().toString(36).substr(2, 9),
      ...instructor,
      createdAt: new Date()
    };
    this.instructors.push(newInstructor);
    return newInstructor;
  }

  // Yoga Classes
  async getAllYogaClasses(): Promise<YogaClass[]> {
    return this.yogaClasses;
  }

  async getYogaClassById(id: string): Promise<YogaClass | null> {
    return this.yogaClasses.find(yc => yc.id === id) || null;
  }

  async createYogaClass(yogaClass: InsertYogaClass): Promise<YogaClass> {
    const newYogaClass: YogaClass = {
      id: Math.random().toString(36).substr(2, 9),
      ...yogaClass,
      createdAt: new Date()
    };
    this.yogaClasses.push(newYogaClass);
    return newYogaClass;
  }

  async getWeeklySchedule(): Promise<ScheduleDay[]> {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const schedule: ScheduleDay[] = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + dayOffset);

      const dayClasses = this.yogaClasses
        .filter(yc => {
          const classDate = new Date(yc.date);
          return classDate.getDate() === currentDate.getDate() &&
                 classDate.getMonth() === currentDate.getMonth() &&
                 classDate.getFullYear() === currentDate.getFullYear();
        })
        .map(yc => ({
          id: yc.id,
          date: yc.date,
          classType: this.classTypes.find(ct => ct.id === yc.classTypeId)!,
          instructor: this.instructors.find(i => i.id === yc.instructorId)!,
          currentBookings: yc.currentBookings || 0,
          maxCapacity: yc.maxCapacity
        }));

      schedule.push({
        day: dayNames[dayOffset],
        date: currentDate,
        classes: dayClasses
      });
    }

    return schedule;
  }

  // Users
  async getUserById(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.users.find(u => u.email === email) || null;
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      ...user,
      createdAt: new Date()
    };
    this.users.push(newUser);
    return newUser;
  }

  // Bookings
  async getBookingsByUserId(userId: string): Promise<Booking[]> {
    return this.bookings.filter(b => b.userId === userId);
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const newBooking: Booking = {
      id: Math.random().toString(36).substr(2, 9),
      ...booking,
      bookingDate: new Date(),
      status: 'confirmed'
    };
    this.bookings.push(newBooking);

    // Update current bookings count
    const yogaClass = this.yogaClasses.find(yc => yc.id === booking.classId);
    if (yogaClass) {
      yogaClass.currentBookings = (yogaClass.currentBookings || 0) + 1;
    }

    return newBooking;
  }
}

export const storage = new MemStorage();