import type { Express, Request, Response, RequestHandler } from "express";
import { z } from "zod";
import { storage } from "./storage";
import {
  accountConsentCompletionSchema,
  accountErasureSchema,
  buildConsentRequirement,
  guestBookingConsentSchema,
  healthDataConsentSchema,
  onboardingConsentSchema,
} from "@shared/consent";
import {
  buildConsentCategoryStatuses,
  consentVersion,
  ERASURE_GRACE_DAYS,
  requestMeta,
  validateOnboardingDateOfBirth,
  LEGAL_CONFIG,
  formatRegisteredOffice,
} from "./consent";
import {
  PENDING_CONSENT_COOKIE_NAME,
  buildPendingConsentCookieOptions,
  parsePendingConsentCookie,
} from "./auth-cookie";
import { requireAuth } from "./auth";
import { requireAdminAuth } from "./adminAuth";

export async function applyPendingConsentForNewUser(
  req: Request,
  res: Response,
  userId: string,
): Promise<boolean> {
  const pending = parsePendingConsentCookie(req.cookies?.[PENDING_CONSENT_COOKIE_NAME]);
  if (!pending) {
    return false;
  }
  const ageCheck = validateOnboardingDateOfBirth(pending.dateOfBirth);
  if (!ageCheck.ok) {
    res.clearCookie(PENDING_CONSENT_COOKIE_NAME);
    return false;
  }
  const meta = requestMeta(req);
  await storage.recordRegistrationConsents({
    userId,
    dateOfBirth: pending.dateOfBirth,
    consentVersion: pending.consentVersion,
    ...meta,
  });
  res.clearCookie(PENDING_CONSENT_COOKIE_NAME);
  return true;
}

