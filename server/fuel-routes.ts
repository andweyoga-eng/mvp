import type { Express, Response } from "express";
import multer from "multer";
import { z } from "zod";
import {
  adminFuelConfigSchema,
  adminFuelDailyMediaSchema,
  adminFuelRecipeSchema,
  assertFuelConfigSafe,
  buildInstagramEmbedUrl,
  buildYoutubeEmbedUrl,
  caloriesLeftCopy,
  dayStatus,
  DEFAULT_FUEL_MEAL_PLAN,
  FUEL_ESTIMATE_ALLOWED_MIMES,
  FUEL_ESTIMATE_MAX_BYTES,
  FUEL_PEP_PHRASES,
  fuelLogMealSchema,
  formatSignedDelta,
  matchMealSlot,
  shouldShowDayVerdict,
  signedDelta,
  averageDailyTotalsVsTarget,
  type FuelMealPlan,
} from "@shared/fuel";
import { isAdult } from "@shared/consent";
import { storage } from "./storage";
import {
  estimateMealCalories,
  FuelEstimationError,
  getFuelEstimationModel,
  isFuelEstimationEnabled,
  isFuelEstimationFlagOn,
  sniffImageMime,
} from "./fuel-estimation";
import type { AuthRequest } from "./auth";
import { requireAuth } from "./auth";
import type { AdminAuthRequest } from "./adminAuth";
import { requireAdminAuth } from "./adminAuth";

const fuelPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: FUEL_ESTIMATE_MAX_BYTES, files: 1 },
});

function estimationMeta() {
  return { estimationAvailable: isFuelEstimationEnabled() };
}

