# andWeYoga Product Decision Log

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Compiled** | 11 July 2026 |
| **Repository** | https://github.com/andweyoga-eng/mvp |
| **Sources** | `awy.md`, git commits, chat transcripts, internal docs, codebase |

**Decision maker key**

| Key | Meaning |
|-----|---------|
| **You** | Explicit product direction from Arun / product owner |
| **Joint** | Discussed and aligned between product and engineering |
| **AI/Eng** | Engineering recommendation implemented (approved by shipping) |
| **Team** | Shipped by team member (e.g. Mudit) with product alignment |

---

## Table of Contents

1. [How to Read Each Entry](#how-to-read-each-entry)
2. [Account, Profile, and Health](#1-account-profile-and-health)
3. [Consent, Privacy, and Compliance](#2-consent-privacy-and-compliance-dpdp)
4. [Authentication and Access](#3-authentication-and-access)
5. [Booking, Payments, and Checkout](#4-booking-payments-and-checkout)
6. [Flexi Mode](#5-flexi-mode)
7. [Safety and Health Messaging](#6-safety-health-messaging-and-studio-policy)
8. [Member Experience and IA](#7-member-experience-and-information-architecture)
9. [Admin and Operations](#8-admin-and-operations)
10. [On Hold or Not Built](#9-explicitly-on-hold-or-not-built)
11. [AI/Engineering Decisions](#10-decisions-made-by-aiengineering-without-explicit-product-request)
12. [Open Questions](#11-open-questions-for-product-owner)

---

## How to Read Each Entry

| Field | Meaning |
|-------|---------|
| **Type** | Existing / Enhancement / New / Deprecation / On hold / Partial |
| **Factors** | What forced a choice |
| **Dependencies** | What had to exist first |
| **Decision** | What was chosen |
| **Rationale** | Why |
| **Shapes product** | Long term effect |

---

## 1. Account, Profile, and Health

### 1.1 Single profile completion rule everywhere

| | |
|---|---|
| **Feature** | Profile must be complete before booking |
| **Type** | Enhancement (was inconsistent) |
| **Decided by** | Joint (documented in `awy.md`, May 2026) |
| **Factors** | Users saved health only; nav showed complete while phones were empty |
| **Dependencies** | `shared/profileCompleteness.ts`, server reconcile, booking API |
| **Decision** | One rule: verified email, name, primary and emergency mobile, valid secondary if filled, health disclosure complete |
| **Rationale** | Same truth in DB, API, nav, and booking. No contradictions |
| **Shapes product** | Every gate (Book, Reserve, dashboard) uses one check. Support gives one checklist |

### 1.2 Order of Profile vs Health does not matter

| | |
|---|---|
| **Feature** | Completion order |
| **Type** | Enhancement |
| **Decided by** | Joint |
| **Decision** | User may fill Contact Info or Health in any order. Status updates when all pass |
| **Rationale** | Less friction. User chooses their path |
| **Shapes product** | My Account is section-based, not a forced wizard (except consent timing, see 2.1) |

### 1.3 Health text: "No Health issues now"

| | |
|---|---|
| **Feature** | Health disclosure quick option copy |
| **Type** | Enhancement |
| **Decided by** | You (10 Jul 2026, consent consolidation request) |
| **Decision** | Change from "No health concerns." to **"No Health issues now"** |
| **Rationale** | Softer, more conversational member language |
| **Shapes product** | Sets tone for health UX. Value in `shared/health-disclosure.ts` |

### 1.4 Health document uploads gated off

| | |
|---|---|
| **Feature** | In-app health file upload |
| **Type** | On hold (code exists, routes disabled) |
| **Decided by** | You / Product (`awy.md`) |
| **Factors** | Object storage cost, local dev breakage, low volume |
| **Dependencies** | S3 config, `ENABLE_HEALTH_DOCUMENT_OBJECT_ROUTES = true` |
| **Decision** | Upload UI off. Direct members to email support for large reports |
| **Rationale** | Email path works at current scale. Reduce infra risk |
| **Shapes product** | Support handles documents manually until re-enabled. 5 MB limit defined for future |

### 1.5 SMS phone verification on Profile

| | |
|---|---|
| **Feature** | Per-number Verify via SMS |
| **Type** | On hold (UI removed) |
| **Decided by** | You / Product |
| **Decision** | Collect and format-validate phones. No OTP verify in UI |
| **Rationale** | SMS infra and product need not justified yet |
| **Shapes product** | Verified mobile is format-only today. Real OTP is future backlog |

### 1.6 Credits, Preferences, Subscriptions tabs

| | |
|---|---|
| **Feature** | Account extras |
| **Type** | On hold (placeholders) |
| **Decided by** | Joint (redesign) |
| **Decision** | Show Coming soon badges. No backend yet |
| **Rationale** | Ship core booking first. Avoid half-built features |
| **Shapes product** | Account shell is ready. Backend can plug in later |

---

## 2. Consent, Privacy, and Compliance (DPDP)

### 2.1 Consent consolidation in My Account

| | |
|---|---|
| **Feature** | Where and when consent is collected |
| **Type** | Enhancement |
| **Decided by** | You (10 Jul 2026) |
| **Factors** | Full-screen consent gate felt blocking. Flow should feel elegant |
| **Dependencies** | Consent APIs, profile sections, OAuth redirect |
| **Decision** | Consolidate in My Account: **Contact Info first, then Health, then DPDPA consent**. WhatsApp consent stays near contact info. Marketing and newsletter in separate Privacy section |
| **Rationale** | Contextual consent after member understands what they are signing up for |
| **Shapes product** | Onboarding is account-centric, not modal-centric |

### 2.2 OAuth signup lands on My Account (not Dashboard)

| | |
|---|---|
| **Feature** | Post Google sign-in redirect |
| **Type** | Enhancement |
| **Decided by** | You (10 Jul 2026) |
| **Decision** | New or incomplete users go to `/my-account`. Complete users go to dashboard after profile done |
| **Rationale** | Start setup immediately. No extra hop |
| **Shapes product** | First-time member journey starts in account setup |

### 2.3 Adults only (18+)

| | |
|---|---|
| **Feature** | Age gate |
| **Type** | New (compliance) |
| **Decided by** | Joint (DPDP policy) |
| **Decision** | Date of birth required. Under 18 cannot register or guest book |
| **Rationale** | DPDPA adults-only policy for this platform |
| **Shapes product** | Hard gate on signup, consent, and guest checkout |

### 2.4 Account erasure (type ERASE)

| | |
|---|---|
| **Feature** | Right to erasure |
| **Type** | New |
| **Decided by** | Joint (legal and engineering) |
| **Decision** | Member types ERASE to confirm. Server runs erasure executor. 30 day processing per privacy notice |
| **Rationale** | DPDP compliance |
| **Shapes product** | Support must not delete manually without process |

### 2.5 Re-consent after policy version change

| | |
|---|---|
| **Feature** | Legal document updates |
| **Type** | New |
| **Decided by** | Joint |
| **Decision** | `documentVersion` in `LEGAL_CONFIG` triggers re-consent |
| **Rationale** | Lawful processing after policy updates |
| **Shapes product** | Every legal change needs version bump and member re-acceptance |

### 2.6 Interim US hosting disclosure

| | |
|---|---|
| **Feature** | Data localisation messaging |
| **Type** | New (legal product) |
| **Decided by** | You / Legal (`shared/legal-config.ts`) |
| **Decision** | Disclose Railway US hosting interim. Commit to India migration in privacy notice |
| **Rationale** | Honest DPDP subprocessor disclosure |
| **Shapes product** | Migration to India infra is a stated milestone |

### 2.7 WhatsApp consent placement

| | |
|---|---|
| **Feature** | WhatsApp opt-in |
| **Type** | Enhancement |
| **Decided by** | You |
| **Decision** | WhatsApp toggle near contact info, not only in legal section |
| **Rationale** | Tied to how studio will message members |
| **Shapes product** | Maintenance and session comms can use WhatsApp when consented |

---

## 3. Authentication and Access

### 3.1 Google Sign-In as primary path

| | |
|---|---|
| **Feature** | Registration method |
| **Type** | Existing (email/password signup deprecated Sep 2025) |
| **Decided by** | You (early platform) |
| **Decision** | Google OAuth primary. Email/password login retained for existing accounts |
| **Rationale** | Lower friction. Google auto-verifies email |
| **Shapes product** | OAuth config (`ALLOWED_ORIGIN`) is critical ops dependency |

### 3.2 JWT in httpOnly cookies (not URL)

| | |
|---|---|
| **Feature** | Session storage |
| **Type** | Enhancement (security) |
| **Decided by** | AI/Eng (security audit, shipped Jul 2026) |
| **Decision** | No `?token=` in URL after OAuth. Cookie-based session |
| **Rationale** | Tokens in URLs leak via logs and history |
| **Shapes product** | Standard secure web auth pattern |

### 3.3 Guest checkout (super admin toggle)

| | |
|---|---|
| **Feature** | Book without full account |
| **Type** | New |
| **Decided by** | Joint |
| **Factors** | Conversion vs compliance. Need controls |
| **Dependencies** | Guest consent schema, platform settings API |
| **Decision** | Guest checkout **off by default**. Super admin enables via platform settings |
| **Rationale** | Studio controls when to allow low-friction booking |
| **Shapes product** | Auth popup copy changes when on |

### 3.4 Nav CTA: Book / Signup

| | |
|---|---|
| **Feature** | Header call to action |
| **Type** | Enhancement |
| **Decided by** | Team (Jul 2026) |
| **Decision** | Rename to **Book/Signup** tied to session phase |
| **Rationale** | Action-oriented for conversion |
| **Shapes product** | Public site leads with booking intent |

---

## 4. Booking, Payments, and Checkout

### 4.1 Razorpay integrated checkout

| | |
|---|---|
| **Feature** | Online payments |
| **Type** | New |
| **Decided by** | You (May to Jul 2026 platform build) |
| **Decision** | Razorpay Standard Checkout for cards, UPI, net banking |
| **Rationale** | Professional payments for Indian market |
| **Shapes product** | Core revenue path |

### 4.2 Reserve and Pay with 14 minute hold

| | |
|---|---|
| **Feature** | Seat reservation during payment |
| **Type** | New |
| **Decided by** | Joint (Epic A-01) |
| **Factors** | Razorpay window about 12 min. Need buffer |
| **Decision** | **14 minute hold** from booking creation. Pending booking counts toward capacity |
| **Rationale** | Prevent double booking while member pays |
| **Shapes product** | Support must explain hold timer |

### 4.3 Back button releases spot (launch scale)

| | |
|---|---|
| **Feature** | Checkout exit behavior |
| **Type** | New (documented policy) |
| **Decided by** | Joint (`docs/checkout-hold-ux-notes.md`) |
| **Decision** | Confirm dialog on back. Confirming **releases spot immediately** |
| **Alternatives considered** | Navigate-only back (hold continues until expiry) |
| **Rationale** | Explicit user intent. Accurate capacity at current volume |
| **Shapes product** | Revisit at higher volume (documented as future A-02) |

### 4.4 QR / manual payment confirmation

| | |
|---|---|
| **Feature** | UPI QR sessions |
| **Type** | Enhancement |
| **Decided by** | Joint |
| **Decision** | Admin uploads QR. Admin confirms payment manually. Unified member confirmation UI |
| **Rationale** | Some sessions use QR not Razorpay |
| **Shapes product** | Ops workflow for studio |

### 4.5 Session terms at checkout

| | |
|---|---|
| **Feature** | Per class type terms acceptance |
| **Type** | New |
| **Decided by** | Team (Jul 2026) |
| **Decision** | Show and require acceptance of session-specific terms at checkout |
| **Rationale** | Legal and studio policy per discipline |
| **Shapes product** | Admin sets terms per class type |

### 4.6 Coupons at checkout

| | |
|---|---|
| **Feature** | Discount codes |
| **Type** | New |
| **Decided by** | Team (Jul 2026) |
| **Decision** | Super admin creates coupons. Member enters at checkout |
| **Rationale** | Promotions and campaigns |
| **Shapes product** | Offers panel in admin |

### 4.7 Trial/drop-in: no mid-session booking

| | |
|---|---|
| **Feature** | Book window for trial and drop-in |
| **Type** | New (product rule) |
| **Decided by** | Joint (`shared/booking-eligibility.ts`) |
| **Decision** | Trial/drop-in only bookable **before start**. Mid-session blocked with calm studio message |
| **Rationale** | Protect in-session experience |
| **Shapes product** | Different rules than recurring weekly sessions |

### 4.8 Book CTAs route to checkout; resume after signup

| | |
|---|---|
| **Feature** | Booking intent preservation |
| **Type** | Enhancement |
| **Decided by** | Team (Jul 2026) |
| **Decision** | Book buttons go to `/reserve`. After signup, return to intended session |
| **Rationale** | Do not lose booking intent across auth |
| **Shapes product** | Conversion funnel is checkout-first |

### 4.9 All member-facing times in IST

| | |
|---|---|
| **Feature** | Timezone display |
| **Type** | Enhancement (bug fix became policy) |
| **Decided by** | You (9 Jul 2026, production bug) |
| **Factors** | Railway server UTC caused wrong times for Flexi path |
| **Decision** | Render all session times in **IST (Asia/Kolkata)** on server and client |
| **Rationale** | Studio and members are India-based |
| **Shapes product** | Permanent rule. No ambiguous server timezone |

---

## 5. Flexi Mode

### 5.1 Flexi Mode feature

| | |
|---|---|
| **Feature** | Pick weekly practice days from eligible pools |
| **Type** | New |
| **Decided by** | Joint (platform build) |
| **Decision** | Weekly packages can offer Flexi. Member selects slots at checkout. Selection locked after booking |
| **Rationale** | Flexibility without changing package price |
| **Shapes product** | Major differentiator for recurring memberships |

### 5.2 No swap available: proactive message

| | |
|---|---|
| **Feature** | When Flexi options equal fixed slots |
| **Type** | Enhancement |
| **Decided by** | You (9 Jul 2026, multiple iterations) |
| **Decision** | Do not wait for user to click Flexi. Show greyed Flexi button, keep Flexi row, tooltip still works. Show message immediately: **"Oops, sorry. This one's already dialed in (Mon-Wed 6:30 PM). No Flexi swaps available. Book Fixed Slots to continue."** |
| **Rejected** | Hiding Flexi row entirely |
| **Rationale** | Kind, on-brand copy. No dead-end click |
| **Shapes product** | Sets voice for error and edge states |

### 5.3 Flexi badge with info tooltip on schedules

| | |
|---|---|
| **Feature** | Flexi visibility on carousel and weekly schedule |
| **Type** | Enhancement |
| **Decided by** | You (9 Jul 2026) |
| **Decision** | Show Flexi badge with "i" tooltip on eligible sessions |
| **Rationale** | Educate before checkout |
| **Shapes product** | Discovery-led Flexi adoption |

### 5.4 andWeWorkout: session list before checkout

| | |
|---|---|
| **Feature** | Book from class type catalogue |
| **Type** | Enhancement |
| **Decided by** | You (9 Jul 2026) |
| **Decision** | Book on class type shows **list of scheduled sessions**. User picks one, then checkout |
| **Rationale** | Clear path from catalogue to specific session |
| **Shapes product** | Catalogue is discovery, not direct checkout |

### 5.5 Per-day times in upcoming session header

| | |
|---|---|
| **Feature** | Flexi booking display after purchase |
| **Type** | Enhancement |
| **Decided by** | You (9 Jul 2026) |
| **Decision** | If Flexi selection has different times per day, header shows per-day schedule, not a single flat time |
| **Rationale** | Accurate representation of what member bought |
| **Shapes product** | Trust in session history and dashboard |

### 5.6 Payment success screen: one fold

| | |
|---|---|
| **Feature** | Post payment confirmation layout |
| **Type** | Enhancement |
| **Decided by** | You (9 Jul 2026) |
| **Decision** | Dashboard, Account, Logout actions visible without scrolling |
| **Rationale** | Mobile UX. Clear next steps |
| **Shapes product** | Success moment is compact and actionable |

### 5.7 Flexi slot tap: select on first tap

| | |
|---|---|
| **Feature** | Slot selection interaction |
| **Type** | Enhancement |
| **Decided by** | You (9 Jul 2026) |
| **Decision** | First tap selects. Second tap deselects. Clearer loading spinner |
| **Rationale** | Obvious feedback during load |
| **Shapes product** | Standard toggle pattern for slot picker |

---

## 6. Safety, Health Messaging, and Studio Policy

### 6.1 Not Suitable (strictNoTo) contraindications

| | |
|---|---|
| **Feature** | Class type health warnings |
| **Type** | New |
| **Decided by** | Joint |
| **Decision** | Show collapsible Not Suitable tags on cards, reserve, checkout. Contact team button opens SMS to support |
| **Rationale** | Informed consent without medical advice in app |
| **Shapes product** | Support and instructors handle edge cases |

### 6.2 No em/en dashes in user-facing copy

| | |
|---|---|
| **Feature** | Typography style |
| **Type** | Enhancement (style rule) |
| **Decided by** | Team (Jul 2026) |
| **Decision** | Remove em dashes and en dashes from member-facing text |
| **Rationale** | Brand voice and readability preference |
| **Shapes product** | Ongoing copy rule for all new UI |

---

## 7. Member Experience and Information Architecture

### 7.1 Digital Zen home page redesign

| | |
|---|---|
| **Feature** | Public home visual redesign |
| **Type** | New |
| **Decided by** | You (Jun 2026) |
| **Decision** | Full home redesign with hero carousel, hub schedules, Digital Zen design language |
| **Rationale** | Modern brand presentation |
| **Shapes product** | Design system in `design prototypes/andWeYOGa_handoff/` drives UI |

### 7.2 Hub launcher and account redesign

| | |
|---|---|
| **Feature** | Signed-in navigation (Sessions, Calendar, Emojou, etc.) |
| **Type** | New |
| **Decided by** | You (Jun 2026) |
| **Decision** | Hub as signed-in home. Section launcher strip. Account drawer deep-links to My Account sections |
| **Rationale** | App-like navigation for members |
| **Shapes product** | Multi-page member app, not single scroll site |

### 7.3 My Account: single scroll page with section rail

| | |
|---|---|
| **Feature** | Account layout |
| **Type** | Enhancement (in progress) |
| **Decided by** | Joint |
| **Decision** | No page-level tabs. Anchor sections: profile, health, sessions, payments, privacy. Credits/preferences marked soon |
| **Rationale** | One URL, deep links from drawer |
| **Shapes product** | Stable anchor IDs are a contract for navigation |

### 7.4 Maintenance window overlay

| | |
|---|---|
| **Feature** | Studio pause for deploys |
| **Type** | New |
| **Decided by** | Team (Jul 2026) |
| **Decision** | Super admin toggle. Friendly copy (short savasana). Admin routes still work. Email/WhatsApp notify consented members |
| **Rationale** | Graceful downtime |
| **Shapes product** | Ops can ship during low traffic |

---

## 8. Admin and Operations

### 8.1 Admin auth from env bootstrap

| | |
|---|---|
| **Feature** | Admin login security |
| **Type** | Enhancement |
| **Decided by** | Joint (`ADMIN-BUILD-PLAN` slice 1) |
| **Decision** | `ADMIN_INITIAL_PASSWORD` syncs on boot. Remove admin123 backdoor and login page hints |
| **Rationale** | Production safety |
| **Shapes product** | Ops must set env vars |

### 8.2 Incremental DB patches (not push on prod)

| | |
|---|---|
| **Feature** | Database migrations |
| **Type** | Enhancement |
| **Decided by** | AI/Eng (adopted by product) |
| **Decision** | `npm run db:patch` for production. `db:push` for dev |
| **Rationale** | Avoid Drizzle PK errors on live DB |
| **Shapes product** | Every schema change ships as numbered SQL patch |

### 8.3 Admin test data tab (separate from production data)

| | |
|---|---|
| **Feature** | Test data management in admin |
| **Type** | Requested / not fully shipped |
| **Decided by** | You (9 Jul 2026) |
| **Decision** | Separate tab with sub-tabs (users, session types, etc.). Paginate. Bulk delete. All QA fixtures created there |
| **Rationale** | Test and prod data mixed is hard for ops |
| **Shapes product** | **Backlog.** Today test data uses naming prefixes (`Smoke QA`, `Agent QA`) only |

### 8.4 Session pause / resume / delete / cancel

| | |
|---|---|
| **Feature** | Admin session lifecycle |
| **Type** | Enhancement |
| **Decided by** | Team (Jul 2026) |
| **Decision** | Pause hides from public catalog. Resume syncs catalog. Super admin cancel/retire with placeholder notify |
| **Rationale** | Ops control without code changes |
| **Shapes product** | Member cancel notify still placeholder |

### 8.5 Placeholder OTP for super admin session delete

| | |
|---|---|
| **Feature** | Destructive admin action guard |
| **Type** | Partial (interim) |
| **Decided by** | AI/Eng |
| **Decision** | Use `000000` placeholder until live SMS owner verification |
| **Rationale** | Guard rail without SMS infra |
| **Shapes product** | Must replace before real security |

### 8.6 Replit removal, Railway as host

| | |
|---|---|
| **Feature** | Hosting platform |
| **Type** | Deprecation |
| **Decided by** | Joint |
| **Decision** | Remove Replit legacy. Railway for app and Postgres. GoDaddy DNS for andweyoga.com |
| **Rationale** | Production-grade deploy path |
| **Shapes product** | US interim hosting until India migration |

---

## 9. Explicitly On Hold or Not Built

| Feature | Type | Decision | Rationale |
|---------|------|----------|-----------|
| SMS OTP verification | On hold | Defer until SMS provider | Cost and complexity |
| Google Meet auto-redirect after class | On hold | Not in Meet API | Manual return or Workspace leave URL |
| Push notifications | On hold | Email/WhatsApp first | MVP scope |
| Waitlist auto-notify | Partial | Schema exists, flow incomplete | Ship booking first |
| Bulk Excel user upload | On hold | API returns 501 | Needs parser and invites |
| Instructor self-service portal | On hold | Admin-driven onboarding | Phase 2 |
| Member self-service cancellation | On hold | Admin cancel exists | v1.3 roadmap |
| Commerce / merchandise | On hold | Phase 3 | Out of MVP |
| Community feed | On hold | Phase 2 | Out of MVP |
| Native mobile app | On hold | Responsive web | Long term |
| India data hosting | Planned | Disclosed interim US | Legal commitment |
| Health document in-app upload | On hold | Email path for now | Infra and scale |
| Admin test data tab | On hold | Requested Jul 2026 | Not fully built |
| Credits and subscriptions | On hold | UI placeholder | Future phase |

---

## 10. Decisions Made by AI/Engineering (Without Explicit Product Request)

Approved by testing and shipping.

| Decision | Rationale | Product impact |
|----------|-----------|----------------|
| Server crashes if JWT_SECRET missing | Security | No accidental weak deploy |
| Rate limits on auth (10 per 15 min) | Brute force protection | Legitimate users rarely hit |
| CORS fail closed to ALLOWED_ORIGIN | Security | Each environment needs correct origin |
| Recompute profile status on every /api/auth/me | Fix legacy bad rows | Self-healing without migration |
| DATABASE_PUBLIC_URL preferred on Railway | Fix ENOTFOUND | Production stability |
| Clean-slate QA rule (Smoke QA fixtures deleted) | Data hygiene | Prod DB stays clean |
| Input length limits in shared constants | Prevent abuse | Consistent validation |
| JWT algorithm pinned to HS256 | Security hardening | Prevents algorithm confusion |
| Neutral response on forgot-password | Prevent email enumeration | Privacy |
| Session join event logging on Meet click | Attendance shadow data | Future analytics |
| Email verification token 24h expiry | Security | Forces timely verify |
| bcrypt 12 rounds for passwords | Industry standard | Secure credential storage |

---

## 11. Open Questions for Product Owner

1. Include pre-Cursor decisions (Sep to Oct 2025) in v1.1, or keep this log Apr 2026 onward only?
2. Confirm consent consolidation (10 Jul) is deployed to production or still on branch.
3. Mark Mudit commits as separate author, or fold into team decisions?
4. Marketing newsletter consent: live in Privacy section or still planned?
5. Add approved-by sign-off line and logo for external sharing?

---

## Document Maintenance

| When | Action |
|------|--------|
| New product decision in chat | Add entry with date and decided-by |
| Feature shipped from backlog | Move from Section 9 to relevant section |
| Feature deprecated | Mark type Deprecation with date |
| Policy change | Update rationale and shapes product |

**Export to PDF:** Open the HTML file in a browser. File, Print, Save as PDF.

---

*End of product decision log. Maintained by andWeYoga product and engineering.*
