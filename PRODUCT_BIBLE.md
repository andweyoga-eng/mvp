# andWeYoga Product Bible
Version: 1.0.0 — Baseline
Release Date: April 2026
Repository: github.com/andweyoga-eng/mvp

---

## How to Read This Document
Single source of truth for what andWeYoga does, what is built, what is planned.
Written for Product Managers. Every feature maps to real working code.
Updated with every release. Nothing assumed. Everything written down.

Version numbering: Major.Minor.Patch
Major = significant new capability. Minor = new feature. Patch = bug fix.

---

## Version 1.0.0 — Baseline Release
Status: Security hardened. Ready for production deployment on Railway.

---

## Section 1. Consumer Experience

### 1.1 Hero Carousel
Full-screen carousel with six slides. Each has a discipline label, headline, subtitle and Book Now button. Auto-advances every 5 seconds. Dot navigation included.

Slides: Mudit Yoga / To Evolve. Hatha Yoga / To Embrace. Yin Yoga / To Experience. Meditation / To Express. Ashtanga Vinyasa / To Elevate. Ashtanga Yoga / To Become.

Files: client/src/components/hero-carousel.tsx

### 1.2 Weekly Session Schedule
Current week sessions grouped by day. Each card shows class name, instructor, time in IST with local time tooltip, price, capacity, More Info and Book buttons. Fully booked sessions show Full and are disabled. Week number calculated dynamically.

Files: client/src/components/schedule-section.tsx, server/routes.ts GET /api/schedule/week

### 1.3 Session Booking Flow
Full authenticated booking flow. Login check, profile completeness check, class selection, server-side validation, booking creation, real-time capacity update, success notification.

Files: client/src/components/booking-modal.tsx, server/routes.ts POST /api/bookings

### 1.4 Class Type Catalogue — and We Workout
Browsable grid of all yoga disciplines with photo, description, price and Book Now. Current disciplines: Hatha Yoga, Hyyocross, Meditation, Sound Therapy.

Files: client/src/components/classes-section.tsx

### 1.5 My Account
Four-tab personal account page.
Tab 1 Profile: name, email, phone numbers with country code validation.
Tab 2 Health Update: mandatory text and document upload required before booking.
Tab 3 Session History: past and upcoming sessions with status.
Tab 4 Security: email verification status.

Files: client/src/pages/my-account.tsx, client/src/components/health-update-section.tsx

### 1.6 Health Document Upload
Private file upload for medical documents. ACL policy per document. Owner-only access enforced at API level.

Files: server/objectStorage.ts, server/objectAcl.ts

---

## Section 2. Community Sections

### 2.1 and We Meet Yogis
Three certified instructors with photo, name, title, certifications, specialties and experience. Arjun Patel, Priya Sharma, Alice Kumari.

### 2.2 and We Care
Two community service programmes. Blind School Partnership every Tuesday 3PM free. Paraplegic Institute Sessions every Friday 4PM.

### 2.3 and We Vibe
Grid of 20 community member Instagram profiles showing the active wellness community.

### 2.4 and We Believe
Full-width brand manifesto. Progress not perfection, Connection not competition.

### 2.5 and We Connect
Community events section. Weekly Circles and Yoga Retreats described. Booking not yet available.

### 2.6 Contact Section
Contact form capturing name, email, phone, message. Stored in database for admin review.

---

## Section 3. Authentication

### 3.1 Email and Password Registration
bcrypt at 12 rounds. Email verification required. Verification link expires 24 hours.

### 3.2 Google Sign In
One-click OAuth. Auto-verified. Two flows supported.

### 3.3 Login and Session Management
JWT in httpOnly secure cookie. 7-day expiry. Logout clears cookie immediately.

### 3.4 Password Reset
Time-limited reset links. 1-hour expiry. No email enumeration.

---

## Section 4. Admin Capability

### 4.1 Admin Login
Separate login at /admin/login. Separate token type. 8-hour expiry.

### 4.2 Admin Dashboard
Total users, complete vs incomplete profiles, per-user completion breakdown.

### 4.3 Class and Schedule Management
Admin-only creation of class types, instructors and scheduled sessions.

### 4.4 Contact Message and Booking Review
Admin-only access to all contact messages and all bookings.

---

## Section 5. Database Tables
users, class_types, instructors, classes, bookings, contact_messages, user_documents, user_session_mappings, audit_logs, admin_users.

Files: shared/schema.ts

---

## Section 6. What Is NOT Built Yet
- Razorpay payment integration — bookings exist but no payment collected
- Google Meet link automation — currently manual
- Practitioner self-service onboarding
- Session cancellation by consumer
- Waitlist for full sessions
- Push notifications or reminders
- Merchandise and commerce layer (Phase 3)
- Community content layer (Phase 2)
- Mobile app
- Multi-language support
- Health document migration to Google Cloud Storage

---

## Section 7. Roadmap

v1.1.0 — Payment and Booking Completion
Razorpay integration, Google Meet automation, confirmation and reminder emails.

v1.2.0 — Practitioner Self-Service
Application form, practitioner profiles, practitioner dashboard, revenue share reporting.

v1.3.0 — Consumer Experience
Cancellations, waitlist, session history certificates, ratings and reviews.

v2.0.0 — Community Layer
Community feed, blog, user content, and We Connect event booking.

v3.0.0 — Commerce Layer
Merchandise catalogue, shopping cart, practitioner listings, bundle packages.

---

## Section 8. Deployment

Production: Railway
Database: Neon PostgreSQL or Railway PostgreSQL plugin
Domain: andweyoga.com via GoDaddy DNS
SSL: Automatic via Railway

Required environment variables:
JWT_SECRET, DATABASE_URL, ALLOWED_ORIGIN, NODE_ENV, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SENDGRID_API_KEY

See .env.example for full reference.

---

## Change Log

v1.0.0 — April 2026
Initial production-ready baseline. Security audit completed. Six vulnerabilities fixed. Codebase moved from Replit to GitHub. Ready for Railway deployment.
