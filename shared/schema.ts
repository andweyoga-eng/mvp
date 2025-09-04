import { pgTable, text, integer, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Database Tables
export const classTypes = pgTable('class_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  duration: integer('duration').notNull(),
  price: integer('price').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const instructors = pgTable('instructors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  bio: text('bio'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const yogaClasses = pgTable('yoga_classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  classTypeId: uuid('class_type_id').references(() => classTypes.id).notNull(),
  instructorId: uuid('instructor_id').references(() => instructors.id).notNull(),
  date: timestamp('date').notNull(),
  maxCapacity: integer('max_capacity').notNull(),
  currentBookings: integer('current_bookings').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  classId: uuid('class_id').references(() => yogaClasses.id).notNull(),
  bookingDate: timestamp('booking_date').defaultNow(),
  status: text('status').default('confirmed'),
});

// Types
export type ClassType = typeof classTypes.$inferSelect;
export type Instructor = typeof instructors.$inferSelect;
export type YogaClass = typeof yogaClasses.$inferSelect;
export type User = typeof users.$inferSelect;
export type Booking = typeof bookings.$inferSelect;

// Insert schemas
export const insertClassTypeSchema = createInsertSchema(classTypes).omit({ id: true, createdAt: true });
export const insertInstructorSchema = createInsertSchema(instructors).omit({ id: true, createdAt: true });
export const insertYogaClassSchema = createInsertSchema(yogaClasses).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, bookingDate: true });

// Insert types
export type InsertClassType = z.infer<typeof insertClassTypeSchema>;
export type InsertInstructor = z.infer<typeof insertInstructorSchema>;
export type InsertYogaClass = z.infer<typeof insertYogaClassSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;