function localTodayParts(timeZone?: string): { date: string; time: string } {
  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${hour}:${get("minute")}` };
}

function weekDateKeys(anchorDate: string): string[] {
  const [y, m, d] = anchorDate.split("-").map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d));
  const dow = anchor.getUTCDay(); // 0 Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(anchor);
  monday.setUTCDate(anchor.getUTCDate() + mondayOffset);
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + i);
    keys.push(day.toISOString().slice(0, 10));
  }
  return keys;
}

function lastNDateKeys(anchorDate: string, n: number): string[] {
  const [y, m, d] = anchorDate.split("-").map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d));
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = new Date(anchor);
    day.setUTCDate(anchor.getUTCDate() - i);
    keys.push(day.toISOString().slice(0, 10));
  }
  return keys;
}

async function fuelAccessGate(
  userId: string,
  res: Response,
): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof storage.getUser>>>;
  healthConsented: boolean;
} | null> {
  const user = await storage.getUser(userId);
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return null;
  }
  if (!user.dateOfBirth || !isAdult(user.dateOfBirth)) {
    res.status(403).json({
      code: "fuel_age_blocked",
      message: "andWeFuel is available to adult members only.",
    });
    return null;
  }
  const healthConsented = await storage.userHasActiveConsent(userId, "health_data");
  return { user, healthConsented };
}

function publicMeal(row: Awaited<ReturnType<typeof storage.listFuelMealsForUser>>[number]) {
  return {
    id: row.id,
    loggedDate: row.loggedDate,
    loggedAt: row.loggedAt,
    name: row.name,
    calories: row.calories,
    targetAtLogCal: row.targetAtLogCal,
    mealSlotIndex: row.mealSlotIndex,
    clientLocalTime: row.clientLocalTime,
  };
}

function publicDailyContent(
  recipe: Awaited<ReturnType<typeof storage.getFuelRecipeForDate>>,
  media: Awaited<ReturnType<typeof storage.getFuelDailyMediaForDate>>,
) {
  return {
    recipe: recipe
      ? {
          title: recipe.title,
          teaser: recipe.teaser,
          ingredients: recipe.ingredients,
          method: recipe.method,
          imageUrl: recipe.imageUrl,
          approxKcal: recipe.approxKcal,
        }
      : null,
    practiceAlong: media
      ? {
          provider: media.provider,
          title: media.title,
          embedUrl:
            media.provider === "youtube"
              ? buildYoutubeEmbedUrl(media.embedId)
              : buildInstagramEmbedUrl(media.embedId),
        }
      : null,
  };
}

export function registerFuelRoutes(app: Express) {
  app.get("/api/fuel/dashboard", requireAuth, async (req: AuthRequest, res) => {
    try {
      const gate = await fuelAccessGate(req.user!.id, res);
      if (!gate) return;
      const { user, healthConsented } = gate;

      const tz = typeof req.query.tz === "string" ? req.query.tz : undefined;
      const today =
        typeof req.query.localDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.localDate)
          ? req.query.localDate
          : localTodayParts(tz).date;

      const [recipe, media] = await Promise.all([
        storage.getFuelRecipeForDate(today),
        storage.getFuelDailyMediaForDate(today),
      ]);
      const daily = publicDailyContent(recipe, media);

      if (!healthConsented) {
        return res.json({
          gate: "health_consent_required",
          healthConsented: false,
          configured: false,
          today,
          ...estimationMeta(),
          ...daily,
        });
      }

      const target = user.dailyCalorieTargetCal;
      const deficit = user.dailyDeficitCal;
      const plan = (user.fuelMealPlan as FuelMealPlan | null) ?? null;
      const configured = target != null && deficit != null && Boolean(plan?.length);

      if (!configured) {
        return res.json({
          gate: "not_configured",
          healthConsented: true,
          configured: false,
          today,
          message: "Your coach has not set a target yet",
          ...estimationMeta(),
          ...daily,
        });
      }

      const fromDate = lastNDateKeys(today, 14)[0];
      const meals = await storage.listFuelMealsForUser(user.id, { fromDate, toDate: today });
      const todayMeals = meals.filter((m) => m.loggedDate === today);
      const dayTotal = todayMeals.reduce((s, m) => s + m.calories, 0);
      const loggedSlots = todayMeals.map((m) => m.mealSlotIndex);
      const verdictReady = shouldShowDayVerdict({
        plan: plan!,
        loggedSlotIndexes: loggedSlots,
      });
      const status = verdictReady ? dayStatus(dayTotal, target!, deficit!) : "pending";

      const chartDates = lastNDateKeys(today, 7);
      const weekBars = chartDates.map((date) => {
        const total = meals.filter((m) => m.loggedDate === date).reduce((s, m) => s + m.calories, 0);
        const slots = meals.filter((m) => m.loggedDate === date).map((m) => m.mealSlotIndex);
        const ready =
          date < today
            ? true
            : shouldShowDayVerdict({ plan: plan!, loggedSlotIndexes: slots });
        return {
          date,
          total,
          status: ready && total > 0 ? dayStatus(total, target!, deficit!) : ready ? dayStatus(0, target!, deficit!) : "pending",
          delta: ready ? signedDelta(total, target!) : null,
        };
      });

      res.json({
        gate: "ok",
        healthConsented: true,
        configured: true,
        today,
        target,
        deficit,
        mealPlan: plan,
        dayTotal,
        caloriesLeftLabel: caloriesLeftCopy(dayTotal, target!),
        verdictReady,
        status,
        statusDelta: verdictReady ? formatSignedDelta(signedDelta(dayTotal, target!)) : null,
        weekBars,
        meals: meals.map(publicMeal),
        ...daily,
        pepPhrases: FUEL_PEP_PHRASES,
        ...estimationMeta(),
      });
    } catch (error) {
      console.error("[fuel] dashboard error:", error);
      res.status(500).json({ message: "Failed to load andWeFuel" });
    }
  });

  app.get("/api/fuel/statement", requireAuth, async (req: AuthRequest, res) => {
    try {
      const gate = await fuelAccessGate(req.user!.id, res);
      if (!gate) return;
      const { user, healthConsented } = gate;
      if (!healthConsented) {
        return res.status(403).json({ code: "fuel_consent_required", message: "Health data consent required." });
      }
      const target = user.dailyCalorieTargetCal;
      const deficit = user.dailyDeficitCal;
      if (target == null || deficit == null) {
        return res.status(400).json({ code: "fuel_not_configured", message: "Fuel is not configured yet." });
      }

      const tz = typeof req.query.tz === "string" ? req.query.tz : undefined;
      const today =
        typeof req.query.localDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.localDate)
          ? req.query.localDate
          : localTodayParts(tz).date;
      const weekKeys = weekDateKeys(today);
      const meals = await storage.listFuelMealsForUser(user.id, {
        fromDate: weekKeys[0],
        limit: 200,
      });

      const plan = (user.fuelMealPlan as FuelMealPlan | null) ?? DEFAULT_FUEL_MEAL_PLAN;
      const byDate = new Map<string, number>();
      for (const m of meals) {
        byDate.set(m.loggedDate, (byDate.get(m.loggedDate) ?? 0) + m.calories);
      }
      const weekTotals = weekKeys.map((d) => byDate.get(d) ?? 0).filter((_, i) => {
        // include days that have meals or are <= today
        return weekKeys[i] <= today && (byDate.has(weekKeys[i]) || weekKeys[i] === today);
      });
      const daysWithMeals = weekKeys.filter((d) => (byDate.get(d) ?? 0) > 0 || meals.some((m) => m.loggedDate === d));
      const dailyTotalsForAvg = daysWithMeals.map((d) => byDate.get(d) ?? 0);
      const avgDelta = averageDailyTotalsVsTarget(dailyTotalsForAvg, target);

      const rows = meals.map((m) => {
        const dayTotal = byDate.get(m.loggedDate) ?? m.calories;
        const ready =
          m.loggedDate < today ||
          shouldShowDayVerdict({
            plan,
            loggedSlotIndexes: meals
              .filter((x) => x.loggedDate === m.loggedDate)
              .map((x) => x.mealSlotIndex),
          });
        return {
          ...publicMeal(m),
          dayTotal,
          dayStatus: ready ? dayStatus(dayTotal, m.targetAtLogCal || target, deficit) : "pending",
          dayDelta: ready ? formatSignedDelta(signedDelta(dayTotal, m.targetAtLogCal || target)) : null,
        };
      });

      res.json({
        today,
        target,
        deficit,
        mealsLoggedThisWeek: meals.filter((m) => weekKeys.includes(m.loggedDate)).length,
        avgDailyDelta: avgDelta,
        rows,
      });
    } catch (error) {
      console.error("[fuel] statement error:", error);
      res.status(500).json({ message: "Failed to load statement" });
    }
  });

  app.post("/api/fuel/meals", requireAuth, async (req: AuthRequest, res) => {
    try {
      const gate = await fuelAccessGate(req.user!.id, res);
      if (!gate) return;
      const { user, healthConsented } = gate;
      if (!healthConsented) {
        return res.status(403).json({ code: "fuel_consent_required", message: "Health data consent required." });
      }
      if (user.dailyCalorieTargetCal == null || user.dailyDeficitCal == null) {
        return res.status(400).json({ code: "fuel_not_configured", message: "Your coach has not set a target yet." });
      }
      const body = fuelLogMealSchema.parse(req.body);
      const plan = (user.fuelMealPlan as FuelMealPlan | null) ?? DEFAULT_FUEL_MEAL_PLAN;

      let slotIndex =
        body.mealSlotIndex === undefined ? undefined : body.mealSlotIndex;
      if (slotIndex === undefined) {
        const matched = matchMealSlot(plan, body.clientLocalTime);
        slotIndex = matched?.index ?? null;
      }

      const meal = await storage.createFuelMeal({
        userId: user.id,
        loggedDate: body.clientLocalDate,
        name: body.name,
        calories: body.calories,
        targetAtLogCal: user.dailyCalorieTargetCal,
        mealSlotIndex: slotIndex ?? null,
        clientLocalTime: body.clientLocalTime,
        clientTimeZone: body.clientTimeZone ?? null,
      });

      res.status(201).json(publicMeal(meal));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid meal", errors: error.flatten() });
      }
      console.error("[fuel] create meal error:", error);
      res.status(500).json({ message: "Failed to log meal" });
    }
  });

  app.delete("/api/fuel/meals/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const gate = await fuelAccessGate(req.user!.id, res);
      if (!gate) return;
      if (!gate.healthConsented) {
        return res.status(403).json({ code: "fuel_consent_required" });
      }
      const ok = await storage.deleteFuelMeal(req.params.id, req.user!.id);
      if (!ok) return res.status(404).json({ message: "Meal not found" });
      res.json({ ok: true });
    } catch (error) {
      console.error("[fuel] delete meal error:", error);
      res.status(500).json({ message: "Failed to delete meal" });
    }
  });

  app.post(
    "/api/fuel/estimate",
    requireAuth,
    (req, res, next) => {
      fuelPhotoUpload.single("photo")(req, res, (err) => {
        if (err) {
          if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
            return res.status(422).json({
              error: "unreadable",
              message: "Photo must be 4 MB or smaller.",
            });
          }
          return res.status(422).json({
            error: "unreadable",
            message: "Could not read this photo.",
          });
        }
        next();
      });
    },
    async (req: AuthRequest, res) => {
      try {
        const gate = await fuelAccessGate(req.user!.id, res);
        if (!gate) return;
        if (!gate.healthConsented) {
          return res.status(403).json({ code: "fuel_consent_required" });
        }

        if (!isFuelEstimationFlagOn() || !process.env.GEMINI_API_KEY?.trim()) {
          return res.status(501).json({
            error: "disabled",
            message: "Photo estimation is disabled.",
          });
        }

        const file = req.file;
        if (!file?.buffer?.length) {
          return res.status(422).json({
            error: "unreadable",
            message: "Could not read this photo.",
          });
        }

        const declaredMime = file.mimetype?.toLowerCase();
        if (
          !declaredMime ||
          !FUEL_ESTIMATE_ALLOWED_MIMES.includes(
            declaredMime as (typeof FUEL_ESTIMATE_ALLOWED_MIMES)[number],
          )
        ) {
          return res.status(422).json({
            error: "unreadable",
            message: "Use a JPG, PNG, or WebP photo.",
          });
        }

        const sniffed = sniffImageMime(file.buffer);
        if (!sniffed || sniffed !== declaredMime) {
          return res.status(422).json({
            error: "unreadable",
            message: "Could not read this photo.",
          });
        }

        const result = await estimateMealCalories({
          buffer: file.buffer,
          mimeType: sniffed,
        });

        res.json({
          name: result.name,
          calories: result.calories,
          confidence: result.confidence,
          items: result.items,
          model: result.model,
          latency_ms: result.latencyMs,
          reviewState: result.reviewState,
          advisory: true as const,
        });
      } catch (error) {
        if (error instanceof FuelEstimationError) {
          return res.status(error.status).json({
            error: error.code,
            message: error.message,
            ...(error.retryAfter != null ? { retry_after: error.retryAfter } : {}),
          });
        }
        console.error("[fuel] estimate error:", error);
        return res.status(503).json({
          error: "provider_down",
          message: "Photo estimation is temporarily unavailable.",
        });
      }
    },
  );

  // ——— Admin ———
  app.put("/api/admin/users/:id/fuel", requireAdminAuth, async (req: AdminAuthRequest, res) => {
    try {
      const body = adminFuelConfigSchema.parse(req.body);
      if (body.clearConfig) {
        const user = await storage.setUserFuelConfig(req.params.id, {
          dailyCalorieTargetCal: null,
          dailyDeficitCal: null,
          fuelMealPlan: null,
          calorieTargetSetBy: req.admin!.id,
          calorieTargetSetAt: new Date(),
          fuelFloorOverrideReason: null,
        });
        if (!user) return res.status(404).json({ message: "User not found" });
        return res.json({ ok: true, userId: user.id, configured: false });
      }

      const safe = assertFuelConfigSafe(
        body.dailyCalorieTargetCal!,
        body.dailyDeficitCal!,
        body.overrideReason,
      );
      if (!safe.ok) return res.status(400).json({ message: safe.message, code: "fuel_floor_override_required" });

      const user = await storage.setUserFuelConfig(req.params.id, {
        dailyCalorieTargetCal: body.dailyCalorieTargetCal!,
        dailyDeficitCal: body.dailyDeficitCal!,
        fuelMealPlan: body.fuelMealPlan ?? DEFAULT_FUEL_MEAL_PLAN,
        calorieTargetSetBy: req.admin!.id,
        calorieTargetSetAt: new Date(),
        fuelFloorOverrideReason: body.overrideReason?.trim() || null,
      });
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({
        ok: true,
        configured: true,
        dailyCalorieTargetCal: user.dailyCalorieTargetCal,
        dailyDeficitCal: user.dailyDeficitCal,
        fuelMealPlan: user.fuelMealPlan,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid fuel config", errors: error.flatten() });
      }
      console.error("[fuel] admin config error:", error);
      res.status(500).json({ message: "Failed to save fuel config" });
    }
  });

  app.get("/api/admin/users/:id/fuel", requireAdminAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({
        dailyCalorieTargetCal: user.dailyCalorieTargetCal,
        dailyDeficitCal: user.dailyDeficitCal,
        fuelMealPlan: user.fuelMealPlan ?? DEFAULT_FUEL_MEAL_PLAN,
        calorieTargetSetBy: user.calorieTargetSetBy,
        calorieTargetSetAt: user.calorieTargetSetAt,
        fuelFloorOverrideReason: user.fuelFloorOverrideReason,
        defaultMealPlan: DEFAULT_FUEL_MEAL_PLAN,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to load fuel config" });
    }
  });

  app.put("/api/admin/fuel/recipe", requireAdminAuth, async (req: AdminAuthRequest, res) => {
    try {
      const body = adminFuelRecipeSchema.parse(req.body);
      const row = await storage.upsertFuelRecipe({
        forDate: body.forDate,
        title: body.title,
        teaser: body.teaser,
        ingredients: body.ingredients,
        method: body.method,
        imageUrl: body.imageUrl ?? null,
        approxKcal: body.approxKcal ?? null,
        createdBy: req.admin!.id,
      });
      res.json(row);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const first = error.issues[0];
        const detail = first
          ? `${first.path.join(".") || "form"}: ${first.message}`
          : "Invalid recipe";
        return res.status(400).json({
          message: detail,
          errors: error.issues,
        });
      }
      console.error("[fuel] save recipe error:", error);
      res.status(500).json({ message: "Failed to save recipe" });
    }
  });

  app.put("/api/admin/fuel/media", requireAdminAuth, async (req: AdminAuthRequest, res) => {
    try {
      const body = adminFuelDailyMediaSchema.parse(req.body);
      const row = await storage.upsertFuelDailyMedia({
        ...body,
        createdBy: req.admin!.id,
      });
      res.json(row);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const first = error.issues[0];
        const detail = first
          ? `${first.path.join(".") || "form"}: ${first.message}`
          : "Invalid media";
        return res.status(400).json({
          message: detail,
          errors: error.issues,
        });
      }
      console.error("[fuel] save media error:", error);
      res.status(500).json({ message: "Failed to save media" });
    }
  });

  app.get("/api/admin/fuel/estimation-status", requireAdminAuth, (_req, res) => {
    const flagOn = isFuelEstimationFlagOn();
    const keyPresent = Boolean(process.env.GEMINI_API_KEY?.trim());
    const active = isFuelEstimationEnabled();
    const model = getFuelEstimationModel();
    res.json({
      estimationEnabled: flagOn,
      geminiKeyPresent: keyPresent,
      active,
      model,
      statusLabel: active
        ? `Live · ${model}`
        : flagOn
          ? "Enabled, key missing"
          : "Disabled, manual only",
    });
  });

  app.get("/api/admin/fuel/content", requireAdminAuth, async (req, res) => {
    try {
      const forDate =
        typeof req.query.forDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.forDate)
          ? req.query.forDate
          : localTodayParts().date;
      const [recipe, media] = await Promise.all([
        storage.getFuelRecipeForDate(forDate),
        storage.getFuelDailyMediaForDate(forDate),
      ]);
      res.json({ forDate, recipe, media });
    } catch {
      res.status(500).json({ message: "Failed to load fuel content" });
    }
  });
}
