import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  profileCompletionStatus: text("profile_completion_status").default("incomplete"), // 'incomplete', 'complete'
  healthUpdateLastModified: timestamp("health_update_last_modified"),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const classTypes = pgTable("class_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull(), // in minutes
  imageUrl: text("image_url"),
});

export const instructors = pgTable("instructors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  bio: text("bio"),
  imageUrl: text("image_url"),
  specialties: text("specialties").array(),
});

export const classes = pgTable("classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classTypeId: varchar("class_type_id").notNull().references(() => classTypes.id),
  instructorId: varchar("instructor_id").notNull().references(() => instructors.id),
  date: timestamp("date").notNull(),
  maxCapacity: integer("max_capacity").notNull().default(20),
  currentBookings: integer("current_bookings").notNull().default(0),
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull().references(() => classes.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
  storageProvider: varchar("storage_provider", { length: 50 }).notNull().default("replit"), // 'replit', 's3', 'gcs', 'local'
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

// Admin users for admin console access
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("admin"), // 'admin', 'super_admin'
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  emailVerified: true,
  emailVerificationToken: true,
  profileCompletionStatus: true,
  healthUpdateLastModified: true,
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

export const updateProfileSchema = createInsertSchema(users).pick({
  name: true,
  primaryMobile: true,
  primaryMobileCountryCode: true,
  secondaryMobile: true,
  secondaryMobileCountryCode: true,
  emergencyMobile: true,
  emergencyMobileCountryCode: true,
  healthUpdateText: true,
  healthDocumentUrls: true,
});

// Health Update validation schema with mandatory text field
export const healthUpdateSchema = z.object({
  healthUpdateText: z
    .string()
    .min(10, "Health update must be at least 10 characters (e.g. describe your situation or write 'No current concerns')."),
  healthDocumentUrls: z.array(z.string()).optional(),
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
  createdAt: true,
});

export const insertClassTypeSchema = createInsertSchema(classTypes).omit({
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

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true,
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
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;

// New health data management types
export type UserDocument = typeof userDocuments.$inferSelect;
export type InsertUserDocument = z.infer<typeof insertUserDocumentSchema>;
export type UserSessionMapping = typeof userSessionMappings.$inferSelect;
export type InsertUserSessionMapping = z.infer<typeof insertUserSessionMappingSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
