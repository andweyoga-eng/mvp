# andWeYoga Security Audit Report
Date: April 2026
Status: FIXES APPLIED — Ready for production deployment

## Critical Issues Fixed

### Fix 1 — Hardcoded JWT Secret
File: server/auth.ts, server/adminAuth.ts
Before: JWT_SECRET fell back to hardcoded string if env var missing.
After: Server crashes at startup if JWT_SECRET is missing or under 32 chars.
Action required: Set JWT_SECRET in Railway environment variables.

### Fix 2 — JWT Token in URL
File: server/routes.ts
Before: OAuth callback redirected to /?token=JWT_TOKEN exposing tokens in logs and browser history.
After: Tokens set as httpOnly secure cookies. URLs are clean.

### Fix 3 — Unprotected Admin Endpoints
File: server/routes.ts
Before: GET /api/bookings, GET /api/contact-messages, POST /api/class-types, POST /api/instructors, POST /api/classes had no authentication.
After: All require admin authentication. Users can only see their own bookings.

### Fix 4 — No Rate Limiting
File: server/routes.ts
Before: Unlimited login attempts. Trivial brute force possible.
After: 10 auth attempts per 15 minutes per IP. 3 password reset attempts per hour.

### Fix 5 — Verification Tokens Never Expired
File: server/auth.ts
Before: Email verification tokens were permanent.
After: All tokens include a 24-hour expiry timestamp.

### Fix 6 — Email Enumeration on Forgot Password
File: server/routes.ts
Before: Returned "No account found" revealing registered emails.
After: Always returns the same neutral response.

## Security Hardening Added
- CORS restricted to ALLOWED_ORIGIN env var
- Security headers on all responses
- Request body capped at 1MB
- Error messages sanitised in production
- OAuth redirect URI uses env var not user-controlled header
- GET /api/auth/logout clears auth cookie properly

## Remaining Items Before Scale
- Migrate health documents from Replit storage to Google Cloud Storage
- Add database indexes on email, userId, classId, date columns
- Update frontend to use /api/auth/me instead of localStorage token reads
