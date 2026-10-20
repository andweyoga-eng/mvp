# andWeYoga MVP Operations Handbook

| Field | Value |
|-------|-------|
| **Version** | 1.2 |
| **Last updated** | 10 July 2026 |
| **Repository** | https://github.com/andweyoga-eng/mvp |
| **Active branch** | `cursor/webapp-redesign` |
| **Legal entity** | Ashtanga Welltech OPC Pvt Ltd |
| **Brand** | andWeYoga |
| **Support email** | mudit@andweyoga.com |
| **Support phone** | +91 9513022331 |
| **Support hours** | Mon to Sat, 9:30 AM to 1:30 PM and 3:30 PM to 5:30 PM IST |

**Related docs:** `PRODUCT_BIBLE.md`, `awy.md`, `SOP-TESTING-AND-PRODUCTION.md`, `ADMIN-FEATURES-AUDIT.md`, `SECURITY_AUDIT.md`

---

## Table of Contents

1. [What This Platform Does](#1-what-this-platform-does)
2. [Who Uses It](#2-who-uses-it)
3. [Module and Feature Guide](#3-module-and-feature-guide)
4. [Member Actions Explained](#4-member-actions-explained)
5. [Admin Actions Explained](#5-admin-actions-explained)
6. [Support Playbook](#6-support-playbook)
7. [Chatbot vs Human Routing](#7-chatbot-vs-human-routing)
8. [How-To Guides](#8-how-to-guides)
9. [Technical Architecture](#9-technical-architecture)
10. [API Reference Summary](#10-api-reference-summary)
11. [Operations and Deployment](#11-operations-and-deployment)
12. [Current Limits and Capacity](#12-current-limits-and-capacity)
13. [Known Limitations](#13-known-limitations)
14. [Issues Resolved (Development Log)](#14-issues-resolved-development-log)
15. [Git Commit History](#15-git-commit-history)
16. [Future Scope and Challenges](#16-future-scope-and-challenges)
17. [Document Maintenance](#17-document-maintenance)

---

## 1. What This Platform Does

andWeYoga is a web platform for a yoga studio. Members can:

- Browse yoga sessions and class types
- Create an account (Google sign in or email)
- Complete a health and profile form before booking
- Book and pay for sessions (Razorpay)
- View session history and payments
- Manage privacy consent and account settings

Studio staff use an admin console to:

- Create class types, instructors, and sessions
- Manage bookings and payments
- Control platform settings (guest checkout, maintenance mode, coupons)
- Review users and compliance data

The site also has marketing pages (home, calendar, workshops, trips, explore) and legal pages (privacy, terms, grievance).

> **Note:** `PRODUCT_BIBLE.md` (April 2026) says Razorpay was not built. That is outdated. Payments, guest checkout, flexi mode, coupons, and maintenance mode are all in the current codebase. Use this handbook as the living reference.

---

## 2. Who Uses It

| Role | Access | Login |
|------|--------|-------|
| **Member** | Public site and My Account | Google OAuth or email/password |
| **Guest booker** | Checkout only (when enabled) | No full account needed |
| **Admin** | `/admin/dashboard` | Email and password (httpOnly cookie) |
| **Super admin** | Platform settings, retire class types | Same login, elevated role in DB |

---

## 3. Module and Feature Guide

### 3.1 Public Website (Member Facing)

| Module | Route | What It Means |
|--------|-------|---------------|
| **Home** | `/` | Hero carousel, hub schedules, class catalogue, community sections |
| **Dashboard** | `/dashboard` | Member landing after login; shows upcoming sessions |
| **Calendar** | `/calendar` | Week view of bookable sessions |
| **Reserve / Checkout** | `/reserve` | Payment hold and Razorpay checkout flow |
| **Workshops** | `/workshops` | Workshop marketing (booking via main flow) |
| **Trips** | `/trips` | Trip marketing page |
| **Explore** | `/explore` | Discovery page |
| **Emojou** | `/emojou` | Mood and wellness feature page |
| **My Account** | `/my-account` | Profile, health, sessions, payments, privacy |
| **Session Feedback** | `/session-feedback` | Post-session mood and feedback |
| **Legal pages** | `/privacy`, `/terms`, `/grievance` | Compliance documents |

**Key components:**

- **Hero carousel:** Six discipline slides with Book CTA. Auto-advances every 5 seconds.
- **Schedule section:** This week's sessions grouped by day (IST times).
- **Hub carousel:** Featured sessions with schedules.
- **Not Suitable block (`strictNoTo`):** Health contraindications for a class type (for example pregnancy, back injury). Shown on cards and at checkout.
- **Maintenance overlay:** Full screen message when studio turns on maintenance mode.

### 3.2 My Account Sections

| Section | Purpose |
|---------|---------|
| **Profile** | Name, email, phones (primary, emergency, optional secondary), address, date of birth, WhatsApp consent |
| **Health note** | Health concerns text (up to 500 characters) or "No health concerns." Health document upload and media links |
| **Sessions** | Past and upcoming booked sessions |
| **Payments** | Payment history |
| **Privacy and consent** | DPDP consents, re-consent after policy updates, account erasure |
| **Subscriptions** | Coming soon badge (placeholder) |
| **Preferences** | Coming soon badge (placeholder) |

**Profile complete rule (single rule everywhere):**

Account is complete only when ALL of these pass:

- Email verified
- Name filled
- Primary mobile valid (10 digits, India rules)
- Emergency mobile valid
- Secondary mobile valid if provided
- Health disclosure complete (meaningful text or "No health concerns.")
- Required consents and date of birth for adults (18+)

Until complete, booking is blocked with a redirect to My Account.

**Source of truth:** `shared/profileCompleteness.ts`

### 3.3 Booking and Payments

| Feature | Meaning |
|---------|---------|
| **Reserve and Pay** | Member reserves a seat; spot held for **14 minutes** while paying |
| **Payment hold** | Pending bookings count toward capacity until hold expires or payment completes |
| **Razorpay checkout** | Standard payment (cards, UPI, net banking) |
| **QR / manual payment** | Admin can confirm QR payments manually |
| **Guest checkout** | Book without full account (super admin toggle) |
| **Flexi mode** | Weekly package where member picks practice days from eligible slots at checkout |
| **Session terms** | Per class type terms shown and accepted at checkout |
| **Coupons** | Discount codes at checkout (super admin managed) |
| **Waitlist** | Schema exists; marketing waitlist features partially built |

**Booking payment statuses:**

| Status | Meaning |
|--------|---------|
| `pending` | Hold active, payment not yet complete |
| `paid` | Payment confirmed |
| `waived` | Free session, no payment needed |
| `failed` | Payment failed; may still hold spot briefly |
| `hold_expired` | Hold timed out; spot released |
| `cancelled_by_user` | Member released spot voluntarily |

### 3.4 Admin Console

| Tab / Area | Purpose |
|------------|---------|
| **Overview** | User counts, profile completion stats |
| **Users** | List users with completion flags |
| **Class types** | Create, edit, retire yoga disciplines |
| **Instructors** | Create, verify email, manage status |
| **Sessions** | Create weekly/recurring sessions, pause, resume, delete, cancel |
| **Payment QR** | Upload QR codes for manual payment sessions |
| **Platform controls** | Guest checkout on/off, maintenance window |
| **Offers and promotions** | Carousel promotions, coupons |
| **Payment history** | Verify and review payments |
| **Health materials** | Admin health content panel |

**Admin URLs:** `/admin/login`, `/admin/dashboard`

### 3.5 Compliance and Privacy

| Feature | Meaning |
|---------|---------|
| **Onboarding consent modal** | First login: date of birth, profile, terms, age consent |
| **Health data consent** | Separate consent before saving health info |
| **WhatsApp consent** | Opt in for WhatsApp messages |
| **Re-consent** | Triggered when legal document version changes |
| **Account erasure** | Member types "ERASE" to request data deletion |
| **Erasure executor** | Server cleans identity and health data per policy |

**Legal config source:** `shared/legal-config.ts` (company name, CIN, grievance officer, subprocessors)

**Consent types:** `profile_booking`, `terms`, `age_declaration`, `health_data`, `whatsapp_contact`

### 3.6 Shared Business Rules (Code Modules)

| File / Module | Role |
|---------------|------|
| `shared/profileCompleteness.ts` | Single profile complete definition |
| `shared/mobile-validation.ts` | Phone number rules (client and server) |
| `shared/booking-payment-hold.ts` | 14 min hold, capacity counting |
| `shared/booking-eligibility.ts` | Trial/drop-in vs recurring book windows |
| `shared/consent.ts` | Consent types, age check, erasure schema |
| `shared/flexi-mode.ts` | Flexi slot selection logic |
| `shared/legal-config.ts` | Company legal details, subprocessors |
| `shared/support.ts` | Customer care contact details |
| `shared/health-disclosure.ts` | Health text limits, document size (5 MB max) |
| `shared/maintenance-notify.ts` | Maintenance overlay copy and notify channels |

---

## 4. Member Actions Explained

| Action | What Happens | If It Fails |
|--------|--------------|-------------|
| **Book / Signup (nav)** | Routes to booking or sign in based on session phase | Check login and profile status |
| **Book on session card** | Opens reserve flow or sign in gate | Profile incomplete: toast and redirect to account |
| **Confirm and Reserve** | Creates booking, starts 14 min hold | Session full, duplicate booking, or profile incomplete |
| **Pay (Razorpay)** | Opens payment window | Hold may expire; use resume checkout |
| **Back during checkout** | Confirm dialog; releasing spot frees capacity | By design at current scale |
| **Release my spot** | Cancels hold immediately | Spot returns to pool |
| **Complete Profile** | Saves profile fields; server recalculates completion | Validation errors on phone format |
| **Save health note** | Saves health text; may need health data consent | Text too long or consent missing |
| **Upload health document** | Upload to object storage (when routes enabled) | File over 5 MB: email support instead |
| **Sign in with Google** | OAuth flow, httpOnly cookie set | Wrong `ALLOWED_ORIGIN` or OAuth config |
| **Request erasure** | Starts erasure workflow | Must type ERASE exactly |
| **Send a message (Not Suitable)** | Opens SMS to support number | Outside hours: leave message |
| **Join session (Meet link)** | Logs join event, opens Google Meet | Link must be set by admin |

**Trial and drop-in mid-session rule:**

If a trial or drop-in session has already started, booking is blocked. Message: "This session has already begun. We keep trial and drop-in spaces calm for yogis who joined on time. Please book the next scheduled session instead."

---

## 5. Admin Actions Explained

| Action | What Happens | Notes |
|--------|--------------|-------|
| **Create session** | New row in schedule with capacity, links, publish time | Validates meet link, payment method, QR fields |
| **Pause session** | Session hidden from public booking | Existing bookings kept |
| **Resume session** | Session visible again | Syncs public catalog |
| **Cancel / retire session** | Super admin; notify placeholders | Member comms partially stubbed |
| **Confirm QR payment** | Marks booking paid manually | For UPI QR flows |
| **Toggle guest checkout** | Super admin platform setting | Affects auth popup copy |
| **Toggle maintenance** | Public site shows overlay | Admin routes still work |
| **Create coupon** | Discount code for checkout | Super admin |
| **Deactivate user** | Soft block on account | User sees deactivated message |

---

## 6. Support Playbook

### 6.1 First Response Script

> "Thank you for reaching out to andWeYoga. I am [name]. I can see you need help with [issue]. Let me check your account and booking status."

Always collect:

1. Full name and email used on account
2. Session name and date (if booking related)
3. Screenshot or exact error message
4. Device and browser (mobile Safari, Chrome, etc.)

### 6.2 Common Issues and Steps

#### "I cannot book"

1. Ask if they are signed in
2. Check profile status in admin (complete vs incomplete)
3. Verify email is verified
4. Check health note is saved
5. Check session is not full and not past book window
6. For trial/drop-in mid-session: explain calm studio policy (book next session)

#### "Payment failed or timed out"

1. Check if hold expired (14 minutes)
2. Ask them to go to Dashboard or use email link to resume checkout
3. If hold expired, book again if spot available
4. For QR sessions: admin must confirm payment manually

#### "Profile says incomplete but I filled everything"

1. Refresh page (server reconciles on `/api/auth/me`)
2. Check both mobiles are 10 valid digits
3. Check health text is not empty (or use "No health concerns.")
4. Check consents and date of birth after policy update

#### "Google sign in failed"

1. Confirm they use correct site URL (andweyoga.com vs Railway URL)
2. Escalate to engineering if OAuth redirect error
3. Try email login if account exists

#### "Account deactivated"

Use message from `shared/support.ts`:

> "Your andWeYoga account has been deactivated. To reactivate it, please contact our customer care team."

Only admin can reactivate.

#### "I want my data deleted"

Guide to My Account, Privacy, Erasure. Must type ERASE. Acknowledge 30 day processing per privacy notice.

#### "Not Suitable / health concern"

Do not give medical advice. Suggest they contact team via message button or support phone. Instructor reviews health note before session.

### 6.3 Escalation to Engineering

Escalate when:

- Payment taken but booking not confirmed
- OAuth works on Wi-Fi but not mobile data (DNS)
- Database or site wide outage
- Erasure not completing
- Suspected security issue
- Razorpay webhook mismatch

---

## 7. Chatbot vs Human Routing

### 7.1 Safe for Chatbot (Tier 1)

| Topic | Bot Can Do |
|-------|------------|
| Support hours and contact | Share phone, email, WhatsApp, hours from `shared/support.ts` |
| Profile completion checklist | List required fields |
| Booking steps | Explain sign in, complete profile, pick session, pay within 14 min |
| Hold timer | Explain 14 minute reservation |
| Password reset | Link to forgot password flow |
| Legal links | Point to /privacy, /terms, /grievance |
| Maintenance message | Explain studio is briefly offline |
| Flexi mode (general) | Explain pick your days at checkout |
| Not Suitable (general) | Explain tags are contraindications; contact team for questions |
| Office location / company name | From legal config |

### 7.2 Human Required (Tier 2)

| Topic | Why Human |
|-------|-----------|
| Refunds and payment disputes | Money and policy judgment |
| Medical or injury advice | Liability |
| Account reactivation | Admin action |
| Manual payment confirmation | Admin verifies bank/UPI |
| Session cancellation by studio | Staff decision and comms |
| Coupon exceptions | Super admin |
| Data erasure disputes | Legal and DPDP |
| Instructor schedule changes | Operations |
| Accessibility accommodations | Personal care |
| Angry or distressed members | Empathy |

### 7.3 Engineering Only (Tier 3)

| Topic | Why Engineering |
|-------|-----------------|
| OAuth redirect mismatch | Server config |
| Database connectivity | Railway/env |
| Webhook failures | Razorpay integration |
| Bug in booking capacity | Code fix |
| Security incident | Immediate response |

**Suggested bot handoff phrase:**

> "I want to make sure you get the right help. Let me connect you with our team during office hours, or you can WhatsApp us at +91 9513022331."

---

## 8. How-To Guides

### 8.1 Local Development (Engineers)

```bash
cd mvp
npm install
cp .env.example .env   # fill secrets
npm run db:push
npm run dev            # http://localhost:3000
npm test
npm run test:sanity
npm run qa:smoke-a01-e01
```

See `SOP-TESTING-AND-PRODUCTION.md` for full checklist.

### 8.2 Deploy to Railway

1. Push to GitHub (`awy-main` or feature branch connected to Railway)
2. Set web service variables: `JWT_SECRET`, `DATABASE_PUBLIC_URL`, `ALLOWED_ORIGIN`, Razorpay keys, Google OAuth, Gmail SMTP
3. Run `npm run db:patch` on production DB when new SQL patches ship
4. Verify logs: `Environment validation passed`, no `ENOTFOUND postgres.railway.internal`
5. Test OAuth and one full booking on staging URL before DNS cutover

### 8.3 Admin Bootstrap (Ops)

Set on Railway web service AND local `.env`:

- `ADMIN_INITIAL_EMAIL`
- `ADMIN_INITIAL_PASSWORD` (min 8 chars)
- `ADMIN_INITIAL_NAME`

Server syncs primary admin on every boot. Look for `[DB] Admin bootstrap synced for ...` in server logs.

### 8.4 Enable Health Document Uploads (When Ready)

1. Configure S3 or compatible storage in `.env`
2. Set `ENABLE_HEALTH_DOCUMENT_OBJECT_ROUTES = true` in `server/routes.ts`
3. Redeploy and test upload/download ACL

### 8.5 Pre-Live Checklist

Use `SOP-TESTING-AND-PRODUCTION.md` Section 12:

- DNS on GoDaddy pointing to Railway
- `ALLOWED_ORIGIN=andweyoga.com`
- Google OAuth production URIs
- Gmail SMTP for production email
- Mobile cellular test on real domain

### 8.6 QA Before Every Release

From `docs/QA-BEFORE-UAT.md`:

1. `npm test`
2. `npm run test:sanity`
3. `npm run db:push` (when schema changes)
4. `npm run qa:smoke-a01-e01`
5. Browser UAT on changed flows
6. No `Smoke QA ...` fixtures left in database

---

## 9. Technical Architecture

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind, Radix UI, Wouter routing |
| Backend | Express (TypeScript), bundled with esbuild |
| Database | PostgreSQL via Drizzle ORM |
| Auth | JWT in httpOnly cookies (members and admin) |
| Payments | Razorpay SDK and webhooks |
| Email | Gmail SMTP (Google Workspace) |
| File storage | S3 compatible (optional, gated) |
| Hosting | Railway (US interim; India migration planned) |
| DNS | GoDaddy to andweyoga.com |

**Folder structure:**

```
client/src/     React UI (pages, components, hooks, lib)
server/         Express routes, auth, storage, payments
shared/         Schemas and business rules used by both sides
scripts/db/     SQL patches (npm run db:patch)
tests/          71+ automated test files
docs/           Internal notes and this handbook
```

**Key server files:**

| File | Role |
|------|------|
| `server/index.ts` | Entry, env validation |
| `server/routes.ts` | All HTTP APIs |
| `server/storage.ts` | Database access |
| `server/auth.ts` | Member JWT and cookies |
| `server/adminAuth.ts` | Admin JWT and cookies |
| `server/payment-service.ts` | Razorpay integration |
| `server/booking-hold-service.ts` | Hold expiry logic |

**Database patches:** 33 incremental SQL files in `scripts/db/patches/` (001 through 033).

**Subprocessors (disclosed in Privacy Notice):**

| Name | Role | Location |
|------|------|----------|
| Railway Corp. | App and database hosting | United States (interim) |
| Razorpay | Payment processing | India |
| Google LLC | OAuth sign in and email | US and global |

---

## 10. API Reference Summary

### 10.1 Public and Member APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/class-types` | List yoga disciplines |
| GET | `/api/instructors` | List instructors |
| GET | `/api/classes` | List scheduled sessions |
| GET | `/api/schedule/week` | Week schedule for home/calendar |
| GET | `/api/platform/config` | Guest checkout, maintenance flags |
| POST | `/api/bookings` | Create booking (auth or guest) |
| GET | `/api/bookings/my` | Member bookings |
| GET | `/api/sessions/my` | Member sessions with status |
| POST | `/api/payments/create-order` | Start Razorpay order |
| POST | `/api/payments/verify` | Confirm payment |
| GET | `/api/auth/me` | Current user and profile reconciliation |
| PUT | `/api/auth/profile` | Update profile |
| PATCH | `/api/users/:id/health-update` | Save health note |
| GET | `/api/flexi/options/:anchorClassId` | Flexi slot options |
| POST | `/api/sessions/:classId/mood` | Pre or post session mood |
| POST | `/api/sessions/:classId/join` | Log Meet join event |
| POST | `/api/auth/register` | Email registration |
| POST | `/api/auth/login` | Email login |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/google` | Start Google OAuth |
| GET | `/oauth2callback` | Google OAuth callback |
| POST | `/api/auth/forgot-password` | Password reset request |
| POST | `/api/auth/reset-password` | Set new password |
| PATCH | `/api/bookings/:id/cancel-checkout` | Release held spot |
| GET | `/api/bookings/:id/resume-checkout` | Resume payment flow |

### 10.2 Admin APIs (require admin cookie)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/admin/auth/login` | Admin login |
| GET | `/api/admin/auth/verify` | Verify admin session |
| GET | `/api/admin/users` | Users with completeness |
| PATCH | `/api/admin/users/:id` | Activate/deactivate user |
| POST | `/api/classes` | Create session |
| PATCH | `/api/admin/classes/:id` | Edit session |
| GET | `/api/admin/platform-settings` | Super admin settings |
| PATCH | `/api/admin/platform-settings/guest-checkout` | Toggle guest checkout |
| PATCH | `/api/admin/platform-settings/maintenance-window` | Toggle maintenance |
| POST | `/api/admin/bookings/:id/confirm-qr` | Manual QR confirm |
| GET | `/api/admin/payments/history` | Payment history |
| POST | `/api/admin/payments/:id/verify` | Verify payment |
| GET | `/api/bookings` | All bookings |
| GET | `/api/contact-messages` | Contact form submissions |

Full route list is in `server/routes.ts` (80+ endpoints).

### 10.3 Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Auth signing (min 32 chars; server fails without it) |
| `DATABASE_URL` / `DATABASE_PUBLIC_URL` | Postgres (prefer public on Railway) |
| `ALLOWED_ORIGIN` | Hostname only for CORS and OAuth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign in |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Transactional email |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | Payments |
| `ADMIN_INITIAL_EMAIL` / `ADMIN_INITIAL_PASSWORD` / `ADMIN_INITIAL_NAME` | Admin bootstrap |
| `NODE_ENV` | `development` or `production` |

See `.env.example` for full reference.

---

## 11. Operations and Deployment

| Item | Detail |
|------|--------|
| **Repo** | github.com/andweyoga-eng/mvp |
| **Branches** | `awy-main` (default), `cursor/webapp-redesign`, `cursor/member-booking-payments-platform` |
| **Deploy trigger** | Git push to connected branch on Railway |
| **Build** | `npm run build` |
| **Start** | `npm start` (production Node on `PORT`) |
| **Schema (dev)** | `npm run db:push` |
| **Schema (prod)** | `npm run db:patch` |
| **QA smoke** | `npm run qa:smoke-a01-e01` |
| **Typecheck** | `npm run check` |

**Rate limits:**

- Auth endpoints: 10 attempts per 15 minutes per IP
- Forgot password: 3 per hour per IP

**Security baseline (April 2026, extended July 2026):**

- No JWT in URL (cookies only)
- Admin routes protected
- CORS fail closed
- bcrypt passwords (12 rounds members; admin synced from env)
- Legacy `admin123` backdoor removed
- JWT algorithm pinned to HS256
- Vulnerable dependencies patched

**Git workflow before deploy:**

```bash
git status          # confirm .env not staged
npm test
npm run test:sanity
git add -A
git commit -m "clear message"
git push origin <branch>
```

---

## 12. Current Limits and Capacity

| Limit | Value | Where Defined |
|-------|-------|---------------|
| Payment hold | 14 minutes | `shared/booking-payment-hold.ts` |
| Razorpay checkout window | ~12 minutes | Same module (2 min buffer) |
| Default session capacity | 20 seats | `shared/schema.ts` default |
| Max weekly recurring occurrences | 52 weeks | `shared/session-schedule.ts` |
| Health concerns text | 500 characters | `shared/health-disclosure.ts` |
| Health document size | 5 MB | `shared/health-disclosure.ts` |
| Session terms length | 5000 characters | `shared/session-terms.ts` |
| Strict No To field | 120 characters | `shared/schema.ts` |
| Minimum member age | 18 years | `shared/consent.ts` |
| JWT member session | 7 days | `server/auth.ts` |
| JWT admin session | 8 hours | `server/adminAuth.ts` |
| Request body max | 1 MB | `server/routes.ts` |
| Email verification token | 24 hours | `server/auth.ts` |
| Password reset token | 1 hour | `server/routes.ts` |
| Grievance acknowledgment | 48 hours | `shared/legal-config.ts` |
| Grievance resolution target | 30 days (statutory max 90) | `shared/legal-config.ts` |
| Account erasure after closure | 30 days | `shared/legal-config.ts` |

**Capacity behavior:**

- Pending paid bookings with active hold count toward `maxCapacity`
- Expired holds and user cancel free the spot immediately
- Paid and waived bookings always count
- Free sessions skip payment hold

---

## 13. Known Limitations

| Area | Limitation |
|------|------------|
| **Hosting** | Data at rest in US (Railway interim). India migration planned. |
| **Google Meet** | No auto redirect after call ends. Links are manual. |
| **SMS OTP** | Phone verify UI removed. Numbers format-validated only. |
| **Waitlist** | Partially built. Not full auto notify flow. |
| **Subscriptions tab** | UI placeholder only. |
| **Bulk user upload** | API returns 501. |
| **Instructor self-service** | Admin driven onboarding only. |
| **Push notifications** | Not built. Email and WhatsApp for some flows. |
| **Multi-language** | English primary. Kannada consent copy exists. |
| **Mobile app** | Web only. Responsive design. |
| **Maintenance notify** | Email and WhatsApp channels. SMS not wired. |
| **Session cancel notify** | Placeholder stubs for member emails. |
| **Admin role permissions** | `admin` vs `super_admin` stored but not fully enforced on all routes. |
| **Database indexes** | Security audit notes missing indexes on email, userId, classId, date. |
| **PRODUCT_BIBLE.md** | Outdated on payments. Use this handbook instead. |
| **awy.md deploy log** | Only one deploy row logged. Many commits deployed since. |

---

## 14. Issues Resolved (Development Log)

### 14.1 Security and Auth (2026)

| Issue | Resolution | Commit |
|-------|------------|--------|
| Hardcoded JWT secret | Server crashes if missing | `33cd498` |
| JWT exposed in URL after OAuth | httpOnly cookies | `49f3019` |
| Unprotected admin APIs | `requireAdminAuth` on writes | `33cd498` |
| No rate limiting | Auth rate limits added | `33cd498` |
| Legacy admin123 backdoor | Removed, env bootstrap | `04afa76` |
| JWT algorithm confusion | Pinned to HS256 | `c33b897` |
| CORS open / proxy trust | Fail closed CORS, trust Railway proxy | `e1b1c64` |
| Vulnerable dependencies | Patched | `2972ff2` |
| Email enumeration on forgot password | Neutral response always | `33cd498` |
| Verification tokens never expired | 24 hour expiry | `33cd498` |

### 14.2 Database and Railway (2026)

| Issue | Resolution | Commit |
|-------|------------|--------|
| `ENOTFOUND postgres.railway.internal` | Prefer `DATABASE_PUBLIC_URL` | `e9080e5` |
| Neon driver on Railway | Switched to standard `pg` | `439bfc7` |
| Schema drift on prod | `npm run db:patch` idempotent SQL patches | `a19b25c` |
| Admin password not syncing | `syncAdminFromEnv()` on boot | `4838b4c` |
| cookie-parser missing | Installed dependency | `dd42fdf` |

### 14.3 Profile and Booking (2025 to 2026)

| Issue | Resolution | Commit |
|-------|------------|--------|
| Health-only completion marked profile complete | Single rule in `profileCompleteness.ts` | `35046ec` |
| Booking allowed with empty phones | Server 409 on incomplete profile | `35046ec` |
| Profile completion order mattered | Merged checks, reconcile on `/api/auth/me` | `35046ec` |
| Profile completion blocked booking | Fixed completion error | `80efd1a`, `4a0bf5f` |
| Consent Agree disabled after DOB | Fixed enable logic | `9e95378` |
| Re-consent blocked after policy update | Unblocked | `6c60408` |
| New members wrong landing | Redirect to dashboard after profile complete | `4a2e1e9` |

### 14.4 Payments and Checkout (2026)

| Issue | Resolution | Commit |
|-------|------------|--------|
| No payment collection | Razorpay integrated | `d038ce1` |
| Spot lost during payment | 14 minute hold | `580c113` |
| Manual QR confusion | Unified payment confirmation UI | `3f38d7e` |
| Book CTA lost after signup | Resume intent after auth | `d70a69b` |
| Flexi times wrong timezone | Render in IST on server | `b6afa7f`, `9174e62` |
| Flexi booking UX gaps | Improved flow | `5ff5df0` |

### 14.5 Compliance (2026)

| Issue | Resolution | Commit |
|-------|------------|--------|
| Incomplete erasure | Full erasure and health cleanup | `ba984b8` |
| Health uploads broken | Restored with object routes | `6c60408` |
| Guest checkout without controls | Super admin toggle and gating | `a2eb268` |
| Consent compliance gaps | Full consent flow | `6afa70a` |

### 14.6 UX and Admin (2026)

| Issue | Resolution | Commit |
|-------|------------|--------|
| Em and en dashes in copy | Removed from user facing text | `f5c1e03` |
| Admin session scheduling bugs | Validation and week grid fixes | `888b8ed` |
| Public catalog out of sync | Sync on pause/resume/delete | `808cccc` |
| Replit legacy code | Removed | `7160e59` |
| Calendar badge styling | Aligned | `1041ef8` |
| Hero carousel images | Updated slides | `849033d` |
| Hub carousel and contraindications | Improved UX | `f75528a` |
| Session terms at checkout | Added | `2658d2e` |
| Maintenance window and coupons | Added | `097e113` |
| Admin session images and WhatsApp consent | Added | `099ce4d` |
| Super-admin retire/cancel sessions | Added | `8b4e4a0` |

### 14.7 OAuth and DNS (2026)

| Issue | Resolution |
|-------|------------|
| OAuth redirect to wrong host | Match `ALLOWED_ORIGIN` to live URL |
| Cellular DNS fails on Railway URL | Use custom domain `andweyoga.com` |
| Google OAuth callback DB error | Fix database connectivity first |

### 14.8 Health Documents (2025)

| Issue | Resolution | Commit |
|-------|------------|--------|
| Upload and download broken | Fixed profile page flows | `298ce71`, `a201334` |
| Wrong download format | Preserve original file types | `a5bddda`, `63e3cd0` |
| Secure upload added | ACL and validation | `862d443`, `ff8cf91` |

---

## 15. Git Commit History

**Remote:** `origin` → https://github.com/andweyoga-eng/mvp.git

### Phase 1: Foundation (September to October 2025)

Early platform build. Auth popup, Google login, health profile, admin portal, document upload and download fixes.

| Date | Hash | Author | Message |
|------|------|--------|---------|
| 2025-09-16 | `724b1b6` | arunbdt | Replace authentication modal with slideout |
| 2025-09-16 | `859f910` | arunbdt | Remove email and password sign-up option |
| 2025-09-18 | `1b725b6` | arunbdt | Ensure secure Google login with HTTPS |
| 2025-09-19 | `a15d1aa` | andweyoga-eng | Published app sign in and unified header |
| 2025-09-23 | `70392bd` | arunbdt | Add user health profile validation before booking |
| 2025-09-23 | `d9f0fdc` | arunbdt | Add administrative portal |
| 2025-09-23 | `22327a5` | arunbdt | Add secure admin login and user management |
| 2025-09-23 | `ecd00da` | arunbdt | Add health update and session history to account |
| 2025-10-01 | `862d443` | arunbdt | Add health document upload and download |
| 2025-10-01 | `63e3cd0` | arunbdt | Fix document download format |

### Phase 2: Security Baseline (April 2026)

| Date | Hash | Author | Message |
|------|------|--------|---------|
| 2026-04-21 | `33cd498` | Arun Sachy | security: fix critical vulnerabilities v1.0.0 baseline |
| 2026-04-21 | `a0e99ad` | Arun Sachy | docs: add Product Bible and Security Audit report |
| 2026-04-27 | `dd42fdf` | Arun Sachy | fix: install cookie-parser dependency |
| 2026-04-28 | `439bfc7` | Arun Sachy | fix: switch from Neon to standard pg for Railway |
| 2026-05-13 | `35046ec` | Arun Sachy | Profile completion parity, auth/session fixes |
| 2026-05-14 | `e9080e5` | Arun Sachy | Prefer DATABASE_PUBLIC_URL for Railway Postgres |
| 2026-05-14 | `6583ccb` | Arun Sachy | docs: session log for Railway OAuth and deploy |
| 2026-05-15 | `9e0c002` | Arun Sachy | docs: add SOP for local, Railway, pre-live testing |
| 2026-05-15 | `e1571ca` | Arun Sachy | docs: add admin features audit |
| 2026-05-15 | `31eee28` | Arun Sachy | feat: admin slice 1 auth hardening |
| 2026-05-15 | `a19b25c` | Arun Sachy | fix: add incremental SQL patches via db:patch |
| 2026-05-15 | `4838b4c` | Arun Sachy | fix: sync bootstrap credentials from env on boot |

### Phase 3: Booking Platform (May to June 2026)

| Date | Hash | Author | Message |
|------|------|--------|---------|
| 2026-05-29 | `d038ce1` | Arun Sachy | feat: member booking, Razorpay payments, admin platform |
| 2026-06-11 | `22eace4` | Arun Sachy | fix: booking flow UX, admin sessions, instructor verification |
| 2026-06-23 | `87a4d8a` | Arun Sachy | WIP: guest checkout, account pages, health docs |
| 2026-06-24 | `3b45a80` | Arun Sachy | Add homepage redesign handoff package |
| 2026-06-26 | `5990b1f` | Arun Sachy | feat: Digital Zen home page redesign |
| 2026-06-30 | `3657420` | Arun Sachy | feat: account redesign, launcher tabs, booking/auth polish |
| 2026-06-30 | `8490011` | Arun Sachy | chore: trigger Railway deployment |

### Phase 4: Production Hardening (July 2026)

| Date | Hash | Author | Message |
|------|------|--------|---------|
| 2026-07-02 | `6afa70a` | Arun Sachy | feat: consent compliance, guest checkout UX, booking fixes |
| 2026-07-02 | `9e95378` | Mudit | fix: enable consent Agree button after DOB picks |
| 2026-07-02 | `3f38d7e` | Mudit | fix: unified manual payment confirmation for members |
| 2026-07-02 | `04afa76` | Mudit | fix: remove legacy admin123 backdoor |
| 2026-07-02 | `e1b1c64` | Mudit | fix: trust Railway proxy for rate limits and CORS |
| 2026-07-02 | `2972ff2` | Mudit | fix: patch vulnerable production dependencies |
| 2026-07-02 | `c33b897` | Mudit | fix: pin JWT verification to HS256 |
| 2026-07-03 | `849033d` | Mudit | Update hero carousel slide images |
| 2026-07-03 | `49f3019` | Mudit | fix: move member and admin auth to httpOnly cookies |
| 2026-07-03 | `a2eb268` | Mudit | feat: add guest checkout controls and sign-in gating |
| 2026-07-04 | `ba984b8` | Mudit | fix: complete erasure and health data cleanup |
| 2026-07-04 | `1041ef8` | Mudit | fix: align calendar session badge styling |
| 2026-07-04 | `888b8ed` | Mudit | fix: improve admin session scheduling and week grid |
| 2026-07-04 | `099ce4d` | Mudit | feat: admin session images, profile onboarding, WhatsApp consent |
| 2026-07-04 | `f5c1e03` | Mudit | fix: remove em and en dashes from user-facing copy |
| 2026-07-05 | `8b4e4a0` | Mudit | feat: super-admin session retire/cancel and admin auth fixes |
| 2026-07-06 | `f75528a` | Mudit | feat: improve hub carousel and contraindications |
| 2026-07-06 | `580c113` | Mudit | feat: Reserve and Pay checkout with 14-minute hold |
| 2026-07-06 | `7160e59` | Mudit | chore: remove Replit legacy code |
| 2026-07-06 | `40cb994` | Mudit | feat: adapt join popup copy, rename nav CTA |
| 2026-07-06 | `4a2e1e9` | Mudit | fix: redirect new members to dashboard after profile complete |
| 2026-07-06 | `2658d2e` | Mudit | feat: session terms at checkout |
| 2026-07-06 | `6c60408` | Mudit | fix: unblock reconsent, restore health document uploads |
| 2026-07-07 | `097e113` | Mudit | feat: maintenance window, coupons, public-site polish |
| 2026-07-08 | `d70a69b` | Mudit | feat: route Book CTAs to checkout, resume intent after signup |
| 2026-07-08 | `808cccc` | Mudit | Add admin session pause/resume/delete, sync public catalog |
| 2026-07-09 | `5ff5df0` | Mudit | feat: improve flexi booking flow and session UX |
| 2026-07-09 | `9174e62` | Mudit | fix: render member session times in IST |
| 2026-07-09 | `b6afa7f` | Mudit | fix: render flexi option times in IST on the server |

### Uncommitted Work (as of 10 July 2026)

Files modified but not yet committed on `cursor/webapp-redesign`:

- `client/src/components/account-drawer.tsx`
- `client/src/components/account-fold-section.tsx` (new)
- `client/src/components/account-health-note-section.tsx`
- `client/src/components/privacy-consent-section.tsx`
- `client/src/pages/my-account.tsx`

These appear to be ongoing My Account UI fold and section work.

---

## 16. Future Scope and Challenges

### 16.1 Planned (from roadmap and code comments)

| Item | Priority | Notes |
|------|----------|-------|
| India data hosting migration | High | Legal disclosure already mentions interim US hosting |
| Google Meet automation | Medium | Manual links today |
| Full waitlist auto notify | Medium | Schema exists |
| SMS OTP verification | Low | Deferred by product |
| Instructor self-service portal | Medium | Onboarding APIs partially built |
| Member session cancellation | Medium | Admin cancel exists |
| Push notifications | Low | Email and WhatsApp first |
| Commerce and merchandise | Phase 3 | Not started |
| Community feed | Phase 2 | Not started |
| Native mobile app | Long term | Responsive web now |
| Bulk Excel user upload | Medium | API returns 501 today |
| Database indexes | Medium | Noted in security audit |

### 16.2 Technical Challenges

1. **Scale and hold policy:** At high volume, back button releasing holds may need revisit. See `docs/checkout-hold-ux-notes.md`.
2. **Webhook reliability:** Razorpay webhooks must be monitored in production.
3. **Admin role permissions:** `admin` vs `super_admin` not fully enforced on all routes.
4. **Cellular DNS:** Railway subdomain may fail on some carriers until custom domain is live.
5. **Doc drift:** Multiple docs lag behind code. Update this handbook with each release.
6. **Meet leave URL:** Google Meet does not redirect when a call ends. Needs Workspace admin config or manual return.

### 16.3 Test Coverage

71 test files covering booking, consent, erasure, flexi, coupons, maintenance, guest checkout, admin sessions, and payments.

```bash
npm test              # full suite
npm run test:sanity   # regression subset
```

---

## 17. Document Maintenance

| When | Action |
|------|--------|
| New feature shipped | Add to Section 3 and Section 14 |
| Bug fixed in production | Add row to Section 14 |
| New env var | Update Section 10.3 and `.env.example` |
| Deploy to production | Add row to commit table in Section 15 |
| Support process change | Update Section 6 and 7 |
| New limitation discovered | Add to Section 13 |

**Export to Word:**

```bash
pandoc docs/ANDWEYOGA-OPERATIONS-HANDBOOK.md -o ANDWEYOGA-Operations-Handbook.docx
```

**Export to PDF:** Open the Word file and Save as PDF, or use a Markdown PDF extension in your editor.

---

*End of handbook. Maintained by andWeYoga engineering and product.*
