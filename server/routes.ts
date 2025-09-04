import express from 'express';
import { storage } from './storage';
import { insertUserSchema, insertBookingSchema } from '@shared/schema';

const router = express.Router();

// Class Types
router.get('/class-types', async (req, res) => {
  try {
    const classTypes = await storage.getAllClassTypes();
    res.json(classTypes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch class types' });
  }
});

// Schedule
router.get('/schedule/week', async (req, res) => {
  try {
    const schedule = await storage.getWeeklySchedule();
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weekly schedule' });
  }
});

// Instructors
router.get('/instructors', async (req, res) => {
  try {
    const instructors = await storage.getAllInstructors();
    res.json(instructors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch instructors' });
  }
});

// Users
router.post('/users', async (req, res) => {
  try {
    const userData = insertUserSchema.parse(req.body);
    const user = await storage.createUser(userData);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: 'Invalid user data' });
  }
});

// Bookings
router.post('/bookings', async (req, res) => {
  try {
    const bookingData = insertBookingSchema.parse(req.body);
    const booking = await storage.createBooking(bookingData);
    res.status(201).json(booking);
  } catch (error) {
    res.status(400).json({ error: 'Invalid booking data' });
  }
});

router.get('/users/:id/bookings', async (req, res) => {
  try {
    const { id } = req.params;
    const bookings = await storage.getBookingsByUserId(id);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user bookings' });
  }
});

export default router;