export function registerConsentRoutes(app: Express): void {
  app.get("/api/legal/config", (_req, res) => {
    res.json({
      ...LEGAL_CONFIG,
      registeredOfficeFormatted: formatRegisteredOffice(),
    });
  });

  app.post("/api/auth/onboarding-consent", async (req, res) => {
    try {
      const body = onboardingConsentSchema.parse(req.body);
      const ageCheck = validateOnboardingDateOfBirth(body.dateOfBirth);
      if (!ageCheck.ok) {
        if (ageCheck.code === "underage") {
          return res.status(403).json({
            code: "underage",
            message: "You must be 18 or older to create an account.",
            grievanceEmail: LEGAL_CONFIG.grievanceOfficer.email,
          });
        }
        return res.status(400).json({ code: "invalid_date", message: "Invalid date of birth." });
      }

      const payload = JSON.stringify({
        dateOfBirth: body.dateOfBirth,
        consentVersion: body.consentVersion ?? consentVersion(),
      });
      res.cookie(PENDING_CONSENT_COOKIE_NAME, payload, buildPendingConsentCookieOptions());
      res.json({ ok: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid consent payload", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to record consent" });
    }
  });

  app.get("/api/users/me/consent", requireAuth as RequestHandler, async (req: any, res) => {
    try {
      const rows = await storage.getConsentLogsForUser(req.user!.id);
      const categories = buildConsentCategoryStatuses(
        rows.map((r) => ({
          consentType: r.consentType,
          action: r.action,
          timestampUtc: r.timestampUtc,
          consentVersion: r.consentVersion,
        })),
      );
      const pendingErasure = await storage.getPendingErasureForUser(req.user!.id);
      const user = await storage.getUser(req.user!.id);
      const requirement = buildConsentRequirement(
        categories,
        consentVersion(),
        Boolean(user?.dateOfBirth),
      );
      res.json({
        categories,
        consentVersion: consentVersion(),
        hasDateOfBirth: Boolean(user?.dateOfBirth),
        requirement,
        pendingErasure: pendingErasure
          ? {
              id: pendingErasure.id,
              scheduledErasureAt: pendingErasure.scheduledErasureAt.toISOString(),
            }
          : null,
      });
    } catch {
      res.status(500).json({ message: "Failed to fetch consent status" });
    }
  });

  app.post("/api/users/me/consent/complete", requireAuth as RequestHandler, async (req: any, res) => {
    try {
      const body = accountConsentCompletionSchema.parse(req.body);
      const rows = await storage.getConsentLogsForUser(req.user!.id);
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const categories = buildConsentCategoryStatuses(
        rows.map((r) => ({
          consentType: r.consentType,
          action: r.action,
          timestampUtc: r.timestampUtc,
          consentVersion: r.consentVersion,
        })),
      );
      const requirement = buildConsentRequirement(
        categories,
        consentVersion(),
        Boolean(user.dateOfBirth),
      );

      if (!requirement.requiresConsent) {
        return res.json({ ok: true });
      }

      const meta = requestMeta(req);

      if (requirement.requireDateOfBirth) {
        if (!body.dateOfBirth) {
          return res.status(400).json({ code: "invalid_date", message: "Date of birth is required." });
        }
        const ageCheck = validateOnboardingDateOfBirth(body.dateOfBirth);
        if (!ageCheck.ok) {
          return res.status(ageCheck.code === "underage" ? 403 : 400).json({
            code: ageCheck.code,
            grievanceEmail: LEGAL_CONFIG.grievanceOfficer.email,
          });
        }
      }

      if (requirement.flow === "first_time") {
        if (!body.consentProfile || !body.consentTerms || !body.consentAge || !body.dateOfBirth) {
          return res.status(400).json({ message: "All onboarding consent items are required." });
        }
        await storage.recordRegistrationConsents({
          userId: req.user!.id,
          dateOfBirth: body.dateOfBirth,
          consentVersion: body.consentVersion ?? consentVersion(),
          ...meta,
        });
        return res.json({ ok: true });
      }

      if (body.dateOfBirth) {
        const ageCheck = validateOnboardingDateOfBirth(body.dateOfBirth);
        if (!ageCheck.ok) {
          return res.status(ageCheck.code === "underage" ? 403 : 400).json({
            code: ageCheck.code,
            grievanceEmail: LEGAL_CONFIG.grievanceOfficer.email,
          });
        }
        await storage.updateUser(req.user!.id, { dateOfBirth: body.dateOfBirth } as never);
      }

      const acknowledged = new Set<string>();
      if (body.consentProfile) acknowledged.add("profile_booking");
      if (body.consentTerms) acknowledged.add("terms");
      if (body.consentAge) acknowledged.add("age_declaration");
      const missingRequired = requirement.requiredTypes.filter((type) => !acknowledged.has(type));
      if (missingRequired.length > 0) {
        return res.status(400).json({ message: "All required updated consent items must be accepted." });
      }

      for (const consentType of requirement.requiredTypes) {
        await storage.insertConsentLog({
          userId: req.user!.id,
          consentType,
          action: "opt_in",
          consentVersion: body.consentVersion ?? consentVersion(),
          ...meta,
        });
      }
      res.json({ ok: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid consent payload", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to complete consent" });
    }
  });

  app.post(
    "/api/users/me/consent/health-data/withdraw",
    requireAuth as RequestHandler,
    async (req: any, res) => {
      try {
        const meta = requestMeta(req);
        const updated = await storage.withdrawHealthDataConsent({
          userId: req.user!.id,
          consentVersion: consentVersion(),
          ...meta,
        });
        if (!updated) {
          return res.status(404).json({ message: "User not found" });
        }
        res.json({ message: "Health data consent withdrawn and health data deleted." });
      } catch {
        res.status(500).json({ message: "Failed to withdraw health data consent" });
      }
    },
  );

  app.post("/api/users/me/erase", requireAuth as RequestHandler, async (req: any, res) => {
    try {
      accountErasureSchema.parse(req.body);
      const meta = requestMeta(req);
      const result = await storage.requestAccountErasure({
        userId: req.user!.id,
        ...meta,
      });
      res.clearCookie("authToken");
      res.json({
        message: "Erasure requested. Your bookings have been cancelled.",
        erasureRequestId: result.erasureRequestId,
        scheduledErasureAt: result.scheduledErasureAt.toISOString(),
        timelineDays: ERASURE_GRACE_DAYS,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Confirmation required", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to request erasure" });
    }
  });

  app.get("/api/admin/consent-logs", requireAdminAuth as RequestHandler, async (_req, res) => {
    try {
      const logs = await storage.getAdminConsentLogs(500);
      res.json(logs);
    } catch {
      res.status(500).json({ message: "Failed to fetch consent logs" });
    }
  });
}

export function parseGuestBookingConsent(body: unknown) {
  return guestBookingConsentSchema.parse(body);
}

export function parseHealthDataConsent(body: unknown) {
  return healthDataConsentSchema.parse(body);
}
