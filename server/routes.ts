import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { 
  insertClassTypeSchema, 
  insertInstructorSchema, 
  insertClassSchema, 
  insertBookingSchema, 
  insertContactMessageSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
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

  app.post("/api/bookings", async (req, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      
      // Check if class exists and has capacity
      const cls = await storage.getClass(validatedData.classId);
      if (!cls) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      if (cls.currentBookings >= cls.maxCapacity) {
        return res.status(400).json({ message: "Class is fully booked" });
      }
      
      const booking = await storage.createBooking(validatedData);
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

  const httpServer = createServer(app);
  return httpServer;
}
